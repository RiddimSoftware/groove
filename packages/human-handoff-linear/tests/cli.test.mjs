import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { runCli } from '../src/cli/run-cli.mjs';
import { LinearAuthError, LinearRateLimitError } from '../src/errors.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = resolve(__dirname, '..', 'bin', 'human-handoff-linear.mjs');

function runCliSpawn(args, env = {}) {
  return spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf8',
    env: { ...process.env, LINEAR_API_KEY: '', ...env },
  });
}

function captureStreams() {
  const stdout = { chunks: [], write(c) { stdout.chunks.push(c); } };
  const stderr = { chunks: [], write(c) { stderr.chunks.push(c); } };
  return { stdout, stderr, output: () => stdout.chunks.join(''), errors: () => stderr.chunks.join('') };
}

function fakeWorkspace({ getViewer } = {}) {
  return {
    describe: () => ({ connected: true }),
    getViewer: getViewer ?? (async () => ({
      viewer: { id: 'u', name: 'Ada', email: 'ada@example.com' },
      organization: { id: 'o', name: 'Riddim', urlKey: 'riddim' },
    })),
    listTeams: async () => [],
    listLabels: async () => [],
    createLabel: async () => { throw new Error('mutating call in doctor'); },
    getTemplate: async () => null,
    createTemplate: async () => { throw new Error('mutating call in doctor'); },
    updateTemplate: async () => { throw new Error('mutating call in doctor'); },
    createIssue: async () => { throw new Error('mutating call in doctor'); },
    createRelation: async () => { throw new Error('mutating call in doctor'); },
    syncHumanHandoffTemplate: async () => { throw new Error('mutating call in doctor'); },
    bootstrapHumanHandoffProject: async () => { throw new Error('mutating call in doctor'); },
  };
}

// --------- spawnSync black-box tests (existing scaffold behavior) ---------

test('help output documents supported commands without requiring a Linear token', () => {
  const result = runCliSpawn(['--help']);

  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  assert.match(result.stdout, /human-handoff-linear - Linear Human Handoff workflow tools/);
  assert.match(result.stdout, /\bsetup\b/);
  assert.match(result.stdout, /\bsync-template\b/);
  assert.match(result.stdout, /\bdoctor\b/);
  assert.match(result.stdout, /\bbootstrap-project\b/);
  assert.match(result.stdout, /No Linear mutations are performed/);
});

test('help output documents --no-prompt and the auth section', () => {
  const result = runCliSpawn(['--help']);
  assert.match(result.stdout, /--no-prompt/);
  assert.match(result.stdout, /LINEAR_API_KEY/);
});

test('unknown command fails explicitly without requiring a Linear token', () => {
  const result = runCliSpawn(['unknown-command']);

  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /Unknown command: unknown-command/);
  assert.match(result.stderr, /Run `human-handoff-linear --help` for usage|no mutations performed/);
});

test('doctor --no-prompt with no LINEAR_API_KEY exits with the missing-token exit code (2)', () => {
  const result = runCliSpawn(['doctor', '--no-prompt']);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /LINEAR_API_KEY is not set/);
});

// --------- in-process runCli tests with injected workspace ---------

test('doctor with a valid token reports success and exits 0', async () => {
  const { stdout, stderr, output } = captureStreams();
  const code = await runCli({
    argv: ['doctor', '--no-prompt'],
    env: { LINEAR_API_KEY: 'lin_fake' },
    stdout, stderr,
    workspaceFactory: () => fakeWorkspace(),
  });
  assert.equal(code, 0);
  assert.match(output(), /Authenticated as Ada/);
  assert.match(output(), /human-handoff-linear doctor complete/);
});

test('doctor: auth error exits with code 3 and prints actionable stderr', async () => {
  const { stdout, stderr, errors } = captureStreams();
  const code = await runCli({
    argv: ['doctor', '--no-prompt'],
    env: { LINEAR_API_KEY: 'lin_fake' },
    stdout, stderr,
    workspaceFactory: () => fakeWorkspace({
      getViewer: async () => { throw new LinearAuthError('rejected'); },
    }),
  });
  assert.equal(code, 3);
  assert.match(errors(), /\[auth\].*rejected/);
});

test('doctor: rate-limit error exits with code 5', async () => {
  const { stdout, stderr } = captureStreams();
  const code = await runCli({
    argv: ['doctor', '--no-prompt'],
    env: { LINEAR_API_KEY: 'lin_fake' },
    stdout, stderr,
    workspaceFactory: () => fakeWorkspace({
      getViewer: async () => { throw new LinearRateLimitError('slow down'); },
    }),
  });
  assert.equal(code, 5);
});

test('doctor: missing token without --no-prompt and no TTY surfaces as missing_token (exit 2)', async () => {
  const { stdout, stderr } = captureStreams();
  const code = await runCli({
    argv: ['doctor'],
    env: {},
    stdout, stderr,
    stdin: { isTTY: false },
    workspaceFactory: () => fakeWorkspace(),
  });
  assert.equal(code, 2);
});

test('setup still routes through the no-op workspace path and exits 0', async () => {
  const { stdout, stderr, output } = captureStreams();
  const code = await runCli({
    argv: ['setup'],
    env: {},
    stdout, stderr,
  });
  assert.equal(code, 0);
  assert.match(output(), /no mutations performed/);
});
