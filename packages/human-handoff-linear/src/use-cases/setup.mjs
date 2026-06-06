import { createLinearTeamSelector, createSetupCommand } from '../values.mjs';

export function createSetupUseCase({ reporter, secretReader, workspace }) {
  return async function setup(input = {}) {
    const command = createSetupCommand('setup', input);
    const team = createLinearTeamSelector(input.team);
    const token = await secretReader.read('LINEAR_API_KEY');

    reporter.info('human-handoff-linear setup - validating package contract');
    reporter.info('No Linear mutations will be performed by this scaffold.');

    if (token) {
      reporter.info('Linear token: present');
    } else {
      reporter.info('Linear token: not set; future mutation commands will require LINEAR_API_KEY.');
    }

    if (workspace?.describe) await workspace.describe();

    return Object.freeze({
      command,
      team,
      mutationsPerformed: 0,
      tokenPresent: Boolean(token),
    });
  };
}
