import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  UnknownLinearTeamError,
  ensureHumanHandoffLabels,
} from '../src/index.mjs';

const teams = [
  { id: 'team-grv', key: 'GRV', name: 'Groove' },
  { id: 'team-web', key: 'WEB', name: 'Web' },
  { id: 'team-agent', key: 'AGENT', name: 'Agents' },
];

function fakeWorkspace({ labelsByTeam = {} } = {}) {
  const created = [];
  return {
    created,
    async listTeams() {
      return teams;
    },
    async listLabels({ teamId }) {
      return labelsByTeam[teamId] ?? [];
    },
    async createLabel(input) {
      created.push(input);
      return {
        id: `label-${input.teamId}`,
        ...input,
      };
    },
  };
}

describe('EnsureHumanHandoffLabels', () => {
  it('detects an existing label case-insensitively and does not duplicate it', async () => {
    const workspace = fakeWorkspace({
      labelsByTeam: {
        'team-grv': [{ id: 'label-1', name: 'Human-Handoff', color: '#000000', description: '' }],
      },
    });

    const results = await ensureHumanHandoffLabels({ workspace, teamRefs: ['grv'] });

    assert.equal(results.length, 1);
    assert.equal(results[0].status, 'exists');
    assert.equal(results[0].label.id, 'label-1');
    assert.deepEqual(workspace.created, []);
  });

  it('creates a missing label with the documented defaults', async () => {
    const workspace = fakeWorkspace();

    const results = await ensureHumanHandoffLabels({ workspace, teamRefs: ['GRV'] });

    assert.equal(results[0].status, 'created');
    assert.deepEqual(workspace.created, [{
      teamId: 'team-grv',
      name: 'human-handoff',
      color: '#f59e0b',
      description: 'Marks the project issue where human-only blockers are tracked.',
    }]);
  });

  it('supports multiple explicit teams and de-duplicates repeated refs', async () => {
    const workspace = fakeWorkspace({
      labelsByTeam: {
        'team-web': [{ id: 'label-web', name: 'human-handoff', color: '#f59e0b' }],
      },
    });

    const results = await ensureHumanHandoffLabels({
      workspace,
      teamRefs: ['GRV', 'team-web', 'grv'],
    });

    assert.deepEqual(results.map((r) => [r.team.key, r.status]), [
      ['GRV', 'created'],
      ['WEB', 'exists'],
    ]);
    assert.deepEqual(workspace.created.map((input) => input.teamId), ['team-grv']);
  });

  it('supports all accessible teams through team enumeration', async () => {
    const workspace = fakeWorkspace({
      labelsByTeam: {
        'team-web': [{ id: 'label-web', name: 'human-handoff', color: '#f59e0b' }],
      },
    });

    const results = await ensureHumanHandoffLabels({ workspace, allTeams: true });

    assert.deepEqual(results.map((r) => [r.team.key, r.status]), [
      ['GRV', 'created'],
      ['WEB', 'exists'],
      ['AGENT', 'created'],
    ]);
    assert.deepEqual(workspace.created.map((input) => input.teamId), ['team-grv', 'team-agent']);
  });

  it('reports unknown selected teams without creating labels', async () => {
    const workspace = fakeWorkspace();

    await assert.rejects(
      () => ensureHumanHandoffLabels({ workspace, teamRefs: ['NOPE'] }),
      (err) => err instanceof UnknownLinearTeamError && err.ref === 'NOPE',
    );
    assert.deepEqual(workspace.created, []);
  });

  it('dry-run reports missing labels without creating them', async () => {
    const workspace = fakeWorkspace({
      labelsByTeam: {
        'team-web': [{ id: 'label-web', name: 'human-handoff', color: '#f59e0b' }],
      },
    });

    const results = await ensureHumanHandoffLabels({
      workspace,
      teamRefs: ['GRV', 'WEB'],
      dryRun: true,
    });

    assert.deepEqual(results.map((r) => [r.team.key, r.status, r.dryRun]), [
      ['GRV', 'would-create', true],
      ['WEB', 'exists', true],
    ]);
    assert.deepEqual(workspace.created, []);
  });
});
