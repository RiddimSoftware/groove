#!/usr/bin/env node
/**
 * PostToolUse hook — record Linear item creations to per-session JSONL.
 *
 * Filters on MCP Linear creation tools:
 *   mcp__<any-namespace>__save_issue
 *   mcp__<any-namespace>__save_project
 *   mcp__<any-namespace>__save_initiative
 *
 * The namespace prefix includes a UUID injected by the MCP runtime
 * (observed: mcp__852c51d3-c3ae-4813-8f86-6e0893d9ef71__save_issue),
 * so the regex must match any prefix segment.
 *
 * Output: ${AGENT_STATE_DIR:-/YOUR/WORKSPACE/DIR/.agent-state}/factory/provenance/<session-id>.items.jsonl
 */

import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const TOOL_REGEX = /^mcp__[^_].*__save_(issue|project|initiative)$/;

const KIND_MAP = {
  save_issue: 'issue',
  save_project: 'project',
  save_initiative: 'initiative',
};

// Linear identifiers vary by entity type:
//   Issue / Initiative: TEAM-NNN (e.g. EPAC-101, LAB-53) — human-readable, stable.
//   Project:            UUID v4 — projects have no human-readable identifier.
// For issues/initiatives we validate against the TEAM-NNN regex (rejecting UUIDs that
// some MCP shapes put in `id`). For projects we accept the UUID as the canonical key
// since that's the only stable identifier Linear exposes for a project.
const LINEAR_IDENTIFIER_RE = /^[A-Z][A-Z0-9_]*-\d+$/;
const URL_IDENTIFIER_RE = /\/([A-Z][A-Z0-9_]*-\d+)(?:\/|$)/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fromIssueShape(obj) {
  if (!obj) return null;
  // Different Linear MCP servers expose the human-readable identifier under different
  // keys: official Linear MCP uses `identifier`; `claude_ai_Linear` uses `id`.
  const ident = obj.identifier ?? obj.id;
  if (typeof ident === 'string' && LINEAR_IDENTIFIER_RE.test(ident)) {
    return { identifier: ident, url: obj.url };
  }
  // Fallback: parse identifier out of the issue URL (works for both servers).
  if (typeof obj.url === 'string') {
    const m = obj.url.match(URL_IDENTIFIER_RE);
    if (m) return { identifier: m[1], url: obj.url };
  }
  return null;
}

function fromProjectShape(obj) {
  if (!obj) return null;
  // Projects are keyed by UUID. Linear's response uses `id` for the UUID.
  // Refuse to fabricate a project identifier from non-UUID values — the
  // factory provenance attach CLI (FAC-40) requires the canonical UUID
  // to call attachmentCreate(projectId: ...).
  if (typeof obj.id === 'string' && UUID_RE.test(obj.id)) {
    return { identifier: obj.id, url: obj.url };
  }
  return null;
}

function extractTarget(toolResponse, kind) {
  if (!toolResponse) return null;
  const extractor = kind === 'project' ? fromProjectShape : fromIssueShape;

  // MCP content blocks reach the hook in one of two shapes:
  //   - bare content array:   [{ type: 'text', text: '<json>' }, ...]
  //     This is what Claude Code 2.1.143 actually passes as `tool_response`
  //     (verified against real session JSONLs' `toolUseResult` field).
  //   - wrapped object:       { content: [{ type: 'text', text: '<json>' }, ...] }
  //     This is what the v1 test fixtures in this repo emit; preserve support
  //     so the existing tests keep their coverage of the wrapped path.
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
    process.stderr.write(`[post-tool-use-record-linear-creations] failed to parse stdin: ${err.message}\n`);
    process.exit(0);
  }

  const { session_id, tool_name } = payload;

  // Claude Code's PostToolUse stdin payload has used three different field names
  // for the tool result across versions/surfaces:
  //   - `tool_response` — the name our v1 test fixtures emit; only documented in
  //     this repo's history, not in any public Claude Code spec.
  //   - `tool_result`   — claude.com hooks docs (https://code.claude.com/docs/en/hooks.md).
  //   - `response`      — Claude Code in-app hook permission UI in 2.1.143.
  // Accept all three so the hook is robust to future renames and to surface
  // mismatches loudly via the stderr-with-keys path below.
  const toolResponse = payload.tool_response ?? payload.tool_result ?? payload.response;

  if (!TOOL_REGEX.test(tool_name)) {
    process.exit(0);
  }

  if (process.env.FACTORY_PROVENANCE_DISABLED === '1') {
    process.exit(0);
  }

  const kind = kindFromToolName(tool_name);
  const extracted = extractTarget(toolResponse, kind);
  if (!extracted) {
    // Include the top-level payload keys in stderr so future Claude Code field
    // renames are visible without needing to install a debug hook.
    const keys = Object.keys(payload).join(',');
    process.stderr.write(
      `[post-tool-use-record-linear-creations] could not extract identifier from ${tool_name} response (payload keys: ${keys})\n`
    );
    process.exit(0);
  }

  const stateDir = process.env.AGENT_STATE_DIR ?? '/YOUR/WORKSPACE/DIR/.agent-state';
  const provenanceDir = `${stateDir}/factory/provenance`;
  const itemsFile = `${provenanceDir}/${session_id}.items.jsonl`;

  try {
    mkdirSync(provenanceDir, { recursive: true });
  } catch (err) {
    process.stderr.write(`[post-tool-use-record-linear-creations] failed to create dir: ${err.message}\n`);
    process.exit(0);
  }

  const record = JSON.stringify({
    linearId: extracted.identifier,
    kind,
    toolName: tool_name,
    createdAt: new Date().toISOString(),
  });

  try {
    // appendFileSync with 'a' flag is atomic for small writes on POSIX
    appendFileSync(itemsFile, record + '\n', { flag: 'a', encoding: 'utf8' });
  } catch (err) {
    process.stderr.write(`[post-tool-use-record-linear-creations] failed to append to ${itemsFile}: ${err.message}\n`);
  }

  process.exit(0);
}

main();
