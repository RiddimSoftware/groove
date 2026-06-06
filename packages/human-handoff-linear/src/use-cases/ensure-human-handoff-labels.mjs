import {
  InvalidTeamSelectionError,
  UnknownLinearTeamError,
  hasLabelName,
  issueLabelSpec,
  labelEnsureResult,
  linearTeamRef,
} from '../labels.mjs';

/**
 * Ensure selected Linear teams each have the configured human handoff label.
 *
 * @param {object} input
 * @param {{
 *   listTeams: () => Promise<Array<{ id: string, key: string, name: string }>>,
 *   listLabels: (input: { teamId: string }) => Promise<Array<{ id: string, name: string, color?: string, description?: string }>>,
 *   createLabel: (input: { teamId: string, name: string, color: string, description: string }) => Promise<{ id: string, name: string, color?: string, description?: string }>,
 * }} input.workspace
 * @param {string[]} [input.teamRefs]
 * @param {boolean} [input.allTeams]
 * @param {boolean} [input.dryRun]
 * @param {{ name?: string, color?: string, description?: string }} [input.label]
 */
export async function ensureHumanHandoffLabels(input) {
  const {
    workspace,
    teamRefs = [],
    allTeams = false,
    dryRun = false,
    label: labelOverrides = {},
  } = input ?? {};

  if (workspace === null || workspace === undefined) {
    throw new TypeError('LinearWorkspace is required');
  }
  if (allTeams === true && teamRefs.length > 0) {
    throw new InvalidTeamSelectionError('Select explicit teams or all accessible teams, not both');
  }
  if (allTeams !== true && teamRefs.length === 0) {
    throw new InvalidTeamSelectionError('At least one Linear team is required');
  }

  const spec = issueLabelSpec(labelOverrides);
  const teams = allTeams === true
    ? await listAllTeams(workspace)
    : await resolveSelectedTeams(workspace, teamRefs);

  const results = [];
  for (const team of teams) {
    const labels = await workspace.listLabels({ teamId: team.id });
    const existing = labels.find((candidate) => hasLabelName(candidate, spec.name));
    if (existing !== undefined) {
      results.push(labelEnsureResult({ team, label: existing, status: 'exists', dryRun }));
      continue;
    }

    if (dryRun === true) {
      results.push(labelEnsureResult({ team, label: spec, status: 'would-create', dryRun: true }));
      continue;
    }

    const created = await workspace.createLabel({
      teamId: team.id,
      name: spec.name,
      color: spec.color,
      description: spec.description,
    });
    results.push(labelEnsureResult({ team, label: created, status: 'created', dryRun: false }));
  }
  return results;
}

async function listAllTeams(workspace) {
  const teams = await workspace.listTeams();
  return dedupeTeams(teams);
}

async function resolveSelectedTeams(workspace, rawRefs) {
  const refs = rawRefs.map(linearTeamRef);
  const teams = await workspace.listTeams();
  const byId = new Map(teams.map((team) => [team.id, team]));
  const byKey = new Map(teams.map((team) => [team.key.toLocaleLowerCase('en-US'), team]));
  const selected = [];

  for (const ref of refs) {
    const team = byId.get(ref) ?? byKey.get(ref.toLocaleLowerCase('en-US'));
    if (team === undefined) {
      throw new UnknownLinearTeamError(ref);
    }
    selected.push(team);
  }

  return dedupeTeams(selected);
}

function dedupeTeams(teams) {
  const byId = new Map();
  for (const team of teams) {
    if (!byId.has(team.id)) {
      byId.set(team.id, team);
    }
  }
  return [...byId.values()];
}
