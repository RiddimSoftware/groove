import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { createSyncTemplateUseCase } from '../src/use-cases/sync-template.mjs';
import { LinearApiError, LinearAuthError } from '../src/errors.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = resolve(__dirname, '..', 'templates', 'human-handoff-issue-body.md');

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

function fakeWorkspace({ existingTemplate = null, createId = 'tpl_new', updateId = 'tpl_upd' } = {}) {
  const calls = { getTemplate: [], createTemplate: [], updateTemplate: [] };
  return {
    calls,
    async getTemplate(input) {
      calls.getTemplate.push(input);
      return existingTemplate;
    },
    async createTemplate(input) {
      calls.createTemplate.push(input);
      return { id: createId, name: input.name, description: input.description, type: input.type ?? 'issue', teamId: null };
    },
    async updateTemplate(input) {
      calls.updateTemplate.push(input);
      return { id: input.id ?? updateId, name: 'Human Handoff', description: input.description, type: 'issue', teamId: null };
    },
  };
}

async function loadBody() {
  return readFile(TEMPLATE_PATH, 'utf8');
}

test('sync-template creates the workspace template when none exists', async () => {
  const body = await loadBody();
  const { reporter, messages } = memoryReporter();
  const workspace = fakeWorkspace({ existingTemplate: null, createId: 'tpl_brand_new' });

  const result = await createSyncTemplateUseCase({ reporter, templateBody: body, workspace })();

  assert.equal(result.action, 'create');
  assert.equal(result.templateId, 'tpl_brand_new');
  assert.equal(result.mutationsPerformed, 1);
  assert.deepEqual(workspace.calls.getTemplate, [{ name: 'Human Handoff' }]);
  assert.equal(workspace.calls.createTemplate.length, 1);
  assert.equal(workspace.calls.createTemplate[0].name, 'Human Handoff');
  assert.equal(workspace.calls.createTemplate[0].description, body.trimEnd());
  assert.equal(workspace.calls.createTemplate[0].type, 'issue');
  assert.equal(workspace.calls.updateTemplate.length, 0);
  assert.ok(messages.some((m) => /Created workspace template/.test(m.message)));
});

test('sync-template updates the existing template when the body drifted', async () => {
  const body = await loadBody();
  const { reporter, messages } = memoryReporter();
  const workspace = fakeWorkspace({
    existingTemplate: { id: 'tpl_existing', name: 'Human Handoff', description: 'old body', type: 'issue', teamId: null },
  });

  const result = await createSyncTemplateUseCase({ reporter, templateBody: body, workspace })();

  assert.equal(result.action, 'update');
  assert.equal(result.templateId, 'tpl_existing');
  assert.equal(result.mutationsPerformed, 1);
  assert.equal(workspace.calls.updateTemplate.length, 1);
  assert.deepEqual(workspace.calls.updateTemplate[0], { id: 'tpl_existing', description: body.trimEnd() });
  assert.equal(workspace.calls.createTemplate.length, 0);
  assert.ok(messages.some((m) => /Updated workspace template/.test(m.message)));
});

test('sync-template reports no-change when the existing body already matches', async () => {
  const body = await loadBody();
  const { reporter, messages } = memoryReporter();
  const workspace = fakeWorkspace({
    existingTemplate: { id: 'tpl_existing', name: 'Human Handoff', description: body.trimEnd(), type: 'issue', teamId: null },
  });

  const result = await createSyncTemplateUseCase({ reporter, templateBody: body, workspace })();

  assert.equal(result.action, 'no-change');
  assert.equal(result.templateId, 'tpl_existing');
  assert.equal(result.mutationsPerformed, 0);
  assert.equal(workspace.calls.createTemplate.length, 0);
  assert.equal(workspace.calls.updateTemplate.length, 0);
  assert.ok(messages.some((m) => /No change/.test(m.message)));
});

test('sync-template is idempotent — a second run after a successful sync reports no-change', async () => {
  // Round-trip: simulate that the first sync wrote `body.trimEnd()` and a
  // later sync reads that exact body back, even if templateBody still has a
  // trailing newline. The use case normalizes via createHumanHandoffTemplateBody
  // (which trimEnds), so this is the realistic round-trip.
  const body = await loadBody();
  const { reporter } = memoryReporter();
  const workspace = fakeWorkspace({
    existingTemplate: { id: 'tpl_existing', name: 'Human Handoff', description: body.trimEnd(), type: 'issue', teamId: null },
  });

  await createSyncTemplateUseCase({ reporter, templateBody: body, workspace })();
  const second = await createSyncTemplateUseCase({ reporter, templateBody: body, workspace })();

  assert.equal(second.action, 'no-change');
  assert.equal(second.mutationsPerformed, 0);
});

test('sync-template --dry-run plans a create without calling createTemplate', async () => {
  const body = await loadBody();
  const { reporter, messages } = memoryReporter();
  const workspace = fakeWorkspace({ existingTemplate: null });

  const result = await createSyncTemplateUseCase({ reporter, templateBody: body, workspace })({ dryRun: true });

  assert.equal(result.action, 'create');
  assert.equal(result.templateId, null);
  assert.equal(result.mutationsPerformed, 0);
  assert.equal(workspace.calls.createTemplate.length, 0);
  assert.equal(workspace.calls.updateTemplate.length, 0);
  assert.ok(messages.some((m) => /\[dry-run\] Would create/.test(m.message)));
});

