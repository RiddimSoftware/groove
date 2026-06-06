import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import {
  BLOCKS_RELATION_TYPE,
  HUMAN_HANDOFF_LABEL_NAME,
  HUMAN_HANDOFF_TEMPLATE_NAME,
  createBootstrapProjectUseCase,
  createHumanHandoffIssueSpec,
  createIssueRelationPlan,
  createLinearProjectRef,
  humanHandoffIssueTitle,
} from '../src/index.mjs';

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

function fakeWorkspace(state = {}) {
  const project = state.project ?? {
    id: 'prj_1',
    name: 'Bootstrap demo',
    slugId: 'bootstrap-demo',
    teamIds: ['team_grv'],
  };
  const teams = state.teams ?? [{ id: 'team_grv', key: 'GRV', name: 'Groove' }];
  const labels = state.labels ?? [
    { id: 'lab_hh', name: HUMAN_HANDOFF_LABEL_NAME, teamId: project.teamIds[0] },
  ];
  const template = state.template === null
    ? null
    : (state.template ?? { id: 'tpl_hh', name: HUMAN_HANDOFF_TEMPLATE_NAME, teamId: project.teamIds[0] });
  const issues = state.issues ?? [];
  const relations = state.relations ?? [];
  const workflowStates = state.workflowStates ?? [
    { id: 'state_backlog', name: 'Backlog', type: 'backlog', position: 0 },
    { id: 'state_todo', name: 'Todo', type: 'unstarted', position: 1 },
  ];
  const created = { issues: [], relations: [] };

  let nextIssueSerial = 100 + issues.length;

  return {
    state: { project, teams, labels, template, issues, relations, created },
    ws: {
      async getProject({ id }) {
        if (id === project.id || id === project.slugId) return project;
        return null;
      },
      async listTeams() { return teams; },
      async listLabels({ teamId } = {}) {
        if (!teamId) return labels;
        return labels.filter((l) => !l.teamId || l.teamId === teamId);
      },
      async getTemplate({ teamId, name } = {}) {
        if (!template) return null;
        if (template.teamId && teamId && template.teamId !== teamId) return null;
        if (name && template.name !== name) return null;
        return template;
      },
      async listProjectIssues({ projectId }) {
        if (projectId !== project.id) return [];
        return issues.map((issue) => ({
          ...issue,
          labels: (issue.labels ?? []).map((l) => ({ ...l })),
        }));
      },
      async listIssueRelations({ issueId }) {
        return relations.filter((r) => r.issueId === issueId || r.relatedIssueId === issueId);
      },
      async listWorkflowStates({ teamId }) {
        if (teamId !== project.teamIds[0]) return [];
        return workflowStates;
      },
      async createIssue(input) {
        nextIssueSerial += 1;
        const identifier = `${teams[0].key}-${nextIssueSerial}`;
        const issue = {
          id: `iss_${nextIssueSerial}`,
          identifier,
          title: input.title,
          url: `https://linear.app/x/issue/${identifier}`,
        };
        created.issues.push({ input, issue });
        return issue;
      },
      async createRelation(input) {
        const rel = {
          id: `rel_${created.relations.length + 1}`,
          type: input.type ?? 'related',
          issueId: input.issueId,
          relatedIssueId: input.relatedIssueId,
        };
        created.relations.push({ input, rel });
        relations.push(rel);
        return rel;
      },
    },
  };
}

async function loadTemplateBody() {
  return readFile(TEMPLATE_PATH, 'utf8');
}

test('value object: LinearProjectRef rejects empty inputs', () => {
  assert.throws(() => createLinearProjectRef(''), TypeError);
  assert.throws(() => createLinearProjectRef('   '), TypeError);
  assert.throws(() => createLinearProjectRef(null), TypeError);
  const ref = createLinearProjectRef('  prj_abc  ');
  assert.equal(ref.value, 'prj_abc');
});

test('value object: HumanHandoffIssueSpec carries no estimate and a single hh label', async () => {
  const body = await loadTemplateBody();
  const spec = createHumanHandoffIssueSpec({
    projectId: 'prj_1',
    projectName: 'Bootstrap demo',
    teamId: 'team_1',
    labelId: 'lab_hh',
    templateId: 'tpl_hh',
    body,
  });
  assert.equal(spec.title, 'Human handoff for Bootstrap demo');
  assert.deepEqual([...spec.labelIds], ['lab_hh']);
  assert.equal(spec.estimate, null);
});

