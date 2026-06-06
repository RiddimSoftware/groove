import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import {
  createDoctorUseCase,
  createHumanHandoffTemplateBody,
  createSetupUseCase,
  createSyncTemplateUseCase,
  defineHumanHandoffLinearPackageContract,
} from '../src/index.mjs';

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

test('doctor use case treats missing Linear token as non-blocking for scaffold commands', async () => {
  const { reporter } = memoryReporter();
  const result = await createDoctorUseCase({
    reporter,
    secretReader: { read: () => undefined },
  })();

  assert.equal(result.tokenPresent, false);
  assert.deepEqual(result.checks.find((check) => check.name === 'linear-token'), {
    name: 'linear-token',
    ok: false,
    required: false,
  });
});

test('checked-in template satisfies the Human Handoff body value contract', async () => {
  const body = await readFile(resolve(__dirname, '..', 'templates', 'human-handoff-issue-body.md'), 'utf8');
  const template = createHumanHandoffTemplateBody(body);

  assert.match(template.body, /## Autonomous prep instructions/);
  assert.match(template.body, /## Anticipated human work/);
  assert.match(template.body, /## Discovered blockers/);
  assert.match(template.body, /## Verification checklist/);
});

test('sync-template use case validates the injected template without writing to Linear', async () => {
  const body = await readFile(resolve(__dirname, '..', 'templates', 'human-handoff-issue-body.md'), 'utf8');
  const { reporter } = memoryReporter();
  const result = await createSyncTemplateUseCase({
    reporter,
    templateBody: body,
    workspace: {},
  })();

  assert.equal(result.command.name, 'sync-template');
  assert.equal(result.mutationsPerformed, 0);
  assert.match(result.template.body, /hh-prepared/);
});