test('sync-template --dry-run plans an update without calling updateTemplate', async () => {
  const body = await loadBody();
  const { reporter, messages } = memoryReporter();
  const workspace = fakeWorkspace({
    existingTemplate: { id: 'tpl_existing', name: 'Human Handoff', description: 'old body', type: 'issue', teamId: null },
  });

  const result = await createSyncTemplateUseCase({ reporter, templateBody: body, workspace })({ dryRun: true });

  assert.equal(result.action, 'update');
  assert.equal(result.templateId, 'tpl_existing');
  assert.equal(result.mutationsPerformed, 0);
  assert.equal(workspace.calls.createTemplate.length, 0);
  assert.equal(workspace.calls.updateTemplate.length, 0);
  assert.ok(messages.some((m) => /\[dry-run\] Would update/.test(m.message)));
});

test('sync-template --dry-run reports no-change without mutations when already in sync', async () => {
  const body = await loadBody();
  const { reporter } = memoryReporter();
  const workspace = fakeWorkspace({
    existingTemplate: { id: 'tpl_existing', name: 'Human Handoff', description: body.trimEnd(), type: 'issue', teamId: null },
  });

  const result = await createSyncTemplateUseCase({ reporter, templateBody: body, workspace })({ dryRun: true });

  assert.equal(result.action, 'no-change');
  assert.equal(result.templateId, 'tpl_existing');
  assert.equal(result.mutationsPerformed, 0);
});

test('sync-template surfaces a Linear auth error from getTemplate', async () => {
  const body = await loadBody();
  const { reporter } = memoryReporter();
  const workspace = {
    async getTemplate() { throw new LinearAuthError('rejected'); },
    async createTemplate() { assert.fail('should not call createTemplate'); },
    async updateTemplate() { assert.fail('should not call updateTemplate'); },
  };
  await assert.rejects(
    () => createSyncTemplateUseCase({ reporter, templateBody: body, workspace })(),
    LinearAuthError,
  );
});

test('sync-template surfaces a Linear API error from createTemplate', async () => {
  const body = await loadBody();
  const { reporter } = memoryReporter();
  const workspace = {
    async getTemplate() { return null; },
    async createTemplate() { throw new LinearApiError('Linear refused to create template "Human Handoff".'); },
    async updateTemplate() { assert.fail('should not call updateTemplate'); },
  };
  await assert.rejects(
    () => createSyncTemplateUseCase({ reporter, templateBody: body, workspace })(),
    LinearApiError,
  );
});

test('sync-template surfaces a Linear API error from updateTemplate', async () => {
  const body = await loadBody();
  const { reporter } = memoryReporter();
  const workspace = {
    async getTemplate() {
      return { id: 'tpl_existing', name: 'Human Handoff', description: 'stale', type: 'issue', teamId: null };
    },
    async createTemplate() { assert.fail('should not call createTemplate'); },
    async updateTemplate() { throw new LinearApiError('Linear refused to update template tpl_existing.'); },
  };
  await assert.rejects(
    () => createSyncTemplateUseCase({ reporter, templateBody: body, workspace })(),
    LinearApiError,
  );
});

test('sync-template --dry-run does NOT call createTemplate even if it would fail', async () => {
  const body = await loadBody();
  const { reporter } = memoryReporter();
  const workspace = {
    async getTemplate() { return null; },
    async createTemplate() { throw new Error('would have failed'); },
    async updateTemplate() { throw new Error('would have failed'); },
  };
  const result = await createSyncTemplateUseCase({ reporter, templateBody: body, workspace })({ dryRun: true });
  assert.equal(result.action, 'create');
  assert.equal(result.mutationsPerformed, 0);
});

test('sync-template throws when the workspace port is missing getTemplate', async () => {
  const body = await loadBody();
  const { reporter } = memoryReporter();
  await assert.rejects(
    () => createSyncTemplateUseCase({ reporter, templateBody: body, workspace: {} })(),
    /getTemplate/,
  );
});

test('sync-template throws on a templateBody missing the required sections', async () => {
  const { reporter } = memoryReporter();
  await assert.rejects(
    () => createSyncTemplateUseCase({
      reporter,
      templateBody: '# unrelated\n\n## Anticipated human work\n',
      workspace: fakeWorkspace(),
    })(),
    /autonomous prep instructions/i,
  );
});

test('sync-template can be retargeted to a different template name via input', async () => {
  const body = await loadBody();
  const { reporter } = memoryReporter();
  const workspace = fakeWorkspace({ existingTemplate: null });

  const result = await createSyncTemplateUseCase({ reporter, templateBody: body, workspace })({ name: 'Custom HH' });

  assert.equal(result.action, 'create');
  assert.deepEqual(workspace.calls.getTemplate, [{ name: 'Custom HH' }]);
  assert.equal(workspace.calls.createTemplate[0].name, 'Custom HH');
});