test('value object: HumanHandoffIssueSpec requires projectId/projectName/teamId/labelId/body', () => {
  assert.throws(() => createHumanHandoffIssueSpec({ projectName: 'p', teamId: 't', labelId: 'l', body: 'b' }), TypeError);
  assert.throws(() => createHumanHandoffIssueSpec({ projectId: 'p', teamId: 't', labelId: 'l', body: 'b' }), TypeError);
  assert.throws(() => createHumanHandoffIssueSpec({ projectId: 'p', projectName: 'P', labelId: 'l', body: 'b' }), TypeError);
  assert.throws(() => createHumanHandoffIssueSpec({ projectId: 'p', projectName: 'P', teamId: 't', body: 'b' }), TypeError);
  assert.throws(() => createHumanHandoffIssueSpec({ projectId: 'p', projectName: 'P', teamId: 't', labelId: 'l' }), TypeError);
});

test('value object: IssueRelationPlan defaults to "blocks" and stores blocker→blocked direction', () => {
  const plan = createIssueRelationPlan({ blockerIssueId: 'iss_sib', blockedIssueId: 'iss_hh' });
  assert.equal(plan.type, BLOCKS_RELATION_TYPE);
  assert.equal(plan.issueId, 'iss_sib');
  assert.equal(plan.relatedIssueId, 'iss_hh');
});

test('use case requires --project', async () => {
  const body = await loadTemplateBody();
  const { ws } = fakeWorkspace();
  const { reporter } = memoryReporter();
  await assert.rejects(
    createBootstrapProjectUseCase({ reporter, workspace: ws, templateBody: body })({}),
    TypeError,
  );
});

test('use case requires a template body', async () => {
  const { ws } = fakeWorkspace();
  const { reporter } = memoryReporter();
  await assert.rejects(
    createBootstrapProjectUseCase({ reporter, workspace: ws, templateBody: '' })({ project: 'prj_1' }),
    TypeError,
  );
});

test('use case fails when the project is not found', async () => {
  const body = await loadTemplateBody();
  const { ws } = fakeWorkspace();
  const { reporter } = memoryReporter();
  await assert.rejects(
    createBootstrapProjectUseCase({ reporter, workspace: ws, templateBody: body })({ project: 'prj_missing' }),
    /Linear project not found/,
  );
});

test('use case fails when the human-handoff label is missing', async () => {
  const body = await loadTemplateBody();
  const { ws } = fakeWorkspace({ labels: [] });
  const { reporter } = memoryReporter();
  await assert.rejects(
    createBootstrapProjectUseCase({ reporter, workspace: ws, templateBody: body })({ project: 'prj_1' }),
    /Label "human-handoff" is not installed/,
  );
});

test('use case fails when the Human Handoff template is missing', async () => {
  const body = await loadTemplateBody();
  const { ws } = fakeWorkspace({ template: null });
  const { reporter } = memoryReporter();
  await assert.rejects(
    createBootstrapProjectUseCase({ reporter, workspace: ws, templateBody: body })({ project: 'prj_1' }),
    /Template "Human Handoff" is not installed/,
  );
});

test('apply on an empty project creates the HH issue and zero relations', async () => {
  const body = await loadTemplateBody();
  const fake = fakeWorkspace({ issues: [] });
  const { reporter } = memoryReporter();
  const result = await createBootstrapProjectUseCase({ reporter, workspace: fake.ws, templateBody: body })({
    project: 'prj_1',
    dryRun: false,
  });

  assert.equal(result.humanHandoff.decision, 'create');
  assert.equal(result.humanHandoff.issue.title, humanHandoffIssueTitle('Bootstrap demo'));
  assert.equal(fake.state.created.issues.length, 1);
  const createdInput = fake.state.created.issues[0].input;
  assert.equal(createdInput.teamId, 'team_grv');
  assert.deepEqual(createdInput.labelIds, ['lab_hh']);
  assert.equal(createdInput.templateId, 'tpl_hh');
  assert.equal(createdInput.projectId, 'prj_1');
  assert.equal(createdInput.stateId, 'state_backlog');
  assert.equal(fake.state.created.relations.length, 0);
  assert.equal(result.relations.created.length, 0);
  assert.equal(result.mutationsPerformed, 1);
});

test('apply on a project with siblings creates HH issue and one blocks relation per sibling', async () => {
  const body = await loadTemplateBody();
  const fake = fakeWorkspace({
    issues: [
      { id: 'iss_a', identifier: 'GRV-10', title: 'Sib A', labels: [{ id: 'lab_other', name: 'feature' }] },
      { id: 'iss_b', identifier: 'GRV-11', title: 'Sib B', labels: [] },
    ],
  });
  const { reporter, messages } = memoryReporter();
  const result = await createBootstrapProjectUseCase({ reporter, workspace: fake.ws, templateBody: body })({
    project: 'prj_1',
    dryRun: false,
  });

  assert.equal(result.humanHandoff.decision, 'create');
  assert.equal(fake.state.created.issues.length, 1);
  assert.equal(fake.state.created.relations.length, 2);
  for (const { input } of fake.state.created.relations) {
    assert.equal(input.type, BLOCKS_RELATION_TYPE);
    assert.equal(input.relatedIssueId, result.humanHandoff.issue.id);
  }
  assert.deepEqual(
    fake.state.created.relations.map(({ input }) => input.issueId).sort(),
    ['iss_a', 'iss_b'],
  );
  assert.equal(result.relations.created.length, 2);
  assert.equal(result.relations.skipped.length, 0);
  assert.equal(result.mutationsPerformed, 3);
  assert.ok(messages.some((m) => /will create blocks GRV-10/.test(m.message)));
});

