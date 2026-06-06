import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import {
  createDoctorUseCase,
  createHumanHandoffTemplateBody,
  createSetupUseCase,
  defineHumanHandoffLinearPackageContract,
} from '../src/index.mjs';
import { LinearAuthError, LinearPermissionError, LinearRateLimitError } from '../src/errors.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

function memoryReporter() {
  const messages = [];
  return {
    messages,
    reporter: {
      info(message) { messages.push({ level: 'info', message }); },
      error(message) { messages.push({ level: 'error', message }); },
    },
  };
}

function fakeWorkspace({ getViewer } = {}) {
  return {
    getViewer: getViewer ?? (async () => ({
      viewer: { id: 'u', name: 'Ada Lovelace' },
      organization: { id: 'o', name: 'Riddim', urlKey: 'riddim' },
    })),
    describe: () => ({ connected: true }),
    listTeams: async () => [],
    listLabels: async () => [],
    createLabel: async () => { throw new Error('doctor must not mutate'); },
    getTemplate: async () => null,
    createTemplate: async () => { throw new Error('doctor must not mutate'); },
    updateTemplate: async () => { throw new Error('doctor must not mutate'); },
    createIssue: async () => { throw new Error('doctor must not mutate'); },
    createRelation: async () => { throw new Error('doctor must not mutate'); },
  };
}

test('package contract exposes the CLI command and ports', () => {
  const contract = defineHumanHandoffLinearPackageContract();

  assert.equal(contract.commandName, 'human-handoff-linear');
  assert.deepEqual(contract.commands.map((command) => command.name), [
    'setup',
    'sync-template',
    'doctor',
    'bootstrap-project',
  ]);
  assert.ok(contract.ports.includes('LinearWorkspace'));
  assert.ok(contract.ports.includes('ConsoleReporter'));
  assert.ok(contract.ports.includes('SecretReader'));
});

test('package contract describes doctor as a Linear auth validator (not a local-only check)', () => {
  const contract = defineHumanHandoffLinearPackageContract();
  const doctor = contract.commands.find((c) => c.name === 'doctor');
  assert.match(doctor.summary, /validate.+Linear.+(token|viewer|auth)/i);
});

test('setup use case uses injected ports and performs no mutations', async () => {
  const { messages, reporter } = memoryReporter();
  const result = await createSetupUseCase({
    reporter,
    secretReader: { read: () => null },
    workspace: { describe: () => ({ connected: false }) },
  })({ team: 'GRV' });

  assert.equal(result.command.name, 'setup');
  assert.equal(result.team.teamKey, 'GRV');
  assert.equal(result.mutationsPerformed, 0);
  assert.match(messages.map((entry) => entry.message).join('\n'), /No Linear mutations/);
});

test('doctor: tokenRequired=false (scaffold opt-out) keeps the old non-blocking behavior', async () => {
  const { reporter } = memoryReporter();
  const result = await createDoctorUseCase({
    reporter,
    secretReader: { read: () => undefined },
  })({ tokenRequired: false });

  assert.equal(result.tokenPresent, false);
  assert.equal(result.ok, true, 'overall ok stays true when the only failing check is not required');
  const tokenCheck = result.checks.find((c) => c.name === 'linear-token');
  assert.equal(tokenCheck.ok, false);
  assert.equal(tokenCheck.required, false);
});

test('doctor (default): missing token is blocking and produces a missing_token error', async () => {
  const { reporter } = memoryReporter();
  const result = await createDoctorUseCase({
    reporter,
    secretReader: { read: () => null },
  })();

  assert.equal(result.tokenPresent, false);
  assert.equal(result.ok, false);
  const tokenCheck = result.checks.find((c) => c.name === 'linear-token');
  assert.equal(tokenCheck.required, true);
  assert.equal(tokenCheck.ok, false);
  assert.equal(tokenCheck.error.kind, 'missing_token');
});

test('doctor: with a valid token, calls getViewer through the workspace port and reports success', async () => {
  const seen = [];
  const ws = fakeWorkspace({
    getViewer: async () => {
      seen.push('getViewer');
      return {
        viewer: { id: 'usr_1', name: 'Ada Lovelace', email: 'ada@example.com' },
        organization: { id: 'org_1', name: 'Riddim', urlKey: 'riddim' },
      };
    },
  });
  const { reporter, messages } = memoryReporter();
  const result = await createDoctorUseCase({
    reporter,
    secretReader: { read: () => 'lin_fake_token' },
    workspaceFactory: () => ws,
  })();

  assert.equal(result.ok, true);
  assert.equal(result.tokenPresent, true);
  const viewerCheck = result.checks.find((c) => c.name === 'linear-viewer');
  assert.equal(viewerCheck.ok, true);
  assert.equal(viewerCheck.details.viewer.name, 'Ada Lovelace');
  assert.equal(viewerCheck.details.organization.urlKey, 'riddim');
  assert.deepEqual(seen, ['getViewer'], 'doctor must call exactly one read method');
  assert.ok(messages.some((m) => /Authenticated as Ada Lovelace/.test(m.message)));
});

