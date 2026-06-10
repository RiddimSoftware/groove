/**
 * Unit tests for pre-tool-use-enforce-linear-teams.mjs
 *
 * Run: node --test hooks/tests/pre-tool-use-enforce-linear-teams.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOOK = resolve(__dirname, '..', 'pre-tool-use-enforce-linear-teams.mjs');

function runHook(payload, env = {}) {
  const mergedEnv = { ...process.env, ...env };
  if (!Object.hasOwn(env, 'LINEAR_ALLOWED_TEAMS')) {
    delete mergedEnv.LINEAR_ALLOWED_TEAMS;
  }

  return spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    env: mergedEnv,
  });
}

test('allows save_issue when the target team is in LINEAR_ALLOWED_TEAMS', () => {
  const result = runHook(
    {
      tool_name: 'mcp__claude_ai_Linear__save_issue',
      tool_input: { title: 'Test issue', team: 'EPAC' },
    },
    { LINEAR_ALLOWED_TEAMS: 'EPAC' }
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
});

test('blocks save_issue when the target team is outside LINEAR_ALLOWED_TEAMS', () => {
  const result = runHook(
    {
      tool_name: 'mcp__claude_ai_Linear__save_issue',
      tool_input: { title: 'Test issue', team: 'FAC' },
    },
    { LINEAR_ALLOWED_TEAMS: 'EPAC' }
  );

  assert.notEqual(result.status, 0);
  assert.equal(
    result.stderr,
    '[pre-tool-use-enforce-linear-teams] Blocked: team FAC is not in LINEAR_ALLOWED_TEAMS=EPAC\n'
  );
});

test('allows all save_issue calls when LINEAR_ALLOWED_TEAMS is not set', () => {
  const result = runHook({
    tool_name: 'mcp__claude_ai_Linear__save_issue',
    tool_input: { title: 'Test issue', team: 'MCP' },
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
});

test('allows save_project and save_initiative when LINEAR_ALLOWED_TEAMS is set', () => {
  for (const toolName of ['mcp__claude_ai_Linear__save_project', 'mcp__claude_ai_Linear__save_initiative']) {
    const result = runHook(
      {
        tool_name: toolName,
        tool_input: { name: 'Test item', team: 'FAC' },
      },
      { LINEAR_ALLOWED_TEAMS: 'EPAC' }
    );

    assert.equal(result.status, 0, `${toolName}: ${result.stderr}`);
    assert.equal(result.stderr, '');
  }
});

test('allows non-Linear tool calls without inspecting tool_input', () => {
  const result = runHook(
    {
      tool_name: 'mcp__claude_ai_Linear__list_issues',
      tool_input: 'not an object',
    },
    { LINEAR_ALLOWED_TEAMS: 'EPAC' }
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
});

test('allows any non-save_issue tool name', () => {
  const result = runHook(
    {
      tool_name: 'mcp__x__save_document',
      tool_input: { team: 'FAC' },
    },
    { LINEAR_ALLOWED_TEAMS: 'EPAC' }
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
});

test('allows multi-team LINEAR_ALLOWED_TEAMS entries', () => {
  const result = runHook(
    {
      tool_name: 'mcp__claude_ai_Linear__save_issue',
      tool_input: { title: 'Test issue', team: 'AGENT' },
    },
    { LINEAR_ALLOWED_TEAMS: 'EPAC,AGENT' }
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
});

test('resolves lowercase team names and known team ids', () => {
  const byName = runHook(
    {
      tool_name: 'mcp__claude_ai_Linear__save_issue',
      tool_input: { title: 'Test issue', team: 'epac' },
    },
    { LINEAR_ALLOWED_TEAMS: 'EPAC' }
  );
  assert.equal(byName.status, 0, byName.stderr);

  const byId = runHook(
    {
      tool_name: 'mcp__claude_ai_Linear__save_issue',
      tool_input: { title: 'Test issue', teamId: '96468a5a-c0fe-4a4e-ac71-8281442b2184' },
    },
    { LINEAR_ALLOWED_TEAMS: 'FAC' }
  );
  assert.equal(byId.status, 0, byId.stderr);
});

test('fails open with warning when a restricted save_issue team cannot be resolved', () => {
  const result = runHook(
    {
      tool_name: 'mcp__claude_ai_Linear__save_issue',
      tool_input: { title: 'Test issue', teamId: '12345678-1234-1234-1234-123456789012' },
    },
    { LINEAR_ALLOWED_TEAMS: 'EPAC' }
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /could not resolve team/);
});

test('fails open when stdin cannot be parsed', () => {
  const result = spawnSync(process.execPath, [HOOK], {
    input: '{bad json',
    encoding: 'utf8',
    env: { ...process.env, LINEAR_ALLOWED_TEAMS: 'EPAC' },
  });

  assert.equal(result.status, 0);
  assert.match(result.stderr, /failed to parse stdin/);
});