test('idempotent: re-running reuses the existing HH issue (label-identified) and creates no duplicates', async () => {
  const body = await loadTemplateBody();
  const existingHH = {
    id: 'iss_hh',
    identifier: 'GRV-99',
    title: humanHandoffIssueTitle('Bootstrap demo'),
    labels: [{ id: 'lab_hh', name: HUMAN_HANDOFF_LABEL_NAME }],
  };
  const fake = fakeWorkspace({
    issues: [
      { id: 'iss_a', identifier: 'GRV-10', title: 'Sib A', labels: [] },
      existingHH,
    ],
    relations: [
      { id: 'rel_existing', type: BLOCKS_RELATION_TYPE, issueId: 'iss_a', relatedIssueId: 'iss_hh' },
    ],
  });
  const { reporter } = memoryReporter();
  const result = await createBootstrapProjectUseCase({ reporter, workspace: fake.ws, templateBody: body })({
    project: 'prj_1',
    dryRun: false,
  });

  assert.equal(result.humanHandoff.decision, 'reuse');
  assert.equal(result.humanHandoff.issue.id, 'iss_hh');
  assert.equal(fake.state.created.issues.length, 0, 'must not create a duplicate HH issue');
  assert.equal(fake.state.created.relations.length, 0, 'must not duplicate the existing relation');
  assert.equal(result.relations.skipped.length, 1);
  assert.equal(result.relations.skipped[0].id, 'iss_a');
  assert.equal(result.mutationsPerformed, 0);
});

test('idempotent: re-running with a new sibling wires only the missing blocks relation', async () => {
  const body = await loadTemplateBody();
  const existingHH = {
    id: 'iss_hh',
    identifier: 'GRV-99',
    title: humanHandoffIssueTitle('Bootstrap demo'),
    labels: [{ id: 'lab_hh', name: HUMAN_HANDOFF_LABEL_NAME }],
  };
  const fake = fakeWorkspace({
    issues: [
      { id: 'iss_a', identifier: 'GRV-10', title: 'Sib A', labels: [] },
      { id: 'iss_b', identifier: 'GRV-11', title: 'Sib B (new)', labels: [] },
      existingHH,
    ],
    relations: [
      { id: 'rel_existing', type: BLOCKS_RELATION_TYPE, issueId: 'iss_a', relatedIssueId: 'iss_hh' },
    ],
  });
  const { reporter } = memoryReporter();
  const result = await createBootstrapProjectUseCase({ reporter, workspace: fake.ws, templateBody: body })({
    project: 'prj_1',
    dryRun: false,
  });

  assert.equal(result.humanHandoff.decision, 'reuse');
  assert.equal(fake.state.created.relations.length, 1);
  assert.equal(fake.state.created.relations[0].input.issueId, 'iss_b');
  assert.equal(fake.state.created.relations[0].input.relatedIssueId, 'iss_hh');
  assert.equal(result.relations.skipped.length, 1);
  assert.equal(result.relations.created.length, 1);
});

test('dry-run reports the HH decision and every planned relation without mutating', async () => {
  const body = await loadTemplateBody();
  const fake = fakeWorkspace({
    issues: [
      { id: 'iss_a', identifier: 'GRV-10', title: 'Sib A', labels: [] },
      { id: 'iss_b', identifier: 'GRV-11', title: 'Sib B', labels: [] },
    ],
  });
  const { reporter, messages } = memoryReporter();
  const result = await createBootstrapProjectUseCase({ reporter, workspace: fake.ws, templateBody: body })({
    project: 'prj_1',
  });

  assert.equal(result.dryRun, true);
  assert.equal(result.humanHandoff.decision, 'create');
  assert.equal(result.humanHandoff.issue, null);
  assert.ok(result.humanHandoff.spec, 'dry-run carries the spec it would create');
  assert.equal(result.humanHandoff.spec.title, humanHandoffIssueTitle('Bootstrap demo'));
  assert.equal(result.relations.planned.length, 2);
  for (const rel of result.relations.planned) {
    assert.equal(rel.action, 'plan');
  }
  assert.equal(fake.state.created.issues.length, 0);
  assert.equal(fake.state.created.relations.length, 0);
  assert.equal(result.mutationsPerformed, 0);

  const messageText = messages.map((m) => m.message).join('\n');
  assert.match(messageText, /will plan Human Handoff issue/);
  assert.match(messageText, /will plan blocks GRV-10/);
  assert.match(messageText, /will plan blocks GRV-11/);
  assert.match(messageText, /dry-run/);
});

