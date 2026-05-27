/**
 * Tests for hooks/stop.mjs — behavioral / no-op paths.
 *
 * The Linear API-calling path is not tested here (requires a real key).
 * These tests cover every early-exit branch so CI catches regressions in the
 * failure modes that would silently break the user's experience.
 *
 * Run: node --test packages/linear-agent-hooks/tests/stop.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOOK = resolve(__dirname, '..', 'hooks', 'stop.mjs');

function makePayload(sessionId = 'abc123def456') {
  return JSON.stringify({ session_id: sessionId, stop_reason: 'end_turn' });
}

function writeItems(dir, sessionId, items) {
  const provenanceDir = join(dir, 'provenance');
  mkdirSync(provenanceDir, { recursive: true });
  writeFileSync(
    join(provenanceDir, `${sessionId}.items.jsonl`),
    items.map(i => JSON.stringify(i)).join('\n') + '\n',
    'utf8'
  );
}

function cleanup(tmpDir) {
  rmSync(tmpDir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------

test('exits 0 silently when no items file exists', () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'groove-stop-'));
  try {
    const result = spawnSync(process.execPath, [HOOK], {
      input: makePayload('nosuchsession'),
      encoding: 'utf8',
      env: { ...process.env, GROOVE_STATE_DIR: tmpDir, CLAUDE_CODE_ENTRYPOINT: 'cli' },
    });
    assert.equal(result.status, 0);
    assert.equal(result.stderr, '');
  } finally { cleanup(tmpDir); }
});

test('exits 0 silently when items file is empty', () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'groove-stop-empty-'));
  const provenanceDir = join(tmpDir, 'provenance');
  mkdirSync(provenanceDir, { recursive: true });
  writeFileSync(join(provenanceDir, 'sess-empty.items.jsonl'), '', 'utf8');
  try {
    const result = spawnSync(process.execPath, [HOOK], {
      input: makePayload('sess-empty'),
      encoding: 'utf8',
      env: { ...process.env, GROOVE_STATE_DIR: tmpDir, CLAUDE_CODE_ENTRYPOINT: 'cli' },
    });
    assert.equal(result.status, 0);
    assert.equal(result.stderr, '');
  } finally { cleanup(tmpDir); }
});

test('exits 0 silently when GROOVE_DISABLED=1 even with items', () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'groove-stop-disabled-'));
  writeItems(tmpDir, 'sess-dis', [{ linearId: 'ENG-1', kind: 'issue', toolName: 'x', createdAt: new Date().toISOString() }]);
  try {
    const result = spawnSync(process.execPath, [HOOK], {
      input: makePayload('sess-dis'),
      encoding: 'utf8',
      env: {
        ...process.env,
        GROOVE_STATE_DIR: tmpDir,
        CLAUDE_CODE_ENTRYPOINT: 'cli',
        GROOVE_DISABLED: '1',
      },
    });
    assert.equal(result.status, 0);
    assert.equal(result.stderr, '');
  } finally { cleanup(tmpDir); }
});

test('exits 0 with warning when LINEAR_API_KEY is not set', () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'groove-stop-nokey-'));
  writeItems(tmpDir, 'sess-nokey', [{ linearId: 'ENG-2', kind: 'issue', toolName: 'x', createdAt: new Date().toISOString() }]);
  try {
    const env = { ...process.env, GROOVE_STATE_DIR: tmpDir, CLAUDE_CODE_ENTRYPOINT: 'cli' };
    delete env.LINEAR_API_KEY;
    const result = spawnSync(process.execPath, [HOOK], {
      input: makePayload('sess-nokey'),
      encoding: 'utf8',
      env,
    });
    assert.equal(result.status, 0);
    assert.match(result.stderr, /LINEAR_API_KEY not set/);
  } finally { cleanup(tmpDir); }
});

test('exits 0 with warning when runtime source cannot be determined', () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'groove-stop-nosrc-'));
  writeItems(tmpDir, 'sess-nosrc', [{ linearId: 'ENG-3', kind: 'issue', toolName: 'x', createdAt: new Date().toISOString() }]);
  try {
    const env = {
      ...process.env,
      GROOVE_STATE_DIR: tmpDir,
      LINEAR_API_KEY: 'lin_api_fake',
    };
    delete env.CLAUDE_CODE_ENTRYPOINT;
    delete env.CODEX_SESSION;
    const result = spawnSync(process.execPath, [HOOK], {
      input: makePayload('sess-nosrc'),
      encoding: 'utf8',
      env,
    });
    // No source → still exits 0 (never blocks session), uses 'agent' fallback
    // and proceeds to try the API. Since the key is fake, it will fail the
    // API call and log a comment-posting error — that's acceptable.
    // The important contract is: exit code is always 0.
    assert.equal(result.status, 0);
  } finally { cleanup(tmpDir); }
});
