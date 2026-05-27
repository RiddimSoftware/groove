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
 *                    Same key used by the Linear MCP server. Must be exported
 *                    in your shell profile before launching Claude or Codex so
 *                    this hook inherits it.
 *
 * Optional:
 *   GROOVE_STATE_DIR        Override state directory (default: ~/.groove)
 *   GROOVE_DISABLED         Set to "1" to disable without uninstalling
 *   GROOVE_CONTEXT_TURNS    Number of preceding user turns to include (default: 1)
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
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
// Done-set helpers (track which issues have already received a comment)
// ---------------------------------------------------------------------------

/**
 * Load the set of Linear IDs that have already been commented for a session.
 * Returns an empty Set if the done file doesn't exist or can't be parsed.
 */
function loadDoneSet(doneFile) {
  if (!existsSync(doneFile)) return new Set();
  try {
    const ids = JSON.parse(readFileSync(doneFile, 'utf8'));
    return new Set(Array.isArray(ids) ? ids : []);
  } catch {
    return new Set();
  }
}

/**
 * Persist the set of Linear IDs that have been commented for a session.
 * Safe to call multiple times — always overwrites with the latest state.
 */
function saveDoneSet(doneFile, doneSet) {
  try {
    mkdirSync(dirname(doneFile), { recursive: true });
    writeFileSync(doneFile, JSON.stringify([...doneSet], null, 2) + '\n', 'utf8');
  } catch {
    // best-effort
  }
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
    process.stderr.write(
      '[groove/stop] LINEAR_API_KEY not set — skipping provenance comments\n' +
      '[groove/stop] Set it in your shell profile and run: npx linear-agent-hooks backfill\n'
    );
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

  // Load the done set so we skip issues that were already commented
  // (handles re-runs and partial failures gracefully).
  const doneFile = join(stateDir, 'provenance', `${session_id}.done`);
  const doneSet = loadDoneSet(doneFile);

  // Post a comment to each Linear issue not yet in the done set.
  // Projects and initiatives don't support comments the same way — skip for now.
  const issues = items.filter(item => item.kind === 'issue' && !doneSet.has(item.linearId));

  for (const item of issues) {
    try {
      await postLinearComment(item.linearId, body, apiKey);
      doneSet.add(item.linearId);
    } catch (err) {
      process.stderr.write(
        `[groove/stop] failed to post comment to ${item.linearId}: ${err.message}\n`
      );
      // Continue — don't let one failure block the rest
    }
  }

  // Persist the done set so backfill won't re-post what already succeeded.
  saveDoneSet(doneFile, doneSet);

  process.exit(0);
}

main();
