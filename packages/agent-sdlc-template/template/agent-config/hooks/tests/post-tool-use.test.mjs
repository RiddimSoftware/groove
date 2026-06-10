/**
 * Unit tests for post-tool-use-record-linear-creations.mjs
 *
 * Run: node --test hooks/tests/post-tool-use.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync as readJSON } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOOK = resolve(__dirname, '..', 'post-tool-use-record-linear-creations.mjs');
const FIXTURES = resolve(__dirname, '..', 'fixtures');

function runHook(fixtureFile, env = {}) {
  const input = readFileSync(join(FIXTURES, fixtureFile), 'utf8');
  const tmpDir = mkdtempSync(join(tmpdir(), 'fac28-test-'));
  try {
    const result = spawnSync(process.execPath, [HOOK], {
      input,
      encoding: 'utf8',
      env: { ...process.env, AGENT_STATE_DIR: tmpDir, ...env },
    });
    const provenanceDir = join(tmpDir, 'factory', 'provenance');
    return { result, tmpDir, provenanceDir };
  } catch (err) {
    rmSync(tmpDir, { recursive: true, force: true });
    throw err;
  }
}

test('records save_issue to items file', () => {
  const { result, tmpDir, provenanceDir } = runHook('post-tool-use-save-issue.json');
  try {
    assert.equal(result.status, 0, `exited non-zero: ${result.stderr}`);
    assert.equal(result.stderr, '', `unexpected stderr: ${result.stderr}`);

    const lines = readFileSync(join(provenanceDir, 'abc123def456.items.jsonl'), 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l));

    assert.equal(lines.length, 1);
    assert.equal(lines[0].linearId, 'FAC-101');
    assert.equal(lines[0].kind, 'issue');
    assert.match(lines[0].toolName, /save_issue/);
    assert.ok(lines[0].createdAt, 'createdAt missing');
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('records save_project to items file', () => {
  const { result, tmpDir, provenanceDir } = runHook('post-tool-use-save-project.json');
  try {
    assert.equal(result.status, 0);
    const lines = readFileSync(join(provenanceDir, 'abc123def456.items.jsonl'), 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l));
    // Projects are keyed by UUID (Linear has no human-readable project identifier).
    // The hook records `kind: 'project'` with the UUID; FAC-40 consumes this in the
    // factory provenance attach CLI to write project-level Linear attachments.
    assert.equal(lines[0].kind, 'project');
    assert.match(lines[0].linearId, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('exits 0 silently for non-creation tool (noop)', () => {
  const { result, tmpDir } = runHook('post-tool-use-noop-tool.json');
  try {
    assert.equal(result.status, 0);
    assert.equal(result.stderr, '');
    // No items file should be created
    let fileExists = false;
    try {
      readFileSync(join(tmpDir, 'factory', 'provenance', 'abc123def456.items.jsonl'));
      fileExists = true;
    } catch {
      // expected
    }
    assert.equal(fileExists, false, 'items file should not exist for noop tool');
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('exits 0 silently when FACTORY_PROVENANCE_DISABLED=1', () => {
  const { result, tmpDir } = runHook('post-tool-use-save-issue.json', {
    FACTORY_PROVENANCE_DISABLED: '1',
  });
  try {
    assert.equal(result.status, 0);
    assert.equal(result.stderr, '');
    let fileExists = false;
    try {
      readFileSync(join(tmpDir, 'factory', 'provenance', 'abc123def456.items.jsonl'));
      fileExists = true;
    } catch {
      // expected
    }
    assert.equal(fileExists, false, 'items file should not exist when disabled');
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('extracts identifier from claude_ai_Linear MCP shape (id field, no identifier)', () => {
  // The `claude_ai_Linear` MCP server returns the human-readable Linear identifier
  // under `id` rather than `identifier`. Regression test for the FAC-28 followup
  // bug: the hook previously failed to extract and skipped recording these items.
  const { result, tmpDir, provenanceDir } = runHook('post-tool-use-save-issue-claude-ai-linear.json');
  try {
    assert.equal(result.status, 0, `exited non-zero: ${result.stderr}`);
    assert.equal(result.stderr, '', `unexpected stderr: ${result.stderr}`);

    const lines = readFileSync(join(provenanceDir, 'lab53session.items.jsonl'), 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l));

    assert.equal(lines.length, 1);
    assert.equal(lines[0].linearId, 'LAB-53');
    assert.equal(lines[0].kind, 'issue');
    assert.match(lines[0].toolName, /claude_ai_Linear__save_issue/);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('extracts identifier from URL when both id and identifier are missing', () => {
  // Defense-in-depth: if a future MCP shape omits both `id` and `identifier`, fall
  // back to parsing the Linear URL.
  const fixtureUrlOnly = JSON.stringify({
    session_id: 'urlonly',
    tool_name: 'mcp__x__save_issue',
    tool_input: {},
    tool_response: {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ url: 'https://linear.app/riddimsoftware/issue/EPAC-999/some-title' }),
        },
      ],
    },
  });
  const tmpDir = mkdtempSync(join(tmpdir(), 'fac28-urlonly-test-'));
  try {
    const result = spawnSync(process.execPath, [HOOK], {
      input: fixtureUrlOnly,
      encoding: 'utf8',
      env: { ...process.env, AGENT_STATE_DIR: tmpDir },
    });
    assert.equal(result.status, 0);
    const lines = readFileSync(join(tmpDir, 'factory', 'provenance', 'urlonly.items.jsonl'), 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l));
    assert.equal(lines[0].linearId, 'EPAC-999');
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('rejects non-Linear-shaped id values (e.g. raw UUID with no identifier)', () => {
  // If `id` is a UUID and there's no `identifier` and no parseable URL, don't fabricate
  // a Linear ID. The hook should log "could not extract identifier" and skip.
  const fixtureUuidId = JSON.stringify({
    session_id: 'uuidid',
    tool_name: 'mcp__x__save_issue',
    tool_input: {},
    tool_response: {
      content: [
        { type: 'text', text: JSON.stringify({ id: '12345678-1234-1234-1234-123456789012', title: 'x' }) },
      ],
    },
  });
  const tmpDir = mkdtempSync(join(tmpdir(), 'fac28-uuid-test-'));
  try {
    const result = spawnSync(process.execPath, [HOOK], {
      input: fixtureUuidId,
      encoding: 'utf8',
      env: { ...process.env, AGENT_STATE_DIR: tmpDir },
    });
    assert.equal(result.status, 0, 'hook should still exit 0 on non-blocking failure');
    assert.match(result.stderr, /could not extract identifier/);
    let fileExists = false;
    try {
      readFileSync(join(tmpDir, 'factory', 'provenance', 'uuidid.items.jsonl'));
      fileExists = true;
    } catch {
      // expected
    }
    assert.equal(fileExists, false, 'no items file should be written when extraction fails');
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('project: rejects when id is not a UUID', () => {
  // Real Linear projects always have UUID ids. If the response lacks a UUID-shaped
  // id, refuse to record — don't fabricate a project identifier. FAC-40's CLI
  // dispatches to attachmentCreate(projectId: ...) which needs the canonical UUID.
  const fixture = JSON.stringify({
    session_id: 'badproj',
    tool_name: 'mcp__x__save_project',
    tool_input: {},
    tool_response: {
      content: [{ type: 'text', text: JSON.stringify({ id: 'not-a-uuid', name: 'x' }) }],
    },
  });
  const tmpDir = mkdtempSync(join(tmpdir(), 'agent-18-bad-proj-'));
  try {
    const result = spawnSync(process.execPath, [HOOK], {
      input: fixture,
      encoding: 'utf8',
      env: { ...process.env, AGENT_STATE_DIR: tmpDir },
    });
    assert.equal(result.status, 0, 'hook should exit 0 even when extraction fails');
    assert.match(result.stderr, /could not extract identifier/);
    let fileExists = false;
    try {
      readFileSync(join(tmpDir, 'factory', 'provenance', 'badproj.items.jsonl'));
      fileExists = true;
    } catch {
      // expected
    }
    assert.equal(fileExists, false, 'no items file should be written when extraction fails');
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('tool-name regex: accepts any UUID namespace prefix', () => {
  const fixtureWithDifferentPrefix = JSON.stringify({
    session_id: 'sess999',
    tool_name: 'mcp__aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee__save_initiative',
    tool_input: {},
    tool_response: {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ id: 'uid', identifier: 'INIT-7', url: 'https://linear.app/x/initiative/INIT-7/x' }),
        },
      ],
    },
  });

  const tmpDir = mkdtempSync(join(tmpdir(), 'fac28-prefix-test-'));
  try {
    const result = spawnSync(process.execPath, [HOOK], {
      input: fixtureWithDifferentPrefix,
      encoding: 'utf8',
      env: { ...process.env, AGENT_STATE_DIR: tmpDir },
    });
    assert.equal(result.status, 0);
    const lines = readFileSync(join(tmpDir, 'factory', 'provenance', 'sess999.items.jsonl'), 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l));
    assert.equal(lines[0].linearId, 'INIT-7');
    assert.equal(lines[0].kind, 'initiative');
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('extracts identifier when payload uses `tool_result` instead of `tool_response`', () => {
  // Claude.com hooks docs document the field as `tool_result`. The hook must
  // accept this variant so real-world Claude Code sessions are not silently
  // dropped (the v1 hook destructured `tool_response` only and broke on every
  // real session).
  const { result, tmpDir, provenanceDir } = runHook('post-tool-use-save-issue-tool-result.json');
  try {
    assert.equal(result.status, 0, `exited non-zero: ${result.stderr}`);
    assert.equal(result.stderr, '', `unexpected stderr: ${result.stderr}`);

    const lines = readFileSync(join(provenanceDir, 'toolresult01.items.jsonl'), 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l));

    assert.equal(lines.length, 1);
    assert.equal(lines[0].linearId, 'LAB-100');
    assert.equal(lines[0].kind, 'issue');
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('extracts identifier when payload uses `response` (Claude Code in-app UI shape)', () => {
  // Claude Code's in-app hook permission UI in 2.1.143 documents the field as
  // `response`. Empirically observed in real sessions; this is the variant
  // that surfaced the original bug.
  const { result, tmpDir, provenanceDir } = runHook('post-tool-use-save-issue-response.json');
  try {
    assert.equal(result.status, 0, `exited non-zero: ${result.stderr}`);
    assert.equal(result.stderr, '', `unexpected stderr: ${result.stderr}`);

    const lines = readFileSync(join(provenanceDir, 'responseonly1.items.jsonl'), 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l));

    assert.equal(lines.length, 1);
    assert.equal(lines[0].linearId, 'LAB-101');
    assert.equal(lines[0].kind, 'issue');
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('logs payload keys in stderr when no known response field is present', () => {
  // If a future Claude Code version renames the response field yet again, the
  // stderr should expose the actual payload keys so the next maintainer can
  // diagnose without installing a debug hook.
  const fixture = JSON.stringify({
    session_id: 'nofield',
    tool_name: 'mcp__x__save_issue',
    tool_input: {},
    surprise_new_field_name: { id: 'LAB-200', url: 'https://linear.app/x/issue/LAB-200/x' },
  });
  const tmpDir = mkdtempSync(join(tmpdir(), 'agent-19-no-field-'));
  try {
    const result = spawnSync(process.execPath, [HOOK], {
      input: fixture,
      encoding: 'utf8',
      env: { ...process.env, AGENT_STATE_DIR: tmpDir },
    });
    assert.equal(result.status, 0);
    assert.match(result.stderr, /could not extract identifier/);
    assert.match(result.stderr, /payload keys:.*surprise_new_field_name/);
    let fileExists = false;
    try {
      readFileSync(join(tmpDir, 'factory', 'provenance', 'nofield.items.jsonl'));
      fileExists = true;
    } catch {
      // expected
    }
    assert.equal(fileExists, false, 'no items file when no response field is present');
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('extracts identifier when tool_response is a bare content array (real Claude Code shape)', () => {
  // Claude Code 2.1.143 passes `tool_response` as the MCP content array directly
  // (NOT wrapped in {content: [...]}). Confirmed against the `toolUseResult` field
  // of session JSONLs. Three hook iterations (FAC-28, AGENT-18, AGENT-19) all
  // shipped tests against a wrapped-shape fixture that didn't match reality; this
  // test asserts the real-world bare-array shape extracts correctly.
  const { result, tmpDir, provenanceDir } = runHook('post-tool-use-save-issue-bare-array.json');
  try {
    assert.equal(result.status, 0, `exited non-zero: ${result.stderr}`);
    assert.equal(result.stderr, '', `unexpected stderr: ${result.stderr}`);

    const lines = readFileSync(join(provenanceDir, 'barearrayfix.items.jsonl'), 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l));

    assert.equal(lines.length, 1);
    assert.equal(lines[0].linearId, 'LAB-57');
    assert.equal(lines[0].kind, 'issue');
    assert.match(lines[0].toolName, /claude_ai_Linear__save_issue/);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});
