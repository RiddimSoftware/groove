import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = resolve(__dirname, '..', 'bin', 'human-handoff-linear.mjs');

function runCli(args, env = {}) {
  return spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf8',
    env: { ...process.env, LINEAR_API_KEY: '', ...env },
  });
}

test('help output documents supported commands without requiring a Linear token', () => {
  const result = runCli(['--help']);

  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  assert.match(result.stdout, /human-handoff-linear - Linear Human Handoff workflow tools/);
  assert.match(result.stdout, /\bsetup\b/);
  assert.match(result.stdout, /\bsync-template\b/);
  assert.match(result.stdout, /\bdoctor\b/);
  assert.match(result.stdout, /\bbootstrap-project\b/);
  assert.match(result.stdout, /No Linear mutations are performed/);
});

test('unknown command fails explicitly without requiring a Linear token', () => {
  const result = runCli(['unknown-command']);

  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /Unknown command: unknown-command/);
  assert.match(result.stderr, /Run `human-handoff-linear --help` for usage|no mutations performed/);
});
