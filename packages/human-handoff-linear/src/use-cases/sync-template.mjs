import { createHumanHandoffTemplateBody, createSetupCommand } from '../values.mjs';

/**
 * SyncHumanHandoffTemplate — create / update the workspace-level Linear issue
 * template named `Human Handoff`, idempotently.
 *
 * Pure application policy: depends only on the injected `LinearWorkspace`
 * port and on the desired body string. No HTTP, no filesystem, no GraphQL.
 *
 * Input shape:
 *   - `dryRun`  (default `false`): when `true`, compute the plan and skip
 *      every Linear write mutation. `--dry-run` from the CLI ends up here.
 *   - `name`    (default `'Human Handoff'`): the template name to sync.
 *
 * Output shape:
 *   - `command`            — the resolved SetupCommand record (carries `dryRun`).
 *   - `action`             — `'create' | 'update' | 'no-change'`.
 *   - `template.body`      — the validated body that was/would be synced.
 *   - `templateId`         — Linear template id when known (`null` on dry-run create).
 *   - `mutationsPerformed` — `0 | 1`; always `0` on dry-run or no-change.
 *
 * Adapter contract: the `workspace` port must implement `getTemplate({ name })`,
 * `createTemplate({ name, description, type })`, and
 * `updateTemplate({ id, description })` against workspace-level templates.
 */
export function createSyncTemplateUseCase({ reporter, templateBody, workspace }) {
  return async function syncTemplate(input = {}) {
    const command = createSetupCommand('sync-template', input);
    const template = createHumanHandoffTemplateBody(templateBody);
    const name = input.name ?? 'Human Handoff';
    const dryRun = input.dryRun === true;

    requirePortMethod(workspace, 'getTemplate', 'sync-template');

    reporter.info(`human-handoff-linear sync-template - syncing "${name}" workspace template`);

    const existing = await workspace.getTemplate({ name });

    if (existing === null || existing === undefined) {
      return runCreate({ name, body: template.body, workspace, reporter, command, template, dryRun });
    }
    if (existing.description === template.body) {
      reporter.info(`No change - workspace template "${name}" already matches (id: ${existing.id})`);
      return Object.freeze({
        command,
        action: 'no-change',
        template,
        templateId: existing.id,
        mutationsPerformed: 0,
      });
    }
    return runUpdate({ existing, name, body: template.body, workspace, reporter, command, template, dryRun });
  };
}

async function runCreate({ name, body, workspace, reporter, command, template, dryRun }) {
  if (dryRun) {
    reporter.info(`[dry-run] Would create workspace template "${name}"`);
    return Object.freeze({ command, action: 'create', template, templateId: null, mutationsPerformed: 0 });
  }
  requirePortMethod(workspace, 'createTemplate', 'sync-template');
  const created = await workspace.createTemplate({ name, description: body, type: 'issue' });
  reporter.info(`Created workspace template "${name}" (id: ${created.id})`);
  return Object.freeze({ command, action: 'create', template, templateId: created.id, mutationsPerformed: 1 });
}

async function runUpdate({ existing, name, body, workspace, reporter, command, template, dryRun }) {
  if (dryRun) {
    reporter.info(`[dry-run] Would update workspace template "${name}" (id: ${existing.id})`);
    return Object.freeze({ command, action: 'update', template, templateId: existing.id, mutationsPerformed: 0 });
  }
  requirePortMethod(workspace, 'updateTemplate', 'sync-template');
  const updated = await workspace.updateTemplate({ id: existing.id, description: body });
  reporter.info(`Updated workspace template "${name}" (id: ${updated.id})`);
  return Object.freeze({ command, action: 'update', template, templateId: updated.id, mutationsPerformed: 1 });
}

function requirePortMethod(workspace, method, useCase) {
  if (workspace === null || workspace === undefined || typeof workspace[method] !== 'function') {
    throw new TypeError(`${useCase} requires a LinearWorkspace port with a ${method}() method`);
  }
}