test('doctor: workspaceFactory receives the resolved API key', async () => {
  const seenKeys = [];
  const ws = fakeWorkspace();
  const { reporter } = memoryReporter();
  await createDoctorUseCase({
    reporter,
    secretReader: { read: () => 'lin_token_xyz' },
    workspaceFactory: ({ apiKey }) => { seenKeys.push(apiKey); return ws; },
  })();
  assert.deepEqual(seenKeys, ['lin_token_xyz']);
});

test('doctor: Linear auth error from getViewer surfaces as failing linear-viewer check', async () => {
  const { reporter } = memoryReporter();
  const result = await createDoctorUseCase({
    reporter,
    secretReader: { read: () => 'lin_fake' },
    workspaceFactory: () => fakeWorkspace({
      getViewer: async () => { throw new LinearAuthError('rejected'); },
    }),
  })();

  assert.equal(result.ok, false);
  const viewerCheck = result.checks.find((c) => c.name === 'linear-viewer');
  assert.equal(viewerCheck.ok, false);
  assert.equal(viewerCheck.error.kind, 'auth');
  assert.match(viewerCheck.error.message, /rejected/);
});

test('doctor: maps permission, rate_limit, and unknown errors through the check', async () => {
  for (const ErrorCtor of [LinearPermissionError, LinearRateLimitError]) {
    const { reporter } = memoryReporter();
    const result = await createDoctorUseCase({
      reporter,
      secretReader: { read: () => 'lin_fake' },
      workspaceFactory: () => fakeWorkspace({
        getViewer: async () => { throw new ErrorCtor('boom'); },
      }),
    })();
    const viewerCheck = result.checks.find((c) => c.name === 'linear-viewer');
    assert.equal(result.ok, false);
    assert.ok(['permission', 'rate_limit'].includes(viewerCheck.error.kind));
  }
});

test('doctor: never invokes mutating workspace methods', async () => {
  const calls = [];
  const ws = {
    describe: () => { calls.push('describe'); return {}; },
    getViewer: async () => {
      return {
        viewer: { id: 'u', name: 'Ada' },
        organization: { id: 'o', name: 'Riddim', urlKey: 'riddim' },
      };
    },
    createLabel: async () => { calls.push('createLabel'); },
    createTemplate: async () => { calls.push('createTemplate'); },
    updateTemplate: async () => { calls.push('updateTemplate'); },
    createIssue: async () => { calls.push('createIssue'); },
    createRelation: async () => { calls.push('createRelation'); },
    syncHumanHandoffTemplate: async () => { calls.push('syncHumanHandoffTemplate'); },
    bootstrapHumanHandoffProject: async () => { calls.push('bootstrapHumanHandoffProject'); },
  };
  const { reporter } = memoryReporter();
  await createDoctorUseCase({
    reporter,
    secretReader: { read: () => 'lin_fake' },
    workspaceFactory: () => ws,
  })();
  for (const method of ['createLabel', 'createTemplate', 'updateTemplate', 'createIssue', 'createRelation', 'syncHumanHandoffTemplate', 'bootstrapHumanHandoffProject']) {
    assert.ok(!calls.includes(method), `doctor must not call ${method}`);
  }
});

test('doctor: missing getViewer on the workspace fails the linear-viewer check with an api error', async () => {
  const { reporter } = memoryReporter();
  const result = await createDoctorUseCase({
    reporter,
    secretReader: { read: () => 'lin_fake' },
    workspace: { describe: () => ({}) },
  })();
  const viewerCheck = result.checks.find((c) => c.name === 'linear-viewer');
  assert.equal(viewerCheck.ok, false);
  assert.equal(viewerCheck.error.kind, 'api');
  assert.equal(result.ok, false);
});

test('checked-in template satisfies the Human Handoff body value contract', async () => {
  const body = await readFile(resolve(__dirname, '..', 'templates', 'human-handoff-issue-body.md'), 'utf8');
  const template = createHumanHandoffTemplateBody(body);

  assert.match(template.body, /## Autonomous prep instructions/);
  assert.match(template.body, /## Anticipated human work/);
  assert.match(template.body, /## Discovered blockers/);
  assert.match(template.body, /## Verification checklist/);
});

// sync-template use-case behavior is covered in tests/sync-template.test.mjs.
// The scaffold-style test that previously lived here has been replaced by the
// full create / update / no-change / dry-run / API-failure suite over there.
