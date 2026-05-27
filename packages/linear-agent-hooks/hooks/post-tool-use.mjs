#!/usr/bin/env node
/**
 * PostToolUse hook — record Linear item creations to a per-session JSONL file.
 *
 * Fires after any MCP Linear creation call:
 *   mcp__<any-namespace>__save_issue
 *   mcp__<any-namespace>__save_project
 *   mcp__<any-namespace>__save_initiative
 *
 * The namespace prefix includes a UUID injected by the MCP runtime, so the
 * regex matches any prefix segment.
 *
 * Output: ${GROOVE_STATE_DIR:-~/.groove}/provenance/<session-id>.items.jsonl
 *
 * Environment variables:
 *   GROOVE_STATE_DIR   Override state directory (default: ~/.groove)
 *   GROOVE_DISABLED    Set to "1" to disable without uninstalling
 */

import { appendFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const TOOL_REGEX = /^mcp__[^_].*__save_(issue|project|initiative)$/;

const KIND_MAP = {
  save_issue: 'issue',
  save_project: 'project',
  save_initiative: 'initiative',
};

// Issue / Initiative identifiers: TEAM-NNN (e.g. ENG-101)
// Project identifiers: UUID v4 (projects have no human-readable id in Linear)
const LINEAR_IDENTIFIER_RE = /^[A-Z][A-Z0-9_]*-\d+$/;
const URL_IDENTIFIER_RE = /\/([A-Z][A-Z0-9_]*-\d+)(?:\/|$)/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fromIssueShape(obj) {
  if (!obj) return null;
  // Different Linear MCP servers expose the identifier under different keys:
  // official Linear MCP uses `identifier`; some others use `id`.
  const ident = obj.identifier ?? obj.id;
  if (typeof ident === 'string' && LINEAR_IDENTIFIER_RE.test(ident)) {
    return { identifier: ident, url: obj.url };
  }
  // Fallback: parse identifier out of the issue URL.
  if (typeof obj.url === 'string') {
    const m = obj.url.match(URL_IDENTIFIER_RE);
    if (m) return { identifier: m[1], url: obj.url };
  }
  return null;
}

function fromProjectShape(obj) {
  if (!obj) return null;
  if (typeof obj.id === 'string' && UUID_RE.test(obj.id)) {
    return { identifier: obj.id, url: obj.url };
  }
  return null;
}

function extractTarget(toolResponse, kind) {
  if (!toolResponse) return null;
  const extractor = kind === 'project' ? fromProjectShape : fromIssueShape;

  // Claude Code passes the tool result as either a bare content array or a
  // wrapped { content: [...] } object depending on the version/surface.
  const blocks = Array.isArray(toolResponse)
    ? toolResponse
    : Array.isArray(toolResponse.content)
      ? toolResponse.content
      : null;

  if (blocks) {
    for (const block of blocks) {
      if (block.type === 'text' && block.text) {
        try {
          const found = extractor(JSON.parse(block.text));
          if (found) return found;
        } catch {
          // not JSON — skip
        }
      }
    }
  }

  // Direct object (some MCP adapters return unwrapped)
  return extractor(toolResponse);
}

function kindFromToolName(toolName) {
  const suffix = toolName.replace(/^mcp__[^_].*__/, '');
  return KIND_MAP[suffix] ?? 'unknown';
}

async function main() {
  let payload;
  try {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (err) {
    process.stderr.write(`[groove/post-tool-use] failed to parse stdin: ${err.message}\n`);
    process.exit(0);
  }

  if (process.env.GROOVE_DISABLED === '1') process.exit(0);

  const { session_id, tool_name } = payload;

  if (!TOOL_REGEX.test(tool_name)) process.exit(0);

  // Accept all field name variants Claude Code has used across versions.
  const toolResponse = payload.tool_response ?? payload.tool_result ?? payload.response;

  const kind = kindFromToolName(tool_name);
  const extracted = extractTarget(toolResponse, kind);

  if (!extracted) {
    const keys = Object.keys(payload).join(', ');
    process.stderr.write(
      `[groove/post-tool-use] could not extract identifier from ${tool_name} response (payload keys: ${keys})\n`
    );
    process.exit(0);
  }

  const stateDir = process.env.GROOVE_STATE_DIR ?? join(homedir(), '.groove');
  const provenanceDir = join(stateDir, 'provenance');
  const itemsFile = join(provenanceDir, `${session_id}.items.jsonl`);

  try {
    mkdirSync(provenanceDir, { recursive: true });
  } catch (err) {
    process.stderr.write(`[groove/post-tool-use] failed to create dir: ${err.message}\n`);
    process.exit(0);
  }

  const record = JSON.stringify({
    linearId: extracted.identifier,
    kind,
    toolName: tool_name,
    createdAt: new Date().toISOString(),
  });

  try {
    appendFileSync(itemsFile, record + '\n', { flag: 'a', encoding: 'utf8' });
  } catch (err) {
    process.stderr.write(`[groove/post-tool-use] failed to write to ${itemsFile}: ${err.message}\n`);
  }

  process.exit(0);
}

main();
