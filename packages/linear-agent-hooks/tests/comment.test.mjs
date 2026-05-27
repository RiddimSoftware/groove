/**
 * Tests for lib/comment.mjs — buildCommentBody
 *
 * Run: node --test packages/linear-agent-hooks/tests/comment.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCommentBody } from '../lib/comment.mjs';

test('includes source, session ID, and timestamp', () => {
  const body = buildCommentBody('abc123', 'claude', []);
  assert.match(body, /🤖 \*\*claude\*\*/);
  assert.match(body, /`abc123`/);
  assert.match(body, /UTC$/);
});

test('quotes a single context message', () => {
  const body = buildCommentBody('abc123', 'claude', ['add pagination to the search API']);
  assert.match(body, /^> add pagination to the search API/m);
});

test('quotes multiple context messages in order', () => {
  const body = buildCommentBody('abc123', 'claude', ['first message', 'second message']);
  const firstIdx = body.indexOf('> first message');
  const secondIdx = body.indexOf('> second message');
  assert.ok(firstIdx !== -1, 'first message missing');
  assert.ok(secondIdx !== -1, 'second message missing');
  assert.ok(firstIdx < secondIdx, 'messages out of order');
});

test('truncates context messages longer than 500 characters', () => {
  const longMsg = 'x'.repeat(600);
  const body = buildCommentBody('abc123', 'claude', [longMsg]);
  // truncated line should end with ellipsis and be < 510 chars
  const quotedLine = body.split('\n').find(l => l.startsWith('> '));
  assert.ok(quotedLine, 'no quoted line found');
  assert.ok(quotedLine.endsWith('…'), 'long message not truncated');
  assert.ok(quotedLine.length < 510, 'truncated line too long');
});

test('produces clean output with no context messages', () => {
  const body = buildCommentBody('sess42', 'codex', []);
  // Should have exactly one line (the header), no blank lines at end
  assert.doesNotMatch(body, /^>/m);
  assert.equal(body.trim(), body, 'unexpected leading/trailing whitespace');
});

test('escapes newlines in context messages as blockquote continuation', () => {
  const multiLine = 'line one\nline two\nline three';
  const body = buildCommentBody('abc123', 'claude', [multiLine]);
  assert.match(body, /> line one\n> line two\n> line three/);
});
