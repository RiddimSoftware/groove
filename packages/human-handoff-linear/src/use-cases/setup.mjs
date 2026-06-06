import { ensureHumanHandoffLabels } from './ensure-human-handoff-labels.mjs';
import { createSetupCommand } from '../values.mjs';

export function createSetupUseCase({ reporter, workspace }) {
  return async function setup(input = {}) {
    const command = createSetupCommand('setup', input);
    const label = {
      name: input.labelName,
      color: input.color,
      description: input.description,
    };

    reporter.info(`human-handoff-linear setup - ensuring human handoff labels${input.dryRun ? ' (dry run)' : ''}.`);

    const results = await ensureHumanHandoffLabels({
      workspace,
      teamRefs: input.teamRefs ?? [],
      allTeams: input.allTeams === true,
      dryRun: input.dryRun === true,
      label,
    });

    for (const result of results) {
      reporter.info(formatResult(result));
    }

    const summary = summarize(results);
    if (input.dryRun === true) {
      reporter.info(`dry run complete: ${summary.wouldCreate} would create, ${summary.exists} already present; no Linear changes made.`);
    } else {
      reporter.info(`setup complete: ${summary.created} created, ${summary.exists} already present.`);
    }

    return Object.freeze({
      command,
      results: Object.freeze(results),
      mutationsPerformed: summary.created,
    });
  };
}

function formatResult(result) {
  const team = `${result.team.key} (${result.team.name})`;
  if (result.status === 'exists') {
    return `already present: ${team} has "${result.label.name}" (${result.label.id})`;
  }
  if (result.status === 'would-create') {
    return `would create: ${team} would receive "${result.label.name}"`;
  }
  return `created: ${team} received "${result.label.name}" (${result.label.id})`;
}

function summarize(results) {
  return {
    exists: results.filter((r) => r.status === 'exists').length,
    created: results.filter((r) => r.status === 'created').length,
    wouldCreate: results.filter((r) => r.status === 'would-create').length,
  };
}
