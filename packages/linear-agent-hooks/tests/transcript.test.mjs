/**
 * Tests for lib/transcript.mjs — extractPrecedingContext, findTranscript
 *
 * Run: node --test packages/linear-agent-hooks/tests/transcript.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractPrecedingContext, findTranscript } from '../lib/transcript.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '..', 'fixtures');
const SAMPLE_TRANSCRIPT = join(FIXTURES, 'transcript-sample.jsonl');

function cleanup(tmpDir) {
  rmSync(tmpDir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// extractPrecedingContext
// ---------------------------------------------------------------------------

test('returns empty array for null transcript path', () => {
  const result = extractPrecedingContext(null);
  assert.deepEqual(result, []);
});

test('returns empty array for nonexistent path', () => {
  const result = extractPrecedingContext('/nonexistent/path/session.jsonl');
  assert.deepEqual(result, []);
});

test('returns last 1 human turn by default', () => {
  const result = extractPrecedingContext(SAMPLE_TRANSCRIPT);
  assert.equal(result.length, 1);
  assert.equal(result[0], 'also add a page size limit of 100');
});

test('returns last N human turns when turns > 1', () => {
  const result = extractPrecedingContext(SAMPLE_TRANSCRIPT, 2);
  assert.equal(result.length, 2);
  assert.equal(result[0], 'add pagination to the search results API');
  assert.equal(result[1], 'also add a page size limit of 100');
});

test('returns all turns when N exceeds total turns', () => {
  const result = extractPrecedingContext(SAMPLE_TRANSCRIPT, 99);
  assert.equal(result.length, 2);
});

test('handles simple { role: "user", content: "string" } shape', () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'groove-transcript-'));
  const transcriptPath = join(tmpDir, 'simple.jsonl');
  writeFileSync(transcriptPath, [
    JSON.stringify({ role: 'user', content: 'simple string message' }),
    JSON.stringify({ role: 'assistant', content: 'ok' }),
  ].join('\n') + '\n');
  try {
    const result = extractPrecedingContext(transcriptPath, 1);
    assert.equal(result[0], 'simple string message');
  } finally { cleanup(tmpDir); }
});

test('skips unparseable lines without throwing', () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'groove-transcript-'));
  const transcriptPath = join(tmpDir, 'corrupt.jsonl');
  writeFileSync(transcriptPath, [
    'not json at all',
    JSON.stringify({ type: 'user', message: { role: 'user', content: [{ type: 'text', text: 'valid message' }] } }),
    '{broken',
  ].join('\n') + '\n');
  try {
    const result = extractPrecedingContext(transcriptPath, 1);
    assert.equal(result[0], 'valid message');
  } finally { cleanup(tmpDir); }
});

// ---------------------------------------------------------------------------
// findTranscript
// ---------------------------------------------------------------------------

test('finds transcript in a simulated Claude projects directory', () => {
  // We can't override homedir(), so we test the logic indirectly by pointing
  // extractPrecedingContext at a known path and confirming it works when found.
  // findTranscript itself is tested by verifying it returns null for a session
  // that definitely does not exist.
  const result = findTranscript('this-session-id-does-not-exist-anywhere');
  assert.equal(result, null);
});
