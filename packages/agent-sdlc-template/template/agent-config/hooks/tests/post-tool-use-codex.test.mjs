/**
 * Unit tests for post-tool-use-record-linear-creations.codex.mjs
 *
 * Run: node --test hooks/tests/post-tool-use-codex.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOOK = resolve(__dirname, '..', 'post-tool-use-record-linear-creations.codex.mjs');

function runCodexHook(payload, env = {}) {
  const input = JSON.stringify(payload);
  const tmpDir = mkdtempSync(join(tmpdir(), 'fac46-codex-test-'));
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

function readItems(provenanceDir, sessionId) {
  try {
    const content = readFileSync(join(provenanceDir, `${sessionId}.items.jsonl`), 'utf8');
    return content
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}

test('Codex: records mcp__linear__save_issue to items file', () => {
  const payload = {
    session_id: 'test-session-123',
    tool_name: 'mcp__linear__save_issue',
    tool_response: {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            id: 'FAC-46',
            title: 'Test issue',
            url: 'https://linear.app/riddimsoftware/issue/FAC-46/test',
          }),
        },
      ],
    },
  };

  const { result, tmpDir, provenanceDir } = runCodexHook(payload);
  try {
    assert.equal(result.status, 0, `exited non-zero: ${result.stderr}`);
    assert.equal(result.stderr, '', `unexpected stderr: ${result.stderr}`);

    const items = readItems(provenanceDir, 'test-session-123');
    assert.equal(items.length, 1);
    assert.equal(items[0].linearId, 'FAC-46');
    assert.equal(items[0].kind, 'issue');
    assert.equal(items[0].toolName, 'mcp__linear__save_issue');
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Codex: records mcp__linear__save_project to items file', () => {
  const projectId = '550e8400-e29b-41d4-a716-446655440000';
  const payload = {
    session_id: 'test-session-456',
    tool_name: 'mcp__linear__save_project',
    tool_response: {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            id: projectId,
            name: 'Test Project',
            url: 'https://linear.app/riddimsoftware/projects/' + projectId,
          }),
        },
      ],
    },
  };

  const { result, tmpDir, provenanceDir } = runCodexHook(payload);
  try {
    assert.equal(result.status, 0, `exited non-zero: ${result.stderr}`);

    const items = readItems(provenanceDir, 'test-session-456');
    assert.equal(items.length, 1);
    assert.equal(items[0].linearId, projectId);
    assert.equal(items[0].kind, 'project');
    assert.equal(items[0].toolName, 'mcp__linear__save_project');
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Codex: matches mcp__codex_apps__save_issue (Apps layer)', () => {
  const payload = {
    session_id: 'test-session-apps',
    tool_name: 'mcp__codex_apps__save_issue',
    tool_response: {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            id: 'EPAC-999',
            url: 'https://linear.app/riddimsoftware/issue/EPAC-999/test',
          }),
        },
      ],
    },
  };

  const { result, tmpDir, provenanceDir } = runCodexHook(payload);
  try {
    assert.equal(result.status, 0);

    const items = readItems(provenanceDir, 'test-session-apps');
    assert.equal(items.length, 1);
    assert.equal(items[0].linearId, 'EPAC-999');
    assert.equal(items[0].kind, 'issue');
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Codex: non-Linear tools are silent no-ops', () => {
  const payload = {
    session_id: 'test-session-bash',
    tool_name: 'Bash',
    tool_response: { content: [{ type: 'text', text: 'Command executed' }] },
  };

  const { result, tmpDir, provenanceDir } = runCodexHook(payload);
  try {
    assert.equal(result.status, 0);
    assert.equal(result.stderr, '');

    const items = readItems(provenanceDir, 'test-session-bash');
    assert.equal(items.length, 0);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Codex: fails closed when directory creation fails', () => {
  const payload = {
    session_id: 'test-session-fail',
    tool_name: 'mcp__linear__save_issue',
    tool_response: {
      content: [{ type: 'text', text: JSON.stringify({ id: 'FAC-1' }) }],
    },
  };

  // Use a read-only directory to force mkdir failure
  const { result } = runCodexHook(payload, { AGENT_STATE_DIR: '/dev/null' });
  try {
    assert.equal(result.status, 0, 'should exit 0 even on error');
    assert.match(result.stderr, /failed to create dir/i, 'should log error to stderr');
  } finally {
    // cleanup not needed since we used /dev/null
  }
});

test('Codex: extracts identifier from URL when id is missing', () => {
  const payload = {
    session_id: 'test-session-url',
    tool_name: 'mcp__linear__save_issue',
    tool_response: {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            url: 'https://linear.app/riddimsoftware/issue/FAC-200/test-issue',
          }),
        },
      ],
    },
  };

  const { result, tmpDir, provenanceDir } = runCodexHook(payload);
  try {
    assert.equal(result.status, 0);

    const items = readItems(provenanceDir, 'test-session-url');
    assert.equal(items.length, 1);
    assert.equal(items[0].linearId, 'FAC-200');
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Codex: appends multiple records for multiple creations in same session', () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'fac46-multi-test-'));
  try {
    // First creation
    const payload1 = {
      session_id: 'multi-session',
      tool_name: 'mcp__linear__save_issue',
      tool_response: {
        content: [{ type: 'text', text: JSON.stringify({ id: 'FAC-1' }) }],
      },
    };
    const result1 = spawnSync(process.execPath, [HOOK], {
      input: JSON.stringify(payload1),
      encoding: 'utf8',
      env: { ...process.env, AGENT_STATE_DIR: tmpDir },
    });

    assert.equal(result1.status, 0);

    // Second creation in same session
    const payload2 = {
      session_id: 'multi-session',
      tool_name: 'mcp__linear__save_project',
      tool_response: {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              id: '550e8400-e29b-41d4-a716-446655440000',
            }),
          },
        ],
      },
    };
    const result2 = spawnSync(process.execPath, [HOOK], {
      input: JSON.stringify(payload2),
      encoding: 'utf8',
      env: { ...process.env, AGENT_STATE_DIR: tmpDir },
    });

    assert.equal(result2.status, 0);

    // Verify both records exist
    const provenanceDir = join(tmpDir, 'factory', 'provenance');
    const items = readItems(provenanceDir, 'multi-session');
    assert.equal(items.length, 2);
    assert.equal(items[0].linearId, 'FAC-1');
    assert.equal(items[0].kind, 'issue');
    assert.equal(items[1].linearId, '550e8400-e29b-41d4-a716-446655440000');
    assert.equal(items[1].kind, 'project');
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});