test('dry-run on an idempotent re-run reports skips and creates no mutations', async () => {
  const body = await loadTemplateBody();
  const existingHH = {
    id: 'iss_hh',
    identifier: 'GRV-99',
    title: humanHandoffIssueTitle('Bootstrap demo'),
    labels: [{ id: 'lab_hh', name: HUMAN_HANDOFF_LABEL_NAME }],
  };
  const fake = fakeWorkspace({
    issues: [
      { id: 'iss_a', identifier: 'GRV-10', title: 'Sib A', labels: [] },
      existingHH,
    ],
    relations: [
      { id: 'rel_existing', type: BLOCKS_RELATION_TYPE, issueId: 'iss_a', relatedIssueId: 'iss_hh' },
    ],
  });
  const { reporter, messages } = memoryReporter();
  const result = await createBootstrapProjectUseCase({ reporter, workspace: fake.ws, templateBody: body })({
    project: 'prj_1',
  });

  assert.equal(result.humanHandoff.decision, 'reuse');
  assert.equal(result.relations.skipped.length, 1);
  assert.equal(result.relations.planned.length, 1);
  assert.equal(result.relations.planned[0].action, 'skip');
  assert.equal(fake.state.created.issues.length, 0);
  assert.equal(fake.state.created.relations.length, 0);
  const messageText = messages.map((m) => m.message).join('\n');
  assert.match(messageText, /already blocks GRV-99 - skipping/);
});

test('falls back to "unstarted" workflow state when no backlog state exists', async () => {
  const body = await loadTemplateBody();
  const fake = fakeWorkspace({
    workflowStates: [
      { id: 'state_todo', name: 'Todo', type: 'unstarted', position: 0 },
      { id: 'state_in_progress', name: 'In Progress', type: 'started', position: 1 },
    ],
  });
  const { reporter } = memoryReporter();
  const result = await createBootstrapProjectUseCase({ reporter, workspace: fake.ws, templateBody: body })({
    project: 'prj_1',
    dryRun: false,
  });
  assert.equal(fake.state.created.issues.length, 1);
  assert.equal(fake.state.created.issues[0].input.stateId, 'state_todo');
  assert.ok(result.humanHandoff.issue);
});

test('rejects when --team is needed (project spans multiple teams) but not provided', async () => {
  const body = await loadTemplateBody();
  const fake = fakeWorkspace({
    project: { id: 'prj_1', name: 'Multi', slugId: 'multi', teamIds: ['team_grv', 'team_other'] },
    teams: [
      { id: 'team_grv', key: 'GRV', name: 'Groove' },
      { id: 'team_other', key: 'OTH', name: 'Other' },
    ],
  });
  const { reporter } = memoryReporter();
  await assert.rejects(
    createBootstrapProjectUseCase({ reporter, workspace: fake.ws, templateBody: body })({ project: 'prj_1' }),
    /spans 2 teams/,
  );
});

test('explicit --team picks that team for the HH issue', async () => {
  const body = await loadTemplateBody();
  const fake = fakeWorkspace({
    project: { id: 'prj_1', name: 'Multi', slugId: 'multi', teamIds: ['team_grv', 'team_other'] },
    teams: [
      { id: 'team_grv', key: 'GRV', name: 'Groove' },
      { id: 'team_other', key: 'OTH', name: 'Other' },
    ],
    labels: [{ id: 'lab_hh', name: HUMAN_HANDOFF_LABEL_NAME, teamId: 'team_other' }],
    template: { id: 'tpl_hh', name: HUMAN_HANDOFF_TEMPLATE_NAME, teamId: 'team_other' },
    workflowStates: [],
  });
  const { reporter } = memoryReporter();
  const result = await createBootstrapProjectUseCase({ reporter, workspace: fake.ws, templateBody: body })({
    project: 'prj_1',
    team: 'OTH',
    dryRun: false,
  });
  assert.equal(result.team.key, 'OTH');
  assert.equal(fake.state.created.issues[0].input.teamId, 'team_other');
});

test('rejects when --project is missing in input', async () => {
  const body = await loadTemplateBody();
  const fake = fakeWorkspace();
  const { reporter } = memoryReporter();
  await assert.rejects(
    createBootstrapProjectUseCase({ reporter, workspace: fake.ws, templateBody: body })({ project: '' }),
    TypeError,
  );
});
