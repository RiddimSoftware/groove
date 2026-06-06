/**
 * Tests for src/adapters/interactive-secret-reader.mjs.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createInteractiveSecretReader } from '../src/adapters/interactive-secret-reader.mjs';

test('read() returns env value when set', () => {
  const reader = createInteractiveSecretReader({ env: { LINEAR_API_KEY: 'lin_env_value' } });
  assert.equal(reader.read('LINEAR_API_KEY'), 'lin_env_value');
});

test('read() of an unset name returns null/undefined per the SecretReader port', () => {
  const reader = createInteractiveSecretReader({ env: {} });
  assert.ok(reader.read('LINEAR_API_KEY') == null);
});

test('readLinearApiKey returns the env var value when set', async () => {
  const reader = createInteractiveSecretReader({ env: { LINEAR_API_KEY: 'lin_env_value' } });
  assert.equal(await reader.readLinearApiKey(), 'lin_env_value');
});

test('readLinearApiKey trims whitespace from the env var value', async () => {
  const reader = createInteractiveSecretReader({ env: { LINEAR_API_KEY: '  lin_padded  \n' } });
  assert.equal(await reader.readLinearApiKey(), 'lin_padded');
});

test('readLinearApiKey returns null when env unset and interactive is disabled', async () => {
  const reader = createInteractiveSecretReader({ env: {} });
  assert.equal(await reader.readLinearApiKey({ interactive: false }), null);
});

test('readLinearApiKey returns null when env unset and stdin is not a TTY even with interactive=true', async () => {
  const reader = createInteractiveSecretReader({
    env: {},
    stdin: { isTTY: false },
    stdout: { write() {} },
  });
  assert.equal(await reader.readLinearApiKey({ interactive: true }), null);
});

test('readLinearApiKey falls back to hidden prompt when env is unset, interactive=true, and stdin is a TTY', async () => {
  let promptCalled = false;
  let promptText;
  const reader = createInteractiveSecretReader({
    env: {},
    stdin: { isTTY: true },
    stdout: { write() {} },
    hiddenPrompt: async ({ prompt }) => { promptCalled = true; promptText = prompt; return 'lin_from_prompt'; },
  });
  const key = await reader.readLinearApiKey({ interactive: true, prompt: 'My Linear key: ' });
  assert.equal(key, 'lin_from_prompt');
  assert.equal(promptCalled, true);
  assert.equal(promptText, 'My Linear key: ');
});

test('hidden prompt returning empty/whitespace string surfaces as null', async () => {
  const reader = createInteractiveSecretReader({
    env: {},
    stdin: { isTTY: true },
    stdout: { write() {} },
    hiddenPrompt: async () => '   ',
  });
  assert.equal(await reader.readLinearApiKey({ interactive: true }), null);
});

test('env var trumps the interactive prompt', async () => {
  let promptCalled = false;
  const reader = createInteractiveSecretReader({
    env: { LINEAR_API_KEY: 'lin_from_env' },
    stdin: { isTTY: true },
    stdout: { write() {} },
    hiddenPrompt: async () => { promptCalled = true; return 'unused'; },
  });
  assert.equal(await reader.readLinearApiKey({ interactive: true }), 'lin_from_env');
  assert.equal(promptCalled, false);
});
