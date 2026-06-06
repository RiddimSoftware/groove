import { createLinearTeamSelector, createSetupCommand } from '../values.mjs';

export function createBootstrapProjectUseCase({ reporter, workspace }) {
  return async function bootstrapProject(input = {}) {
    const command = createSetupCommand('bootstrap-project', input);
    const team = createLinearTeamSelector(input.team);

    reporter.info('human-handoff-linear bootstrap-project - reserved command surface');
    reporter.info('No Linear project bootstrap mutations are implemented in this scaffold.');

    if (workspace?.bootstrapHumanHandoffProject && input.dryRun === false) {
      throw new Error('Project bootstrap behavior is out of scope for this package contract scaffold.');
    }

    return Object.freeze({
      command,
      team,
      mutationsPerformed: 0,
    });
  };
}
