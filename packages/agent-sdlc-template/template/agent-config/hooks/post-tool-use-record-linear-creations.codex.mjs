#!/usr/bin/env node
/**
 * Codex PostToolUse hook — record Linear item creations to per-session JSONL.
 *
 * Filters on MCP Linear creation tools:
 *   mcp__linear__save_issue
 *   mcp__linear__save_project
 *   mcp__linear__save_initiative
 *   mcp__codex_apps__linear_* (Apps layer — only matches create-like patterns)
 *
 * The Codex tool-name format is stable: mcp__<server>__<tool>.
 * For the Apps layer, we match only the known Linear creation methods.
 *
 * Output: ${AGENT_STATE_DIR:-/YOUR/WORKSPACE/DIR/.agent-state}/factory/provenance/<session-id>.items.jsonl
 */

import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// Match both raw MCP (mcp__linear__*) and Apps layer (mcp__codex_apps__*)
// capturing save_issue, save_project, and save_initiative calls that produce a Linear ID.
const TOOL_REGEX = /^mcp__(?:linear|codex_apps)__save_(issue|project|initiative)$/;

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

  // Codex PostToolUse consistently wraps the tool response in:
  //   { content: [{ type: 'text', text: '<json>' }, ...] }
  const blocks = Array.isArray(toolResponse)
    ? toolResponse
    : Array.isArray(toolResponse?.content)
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
  // Extract the save_* suffix from mcp__linear__save_issue → issue
  // or from mcp__codex_apps__save_issue → issue
  // Use non-greedy match to handle namespaces with underscores (codex_apps)
  const suffix = toolName.replace(/^mcp__.*?__/, '');
  return KIND_MAP[suffix] ?? 'unknown';
}

async function main() {
  let payload;
  try {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (err) {
    process.stderr.write(`[post-tool-use-record-linear-creations.codex] failed to parse stdin: ${err.message}\n`);
    process.exit(0);
  }

  const { session_id, tool_name, tool_response } = payload;

  // Filter on known Linear creation tools.
  // Codex's PostToolUse payload is stable: tool_name is always present and
  // tool_response is consistently wrapped in { content: [...] }.
  if (!TOOL_REGEX.test(tool_name)) {
    process.exit(0);
  }

  if (process.env.FACTORY_PROVENANCE_DISABLED === '1') {
    process.exit(0);
  }

  const kind = kindFromToolName(tool_name);
  const extracted = extractTarget(tool_response, kind);
  if (!extracted) {
    // Include the top-level payload keys in stderr so future changes to the
    // Codex hook payload are visible without needing to debug interactively.
    const keys = Object.keys(payload).join(',');
    process.stderr.write(
      `[post-tool-use-record-linear-creations.codex] could not extract identifier from ${tool_name} response (payload keys: ${keys})\n`
    );
    process.exit(0);
  }

  const stateDir = process.env.AGENT_STATE_DIR ?? '/YOUR/WORKSPACE/DIR/.agent-state';
  const provenanceDir = `${stateDir}/factory/provenance`;
  const itemsFile = `${provenanceDir}/${session_id}.items.jsonl`;

  try {
    mkdirSync(provenanceDir, { recursive: true });
  } catch (err) {
    process.stderr.write(`[post-tool-use-record-linear-creations.codex] failed to create dir: ${err.message}\n`);
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
    process.stderr.write(`[post-tool-use-record-linear-creations.codex] failed to append to ${itemsFile}: ${err.message}\n`);
  }

  process.exit(0);
}

main();
