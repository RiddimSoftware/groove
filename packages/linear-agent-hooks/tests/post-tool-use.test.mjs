/**
 * Tests for hooks/post-tool-use.mjs
 *
 * Run: node --test packages/linear-agent-hooks/tests/post-tool-use.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOOK = resolve(__dirname, '..', 'hooks', 'post-tool-use.mjs');
const FIXTURES = resolve(__dirname, '..', 'fixtures');

function runHook(fixtureFile, env = {}) {
  const input = readFileSync(join(FIXTURES, fixtureFile), 'utf8');
  const tmpDir = mkdtempSync(join(tmpdir(), 'groove-test-'));
  const result = spawnSync(process.execPath, [HOOK], {
    input,
    encoding: 'utf8',
    env: { ...process.env, GROOVE_STATE_DIR: tmpDir, ...env },
  });
  const provenanceDir = join(tmpDir, 'provenance');
  return { result, tmpDir, provenanceDir };
}

function cleanup(tmpDir) {
  rmSync(tmpDir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------

test('records save_issue to items file', () => {
  const { result, tmpDir, provenanceDir } = runHook('post-tool-use-save-issue.json');
  try {
    assert.equal(result.status, 0, `exited non-zero: ${result.stderr}`);
    assert.equal(result.stderr, '', `unexpected stderr: ${result.stderr}`);

    const lines = readFileSync(join(provenanceDir, 'abc123def456.items.jsonl'), 'utf8')
      .trim().split('\n').filter(Boolean).map(l => JSON.parse(l));

    assert.equal(lines.length, 1);
    assert.equal(lines[0].linearId, 'ENG-101');
    assert.equal(lines[0].kind, 'issue');
    assert.match(lines[0].toolName, /save_issue/);
    assert.ok(lines[0].createdAt, 'createdAt missing');
  } finally { cleanup(tmpDir); }
});

test('records save_project UUID to items file', () => {
  const { result, tmpDir, provenanceDir } = runHook('post-tool-use-save-project.json');
  try {
    assert.equal(result.status, 0);
    const lines = readFileSync(join(provenanceDir, 'abc123def456.items.jsonl'), 'utf8')
      .trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
    assert.equal(lines[0].kind, 'project');
    assert.match(lines[0].linearId, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  } finally { cleanup(tmpDir); }
});

test('exits 0 silently for non-creation tool (noop)', () => {
  const { result, tmpDir } = runHook('post-tool-use-noop-tool.json');
  try {
    assert.equal(result.status, 0);
    assert.equal(result.stderr, '');
    assert.throws(
      () => readFileSync(join(tmpDir, 'provenance', 'abc123def456.items.jsonl')),
      { code: 'ENOENT' },
      'items file should not exist for noop tool'
    );
  } finally { cleanup(tmpDir); }
});

test('exits 0 silently when GROOVE_DISABLED=1', () => {
  const { result, tmpDir } = runHook('post-tool-use-save-issue.json', { GROOVE_DISABLED: '1' });
  try {
    assert.equal(result.status, 0);
    assert.equal(result.stderr, '');
    assert.throws(
      () => readFileSync(join(tmpDir, 'provenance', 'abc123def456.items.jsonl')),
      { code: 'ENOENT' }
    );
  } finally { cleanup(tmpDir); }
});

test('extracts identifier from claude_ai_Linear shape (id field, no identifier key)', () => {
  // The claude_ai_Linear MCP server returns the human-readable identifier under
  // `id` rather than `identifier`. Regression test: the hook must handle both.
  const { result, tmpDir, provenanceDir } = runHook('post-tool-use-save-issue-claude-ai-linear.json');
  try {
    assert.equal(result.status, 0, `exited non-zero: ${result.stderr}`);
    assert.equal(result.stderr, '');
    const lines = readFileSync(join(provenanceDir, 'lab53session.items.jsonl'), 'utf8')
      .trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
    assert.equal(lines[0].linearId, 'LAB-53');
    assert.equal(lines[0].kind, 'issue');
    assert.match(lines[0].toolName, /claude_ai_Linear__save_issue/);
  } finally { cleanup(tmpDir); }
});

test('extracts identifier from bare content array (real Claude Code shape)', () => {
  // Claude Code passes tool_response as a bare array, not wrapped in { content: [] }.
  // Regression test: three earlier iterations got this wrong.
  const { result, tmpDir, provenanceDir } = runHook('post-tool-use-save-issue-bare-array.json');
  try {
    assert.equal(result.status, 0, `exited non-zero: ${result.stderr}`);
    assert.equal(result.stderr, '');
    const lines = readFileSync(join(provenanceDir, 'barearrayfix.items.jsonl'), 'utf8')
      .trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
    assert.equal(lines[0].linearId, 'LAB-57');
  } finally { cleanup(tmpDir); }
});

test('extracts identifier when payload uses tool_result field', () => {
  // Claude Code docs document the field as `tool_result`.
  const { result, tmpDir, provenanceDir } = runHook('post-tool-use-save-issue-tool-result.json');
  try {
    assert.equal(result.status, 0, `exited non-zero: ${result.stderr}`);
    assert.equal(result.stderr, '');
    const lines = readFileSync(join(provenanceDir, 'toolresult01.items.jsonl'), 'utf8')
      .trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
    assert.equal(lines[0].linearId, 'LAB-100');
  } finally { cleanup(tmpDir); }
});

test('extracts identifier when payload uses response field (Claude Code in-app UI shape)', () => {
  const { result, tmpDir, provenanceDir } = runHook('post-tool-use-save-issue-response.json');
  try {
    assert.equal(result.status, 0, `exited non-zero: ${result.stderr}`);
    assert.equal(result.stderr, '');
    const lines = readFileSync(join(provenanceDir, 'responseonly1.items.jsonl'), 'utf8')
      .trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
    assert.equal(lines[0].linearId, 'LAB-101');
  } finally { cleanup(tmpDir); }
});

test('extracts identifier from URL when id and identifier are both missing', () => {
  const fixture = JSON.stringify({
    session_id: 'urlonly',
    tool_name: 'mcp__x__save_issue',
    tool_input: {},
    tool_response: {
      content: [{ type: 'text', text: JSON.stringify({ url: 'https://linear.app/acmecorp/issue/ENG-999/some-title' }) }],
    },
  });
  const tmpDir = mkdtempSync(join(tmpdir(), 'groove-urlonly-'));
  try {
    const result = spawnSync(process.execPath, [HOOK], {
      input: fixture,
      encoding: 'utf8',
      env: { ...process.env, GROOVE_STATE_DIR: tmpDir },
    });
    assert.equal(result.status, 0);
    const lines = readFileSync(join(tmpDir, 'provenance', 'urlonly.items.jsonl'), 'utf8')
      .trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
    assert.equal(lines[0].linearId, 'ENG-999');
  } finally { cleanup(tmpDir); }
});

test('rejects UUID-shaped id for issues (no identifier, no parseable URL)', () => {
  // If `id` is a UUID and there's no `identifier` and no URL to parse, do not
  // record — avoid fabricating a Linear issue identifier from a project UUID.
  const fixture = JSON.stringify({
    session_id: 'uuidid',
    tool_name: 'mcp__x__save_issue',
    tool_input: {},
    tool_response: {
      content: [{ type: 'text', text: JSON.stringify({ id: '12345678-1234-1234-1234-123456789012', title: 'x' }) }],
    },
  });
  const tmpDir = mkdtempSync(join(tmpdir(), 'groove-uuid-'));
  try {
    const result = spawnSync(process.execPath, [HOOK], {
      input: fixture,
      encoding: 'utf8',
      env: { ...process.env, GROOVE_STATE_DIR: tmpDir },
    });
    assert.equal(result.status, 0);
    assert.match(result.stderr, /could not extract identifier/);
    assert.throws(() => readFileSync(join(tmpDir, 'provenance', 'uuidid.items.jsonl')), { code: 'ENOENT' });
  } finally { cleanup(tmpDir); }
});

test('rejects non-UUID id for projects', () => {
  const fixture = JSON.stringify({
    session_id: 'badproj',
    tool_name: 'mcp__x__save_project',
    tool_input: {},
    tool_response: {
      content: [{ type: 'text', text: JSON.stringify({ id: 'not-a-uuid', name: 'x' }) }],
    },
  });
  const tmpDir = mkdtempSync(join(tmpdir(), 'groove-badproj-'));
  try {
    const result = spawnSync(process.execPath, [HOOK], {
      input: fixture,
      encoding: 'utf8',
      env: { ...process.env, GROOVE_STATE_DIR: tmpDir },
    });
    assert.equal(result.status, 0);
    assert.match(result.stderr, /could not extract identifier/);
    assert.throws(() => readFileSync(join(tmpDir, 'provenance', 'badproj.items.jsonl')), { code: 'ENOENT' });
  } finally { cleanup(tmpDir); }
});

test('accepts any UUID namespace prefix in tool name', () => {
  const fixture = JSON.stringify({
    session_id: 'sess999',
    tool_name: 'mcp__aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee__save_initiative',
    tool_input: {},
    tool_response: {
      content: [{ type: 'text', text: JSON.stringify({ identifier: 'INIT-7' }) }],
    },
  });
  const tmpDir = mkdtempSync(join(tmpdir(), 'groove-prefix-'));
  try {
    const result = spawnSync(process.execPath, [HOOK], {
      input: fixture,
      encoding: 'utf8',
      env: { ...process.env, GROOVE_STATE_DIR: tmpDir },
    });
    assert.equal(result.status, 0);
    const lines = readFileSync(join(tmpDir, 'provenance', 'sess999.items.jsonl'), 'utf8')
      .trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
    assert.equal(lines[0].linearId, 'INIT-7');
    assert.equal(lines[0].kind, 'initiative');
  } finally { cleanup(tmpDir); }
});

test('logs payload keys in stderr when no known response field is present', () => {
  // If a future Claude Code version renames the response field, stderr exposes
  // the actual payload keys so the next maintainer can diagnose without a debug hook.
  const fixture = JSON.stringify({
    session_id: 'nofield',
    tool_name: 'mcp__x__save_issue',
    tool_input: {},
    surprise_new_field: { id: 'ENG-200' },
  });
  const tmpDir = mkdtempSync(join(tmpdir(), 'groove-nofield-'));
  try {
    const result = spawnSync(process.execPath, [HOOK], {
      input: fixture,
      encoding: 'utf8',
      env: { ...process.env, GROOVE_STATE_DIR: tmpDir },
    });
    assert.equal(result.status, 0);
    assert.match(result.stderr, /could not extract identifier/);
    assert.match(result.stderr, /payload keys:.*surprise_new_field/);
    assert.throws(() => readFileSync(join(tmpDir, 'provenance', 'nofield.items.jsonl')), { code: 'ENOENT' });
  } finally { cleanup(tmpDir); }
});
