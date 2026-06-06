import { createHumanHandoffTemplateBody, createSetupCommand } from '../values.mjs';

export function createSyncTemplateUseCase({ reporter, templateBody, workspace }) {
  return async function syncTemplate(input = {}) {
    const command = createSetupCommand('sync-template', input);
    const template = createHumanHandoffTemplateBody(templateBody);

    reporter.info('human-handoff-linear sync-template - validating checked-in template');
    reporter.info('No Linear template write will be performed by this scaffold.');

    if (workspace?.syncHumanHandoffTemplate && input.dryRun === false) {
      throw new Error('Real Linear template sync is out of scope for this package contract scaffold.');
    }

    return Object.freeze({
      command,
      template,
      mutationsPerformed: 0,
    });
  };
}
