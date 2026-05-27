#!/usr/bin/env node
/**
 * Stop hook — post a provenance comment to every Linear issue created this session.
 *
 * Fires when a Claude Code or Codex session ends. Reads the items file written
 * by post-tool-use.mjs and posts a comment to each Linear issue containing:
 *   - The agent source (claude / codex)
 *   - The session ID
 *   - The timestamp
 *   - The last user message(s) preceding the create call, if the transcript
 *     can be found (best-effort)
 *
 * Always exits 0 — never blocks session termination.
 *
 * Required:
 *   LINEAR_API_KEY   Your Linear API key (lin_api_...)
 *
 * Optional:
 *   GROOVE_STATE_DIR        Override state directory (default: ~/.groove)
 *   GROOVE_DISABLED         Set to "1" to disable without uninstalling
 *   GROOVE_CONTEXT_TURNS    Number of preceding user turns to include (default: 1)
 */

import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { buildCommentBody } from '../lib/comment.mjs';
import { findTranscript, extractPrecedingContext } from '../lib/transcript.mjs';

// ---------------------------------------------------------------------------
// Linear API
// ---------------------------------------------------------------------------

async function postLinearComment(issueId, body, apiKey) {
  const mutation = `
    mutation CreateComment($issueId: String!, $body: String!) {
      commentCreate(input: { issueId: $issueId, body: $body }) {
        success
      }
    }
  `;

  const res = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
    },
    body: JSON.stringify({ query: mutation, variables: { issueId, body } }),
  });

  if (!res.ok) {
    throw new Error(`Linear API ${res.status}: ${await res.text()}`);
  }

  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors.map(e => e.message).join('; '));
  }
  return json.data?.commentCreate?.success ?? false;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (process.env.GROOVE_DISABLED === '1') process.exit(0);

  let payload;
  try {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (err) {
    process.stderr.write(`[groove/stop] failed to parse stdin: ${err.message}\n`);
    process.exit(0);
  }

  const { session_id } = payload;
  if (!session_id) {
    process.stderr.write('[groove/stop] session_id missing from payload\n');
    process.exit(0);
  }

  // Check for items before warning about missing key — no need to surface
  // configuration warnings when there's nothing to post.
  const stateDir = process.env.GROOVE_STATE_DIR ?? join(homedir(), '.groove');
  const itemsFile = join(stateDir, 'provenance', `${session_id}.items.jsonl`);

  if (!existsSync(itemsFile)) process.exit(0);

  const contents = readFileSync(itemsFile, 'utf8').trim();
  if (!contents) process.exit(0);

  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) {
    process.stderr.write('[groove/stop] LINEAR_API_KEY not set — skipping provenance comments\n');
    process.exit(0);
  }

  const items = contents.split('\n').filter(Boolean).map(line => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);

  if (items.length === 0) process.exit(0);

  // Detect agent source
  let source = 'agent';
  if (process.env.CLAUDE_CODE_ENTRYPOINT) source = 'claude';
  else if (process.env.CODEX_SESSION) source = 'codex';

  // Build comment body (shared across all items in this session)
  const contextTurns = parseInt(process.env.GROOVE_CONTEXT_TURNS ?? '1', 10);
  const transcriptPath = findTranscript(session_id);
  const contextMessages = extractPrecedingContext(transcriptPath, contextTurns);
  const body = buildCommentBody(session_id, source, contextMessages);

  // Post a comment to each Linear issue created this session.
  // Projects and initiatives don't support comments the same way — skip for now.
  const issues = items.filter(item => item.kind === 'issue');

  for (const item of issues) {
    try {
      await postLinearComment(item.linearId, body, apiKey);
    } catch (err) {
      process.stderr.write(
        `[groove/stop] failed to post comment to ${item.linearId}: ${err.message}\n`
      );
      // Continue — don't let one failure block the rest
    }
  }

  process.exit(0);
}

main();
