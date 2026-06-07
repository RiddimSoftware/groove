/**
 * Tests for src/adapters/linear-graphql-workspace.mjs.
 *
 * Every test injects a fake `fetch` and uses a synthetic API key string —
 * no real Linear API call is ever made.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  createLinearGraphqlWorkspace,
  LINEAR_GRAPHQL_ENDPOINT,
} from '../src/adapters/linear-graphql-workspace.mjs';
import {
  LinearAuthError,
  LinearPermissionError,
  LinearRateLimitError,
  LinearNetworkError,
  LinearApiError,
  MissingTokenError,
} from '../src/errors.mjs';

const FAKE_KEY = 'lin_api_fake_token_for_tests_only';

function jsonResponse(body, { status = 200, headers = {} } = {}) {
  const hdrs = new Map(Object.entries(headers));
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (name) => hdrs.get(String(name).toLowerCase()) ?? hdrs.get(name) ?? null },
    json: async () => body,
  };
}

function brokenJsonResponse({ status = 200 } = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: () => null },
    json: async () => { throw new SyntaxError('not json'); },
  };
}

function recordingFetch(responder) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init });
    return responder(url, init);
  };
  fn.calls = calls;
  return fn;
}

function assertUsesTeamObjectSelection(query) {
  const compact = query.replace(/\s+/g, ' ');
  assert.match(compact, /\bteam\s*\{\s*id\s*\}/, 'query should select team { id }');
  assert.doesNotMatch(
    compact,
    /\b(?:issueLabel|template|templates|nodes)\s*\{[^{}]*\bteamId\b/,
    'query should not select scalar teamId from IssueLabel or Template response objects',
  );
}

test('createLinearGraphqlWorkspace throws MissingTokenError when apiKey is empty', () => {
  assert.throws(() => createLinearGraphqlWorkspace({ apiKey: '', fetch: async () => jsonResponse({}) }), MissingTokenError);
  assert.throws(() => createLinearGraphqlWorkspace({ apiKey: undefined, fetch: async () => jsonResponse({}) }), MissingTokenError);
});

test('createLinearGraphqlWorkspace throws TypeError when no fetch is available', () => {
  assert.throws(
    () => createLinearGraphqlWorkspace({ apiKey: FAKE_KEY, fetch: null }),
    /requires a fetch implementation/,
  );
});

test('describe() returns the LinearWorkspace identity payload without calling fetch', () => {
  const fetch = recordingFetch(() => jsonResponse({}));
  const ws = createLinearGraphqlWorkspace({ apiKey: FAKE_KEY, fetch, endpoint: 'https://example.test/graphql' });
  const result = ws.describe();
  assert.equal(result.connected, true);
  assert.equal(result.mutationsPerformed, 0);
  assert.equal(result.endpoint, 'https://example.test/graphql');
  assert.equal(fetch.calls.length, 0);
});

test('getViewer issues a POST to the Linear GraphQL endpoint with the API key in the Authorization header', async () => {
  const fetch = recordingFetch(() => jsonResponse({
    data: {
      viewer: { id: 'usr_1', name: 'Ada Lovelace', email: 'ada@example.com' },
      organization: { id: 'org_1', name: 'Riddim', urlKey: 'riddim' },
    },
  }));
  const ws = createLinearGraphqlWorkspace({ apiKey: FAKE_KEY, fetch });
  const result = await ws.getViewer();

  assert.equal(fetch.calls.length, 1);
  assert.equal(fetch.calls[0].url, LINEAR_GRAPHQL_ENDPOINT);
  assert.equal(fetch.calls[0].init.method, 'POST');
  assert.equal(fetch.calls[0].init.headers.Authorization, FAKE_KEY);
  assert.equal(fetch.calls[0].init.headers['Content-Type'], 'application/json');
  const body = JSON.parse(fetch.calls[0].init.body);
  assert.match(body.query, /viewer/);
  assert.match(body.query, /organization/);

  assert.deepEqual(result, {
    viewer: { id: 'usr_1', name: 'Ada Lovelace', email: 'ada@example.com' },
    organization: { id: 'org_1', name: 'Riddim', urlKey: 'riddim' },
  });
});

test('getViewer surfaces missing payload as LinearApiError', async () => {
  const fetch = async () => jsonResponse({ data: { viewer: null, organization: null } });
  const ws = createLinearGraphqlWorkspace({ apiKey: FAKE_KEY, fetch });
  await assert.rejects(ws.getViewer(), LinearApiError);
});

test('HTTP 401 → LinearAuthError with actionable message', async () => {
  const fetch = async () => jsonResponse({ errors: [{ message: 'unauthorized' }] }, { status: 401 });
  const ws = createLinearGraphqlWorkspace({ apiKey: FAKE_KEY, fetch });
  await assert.rejects(ws.getViewer(), (err) => {
    assert.ok(err instanceof LinearAuthError);
    assert.equal(err.kind, 'auth');
    assert.match(err.message, /LINEAR_API_KEY/);
    return true;
  });
});

test('HTTP 403 → LinearPermissionError', async () => {
  const fetch = async () => jsonResponse({ errors: [{ message: 'forbidden' }] }, { status: 403 });
  const ws = createLinearGraphqlWorkspace({ apiKey: FAKE_KEY, fetch });
  await assert.rejects(ws.getViewer(), LinearPermissionError);
});

test('HTTP 429 → LinearRateLimitError including retry-after when present', async () => {
  const fetch = async () => jsonResponse(
    { errors: [{ message: 'too many' }] },
    { status: 429, headers: { 'retry-after': '17' } },
  );
  const ws = createLinearGraphqlWorkspace({ apiKey: FAKE_KEY, fetch });
  await assert.rejects(ws.getViewer(), (err) => {
    assert.ok(err instanceof LinearRateLimitError);
    assert.equal(err.kind, 'rate_limit');
    assert.match(err.message, /17s/);
    return true;
  });
});

test('network failure → LinearNetworkError carrying the underlying cause', async () => {
  const cause = new Error('socket hang up');
  const fetch = async () => { throw cause; };
  const ws = createLinearGraphqlWorkspace({ apiKey: FAKE_KEY, fetch });
  await assert.rejects(ws.getViewer(), (err) => {
    assert.ok(err instanceof LinearNetworkError);
    assert.equal(err.kind, 'network');
    assert.equal(err.cause, cause);
    return true;
  });
});

test('non-JSON response → LinearApiError', async () => {
  const fetch = async () => brokenJsonResponse({ status: 500 });
  const ws = createLinearGraphqlWorkspace({ apiKey: FAKE_KEY, fetch });
  await assert.rejects(ws.getViewer(), LinearApiError);
});

test('GraphQL authentication error → LinearAuthError', async () => {
  const fetch = async () => jsonResponse({
    errors: [{ message: 'Invalid auth', extensions: { code: 'AUTHENTICATION_ERROR' } }],
  });
  const ws = createLinearGraphqlWorkspace({ apiKey: FAKE_KEY, fetch });
  await assert.rejects(ws.getViewer(), LinearAuthError);
});

test('GraphQL permission error → LinearPermissionError', async () => {
  const fetch = async () => jsonResponse({
    errors: [{ message: 'Forbidden', extensions: { code: 'FORBIDDEN' } }],
  });
  const ws = createLinearGraphqlWorkspace({ apiKey: FAKE_KEY, fetch });
  await assert.rejects(ws.getViewer(), LinearPermissionError);
});

test('GraphQL ratelimited error → LinearRateLimitError', async () => {
  const fetch = async () => jsonResponse({
    errors: [{ message: 'slow down', extensions: { code: 'RATELIMITED' } }],
  });
  const ws = createLinearGraphqlWorkspace({ apiKey: FAKE_KEY, fetch });
  await assert.rejects(ws.getViewer(), LinearRateLimitError);
});

test('GraphQL untyped error → LinearApiError that includes the message', async () => {
  const fetch = async () => jsonResponse({
    errors: [{ message: 'something broke' }],
  });
  const ws = createLinearGraphqlWorkspace({ apiKey: FAKE_KEY, fetch });
  await assert.rejects(ws.getViewer(), (err) => {
    assert.ok(err instanceof LinearApiError);
    assert.equal(err.kind, 'api');
    assert.match(err.message, /something broke/);
    return true;
  });
});

test('listTeams returns normalized teams', async () => {
  const fetch = async () => jsonResponse({
    data: { teams: { nodes: [{ id: 't1', key: 'GRV', name: 'Groove' }] } },
  });
  const ws = createLinearGraphqlWorkspace({ apiKey: FAKE_KEY, fetch });
  assert.deepEqual(await ws.listTeams(), [{ id: 't1', key: 'GRV', name: 'Groove' }]);
});

test('listLabels passes the teamId variable to the GraphQL query', async () => {
  const fetch = recordingFetch(() => jsonResponse({
    data: { issueLabels: { nodes: [{ id: 'l1', name: 'foundation', color: '#fff', team: { id: 't1' }, description: null }] } },
  }));
  const ws = createLinearGraphqlWorkspace({ apiKey: FAKE_KEY, fetch });
  const labels = await ws.listLabels({ teamId: 't1' });
  const body = JSON.parse(fetch.calls[0].init.body);
  assert.equal(body.variables.teamId, 't1');
  assertUsesTeamObjectSelection(body.query);
  assert.equal(labels.length, 1);
  assert.equal(labels[0].name, 'foundation');
  assert.equal(labels[0].teamId, 't1');
});

test('createLabel posts the input and returns the created label', async () => {
  const fetch = recordingFetch(() => jsonResponse({
    data: { issueLabelCreate: { success: true, issueLabel: { id: 'l9', name: 'human-handoff', color: '#f00', team: { id: 't1' }, description: 'handoff' } } },
  }));
  const ws = createLinearGraphqlWorkspace({ apiKey: FAKE_KEY, fetch });
  const label = await ws.createLabel({ teamId: 't1', name: 'human-handoff', color: '#f00', description: 'handoff' });
  const body = JSON.parse(fetch.calls[0].init.body);
  assert.equal(body.variables.input.name, 'human-handoff');
  assert.equal(body.variables.input.teamId, 't1');
  assertUsesTeamObjectSelection(body.query);
  assert.equal(label.id, 'l9');
  assert.equal(label.teamId, 't1');
  assert.equal(label.description, 'handoff');
});

test('createLabel rejects without teamId or name', async () => {
  const ws = createLinearGraphqlWorkspace({ apiKey: FAKE_KEY, fetch: async () => jsonResponse({}) });
  await assert.rejects(ws.createLabel({ name: 'x' }), /teamId/);
  await assert.rejects(ws.createLabel({ teamId: 't1' }), /name/);
});

test('createLabel maps success:false → LinearApiError', async () => {
  const fetch = async () => jsonResponse({ data: { issueLabelCreate: { success: false, issueLabel: null } } });
  const ws = createLinearGraphqlWorkspace({ apiKey: FAKE_KEY, fetch });
  await assert.rejects(ws.createLabel({ teamId: 't1', name: 'x' }), LinearApiError);
});

test('getTemplate by id returns null when not found', async () => {
  const fetch = recordingFetch(() => jsonResponse({ data: { template: null } }));
  const ws = createLinearGraphqlWorkspace({ apiKey: FAKE_KEY, fetch });
  assert.equal(await ws.getTemplate({ id: 'missing' }), null);
  const body = JSON.parse(fetch.calls[0].init.body);
  assertUsesTeamObjectSelection(body.query);
});

test('getTemplate by teamId + name searches team templates', async () => {
  const fetch = recordingFetch(() => jsonResponse({
    data: { team: { templates: { nodes: [
      { id: 'tpl_a', name: 'Other', description: '', type: 'issue', team: { id: 't1' } },
      { id: 'tpl_b', name: 'Human Handoff', description: 'body', type: 'issue', team: { id: 't1' } },
    ] } } },
  }));
  const ws = createLinearGraphqlWorkspace({ apiKey: FAKE_KEY, fetch });
  const tpl = await ws.getTemplate({ teamId: 't1', name: 'Human Handoff' });
  const body = JSON.parse(fetch.calls[0].init.body);
  assert.equal(body.variables.teamId, 't1');
  assertUsesTeamObjectSelection(body.query);
  assert.deepEqual(tpl, { id: 'tpl_b', name: 'Human Handoff', description: 'body', type: 'issue', teamId: 't1' });
});

test('getTemplate without id/teamId+name throws TypeError', async () => {
  const ws = createLinearGraphqlWorkspace({ apiKey: FAKE_KEY, fetch: async () => jsonResponse({}) });
  await assert.rejects(ws.getTemplate({}), TypeError);
  await assert.rejects(ws.getTemplate({ teamId: 't1' }), TypeError);
});

test('getTemplate by name (no teamId) finds the workspace-level template', async () => {
  const fetch = recordingFetch(() => jsonResponse({
    data: { templates: [
      { id: 'tpl_a', name: 'Bug Report', description: '', type: 'issue', team: { id: 't1' } },
      { id: 'tpl_b', name: 'Human Handoff', description: 'body', type: 'issue', team: null },
      { id: 'tpl_c', name: 'Human Handoff', description: 'team body', type: 'issue', team: { id: 't1' } },
    ] },
  }));
  const ws = createLinearGraphqlWorkspace({ apiKey: FAKE_KEY, fetch });
  const tpl = await ws.getTemplate({ name: 'Human Handoff' });
  const body = JSON.parse(fetch.calls[0].init.body);
  assert.match(body.query, /templates/);
  assert.equal(body.variables ?? undefined, undefined);
  assertUsesTeamObjectSelection(body.query);
  assert.deepEqual(tpl, { id: 'tpl_b', name: 'Human Handoff', description: 'body', type: 'issue', teamId: null });
});

test('getTemplate by name returns null when no workspace template matches', async () => {
  const fetch = async () => jsonResponse({
    data: { templates: [
      { id: 'tpl_c', name: 'Human Handoff', description: '', type: 'issue', team: { id: 't1' } },
    ] },
  });
  const ws = createLinearGraphqlWorkspace({ apiKey: FAKE_KEY, fetch });
  assert.equal(await ws.getTemplate({ name: 'Human Handoff' }), null);
});

test('createTemplate without teamId creates a workspace-level template', async () => {
  const fetch = recordingFetch(() => jsonResponse({
    data: { templateCreate: { success: true, template: { id: 'tpl_w', name: 'Human Handoff', description: 'd', type: 'issue', team: null } } },
  }));
  const ws = createLinearGraphqlWorkspace({ apiKey: FAKE_KEY, fetch });
  const tpl = await ws.createTemplate({ name: 'Human Handoff', description: 'd' });
  const body = JSON.parse(fetch.calls[0].init.body);
  assert.equal(body.variables.input.name, 'Human Handoff');
  assert.equal(body.variables.input.teamId, undefined, 'teamId is omitted for workspace-level');
  assertUsesTeamObjectSelection(body.query);
  assert.equal(tpl.teamId, null);
});

test('createTemplate requires { name }', async () => {
  const ws = createLinearGraphqlWorkspace({ apiKey: FAKE_KEY, fetch: async () => jsonResponse({}) });
  await assert.rejects(ws.createTemplate({}), TypeError);
  await assert.rejects(ws.createTemplate({ teamId: 't1' }), TypeError);
});

test('createTemplate posts input and returns normalized template', async () => {
  const fetch = recordingFetch(() => jsonResponse({
    data: { templateCreate: { success: true, template: { id: 'tpl_new', name: 'Human Handoff', description: 'd', type: 'issue', team: { id: 't1' } } } },
  }));
  const ws = createLinearGraphqlWorkspace({ apiKey: FAKE_KEY, fetch });
  const tpl = await ws.createTemplate({ teamId: 't1', name: 'Human Handoff', description: 'd' });
  const body = JSON.parse(fetch.calls[0].init.body);
  assert.equal(body.variables.input.type, 'issue');
  assertUsesTeamObjectSelection(body.query);
  assert.equal(tpl.id, 'tpl_new');
  assert.equal(tpl.teamId, 't1');
});

test('updateTemplate posts only the supplied fields', async () => {
  const fetch = recordingFetch(() => jsonResponse({
    data: { templateUpdate: { success: true, template: { id: 'tpl_1', name: 'Human Handoff', description: 'next', type: 'issue', team: { id: 't1' } } } },
  }));
  const ws = createLinearGraphqlWorkspace({ apiKey: FAKE_KEY, fetch });
  await ws.updateTemplate({ id: 'tpl_1', description: 'next' });
  const body = JSON.parse(fetch.calls[0].init.body);
  assert.equal(body.variables.id, 'tpl_1');
  assert.deepEqual(body.variables.input, { description: 'next' });
  assertUsesTeamObjectSelection(body.query);
});

test('updateTemplate without id throws TypeError', async () => {
  const ws = createLinearGraphqlWorkspace({ apiKey: FAKE_KEY, fetch: async () => jsonResponse({}) });
  await assert.rejects(ws.updateTemplate({ description: 'x' }), TypeError);
});

test('createIssue posts input and returns the created issue', async () => {
  const fetch = recordingFetch(() => jsonResponse({
    data: { issueCreate: { success: true, issue: { id: 'iss_1', identifier: 'GRV-100', title: 'Handoff', url: 'https://linear.app/x/issue/GRV-100' } } },
  }));
  const ws = createLinearGraphqlWorkspace({ apiKey: FAKE_KEY, fetch });
  const issue = await ws.createIssue({ teamId: 't1', title: 'Handoff', description: 'd', labelIds: ['l1'] });
  const body = JSON.parse(fetch.calls[0].init.body);
  assert.equal(body.variables.input.title, 'Handoff');
  assert.deepEqual(body.variables.input.labelIds, ['l1']);
  assert.equal(issue.identifier, 'GRV-100');
});

test('createIssue without teamId or title throws TypeError', async () => {
  const ws = createLinearGraphqlWorkspace({ apiKey: FAKE_KEY, fetch: async () => jsonResponse({}) });
  await assert.rejects(ws.createIssue({ title: 'x' }), TypeError);
  await assert.rejects(ws.createIssue({ teamId: 't1' }), TypeError);
});

test('createRelation posts and returns the created relation', async () => {
  const fetch = recordingFetch(() => jsonResponse({
    data: { issueRelationCreate: { success: true, issueRelation: { id: 'rel_1', type: 'related', issueId: 'a', relatedIssueId: 'b' } } },
  }));
  const ws = createLinearGraphqlWorkspace({ apiKey: FAKE_KEY, fetch });
  const rel = await ws.createRelation({ issueId: 'a', relatedIssueId: 'b' });
  const body = JSON.parse(fetch.calls[0].init.body);
  assert.equal(body.variables.input.type, 'related');
  assert.equal(rel.id, 'rel_1');
});

test('createRelation requires both ids', async () => {
  const ws = createLinearGraphqlWorkspace({ apiKey: FAKE_KEY, fetch: async () => jsonResponse({}) });
  await assert.rejects(ws.createRelation({ relatedIssueId: 'b' }), TypeError);
  await assert.rejects(ws.createRelation({ issueId: 'a' }), TypeError);
});

test('mutations never log or echo the API key', async () => {
  const fetch = recordingFetch(() => jsonResponse({
    data: { issueCreate: { success: true, issue: { id: 'iss_1', identifier: 'GRV-1', title: 't', url: 'u' } } },
  }));
  const ws = createLinearGraphqlWorkspace({ apiKey: FAKE_KEY, fetch });
  await ws.createIssue({ teamId: 't1', title: 't' });
  const { init } = fetch.calls[0];
  assert.ok(!init.body.includes(FAKE_KEY), 'API key must not appear in request body');
});

test('getProject by id returns null when not found', async () => {
  const fetch = async () => jsonResponse({ data: { project: null } });
  const ws = createLinearGraphqlWorkspace({ apiKey: FAKE_KEY, fetch });
  assert.equal(await ws.getProject({ id: 'missing' }), null);
});

test('getProject returns id/name/slugId/teamIds', async () => {
  const fetch = recordingFetch(() => jsonResponse({
    data: { project: {
      id: 'prj_1', name: 'Bootstrap demo', slugId: 'bootstrap-demo',
      teams: { nodes: [{ id: 'team_a' }, { id: 'team_b' }] },
    } },
  }));
  const ws = createLinearGraphqlWorkspace({ apiKey: FAKE_KEY, fetch });
  const project = await ws.getProject({ id: 'prj_1' });
  const body = JSON.parse(fetch.calls[0].init.body);
  assert.equal(body.variables.id, 'prj_1');
  assert.match(body.query, /project\(id: \$id\)/);
  assert.deepEqual(project, {
    id: 'prj_1', name: 'Bootstrap demo', slugId: 'bootstrap-demo', teamIds: ['team_a', 'team_b'],
  });
});

test('getProject requires id', async () => {
  const ws = createLinearGraphqlWorkspace({ apiKey: FAKE_KEY, fetch: async () => jsonResponse({}) });
  await assert.rejects(ws.getProject({}), TypeError);
});

test('listProjectIssues returns issues with their labels', async () => {
  const fetch = recordingFetch(() => jsonResponse({
    data: { project: { id: 'prj_1', issues: { nodes: [
      { id: 'iss_a', identifier: 'GRV-10', title: 'A',
        labels: { nodes: [{ id: 'lab_1', name: 'human-handoff' }] } },
      { id: 'iss_b', identifier: 'GRV-11', title: 'B',
        labels: { nodes: [] } },
    ] } } },
  }));
  const ws = createLinearGraphqlWorkspace({ apiKey: FAKE_KEY, fetch });
  const issues = await ws.listProjectIssues({ projectId: 'prj_1' });
  const body = JSON.parse(fetch.calls[0].init.body);
  assert.equal(body.variables.projectId, 'prj_1');
  assert.equal(issues.length, 2);
  assert.equal(issues[0].labels[0].name, 'human-handoff');
  assert.deepEqual(issues[1].labels, []);
});

test('listProjectIssues requires projectId', async () => {
  const ws = createLinearGraphqlWorkspace({ apiKey: FAKE_KEY, fetch: async () => jsonResponse({}) });
  await assert.rejects(ws.listProjectIssues({}), TypeError);
});

test('listIssueRelations merges relations and inverseRelations, de-duping by id', async () => {
  const fetch = recordingFetch(() => jsonResponse({
    data: { issue: {
      id: 'iss_hh',
      relations: { nodes: [
        { id: 'rel_1', type: 'blocks', issue: { id: 'iss_x' }, relatedIssue: { id: 'iss_hh' } },
      ] },
      inverseRelations: { nodes: [
        { id: 'rel_1', type: 'blocks', issue: { id: 'iss_x' }, relatedIssue: { id: 'iss_hh' } },
        { id: 'rel_2', type: 'blocks', issue: { id: 'iss_y' }, relatedIssue: { id: 'iss_hh' } },
      ] },
    } },
  }));
  const ws = createLinearGraphqlWorkspace({ apiKey: FAKE_KEY, fetch });
  const rels = await ws.listIssueRelations({ issueId: 'iss_hh' });
  const body = JSON.parse(fetch.calls[0].init.body);
  assert.equal(body.variables.issueId, 'iss_hh');
  assert.equal(rels.length, 2);
  assert.deepEqual(new Set(rels.map((r) => r.id)), new Set(['rel_1', 'rel_2']));
  for (const r of rels) {
    assert.equal(r.type, 'blocks');
    assert.equal(r.relatedIssueId, 'iss_hh');
  }
});

test('listIssueRelations requires issueId', async () => {
  const ws = createLinearGraphqlWorkspace({ apiKey: FAKE_KEY, fetch: async () => jsonResponse({}) });
  await assert.rejects(ws.listIssueRelations({}), TypeError);
});

test('listWorkflowStates returns each state with id/name/type/position', async () => {
  const fetch = recordingFetch(() => jsonResponse({
    data: { team: { id: 't1', states: { nodes: [
      { id: 's_b', name: 'Backlog', type: 'backlog', position: 0 },
      { id: 's_t', name: 'Todo', type: 'unstarted', position: 1 },
    ] } } },
  }));
  const ws = createLinearGraphqlWorkspace({ apiKey: FAKE_KEY, fetch });
  const states = await ws.listWorkflowStates({ teamId: 't1' });
  const body = JSON.parse(fetch.calls[0].init.body);
  assert.equal(body.variables.teamId, 't1');
  assert.equal(states.length, 2);
  assert.equal(states[0].type, 'backlog');
});

test('listWorkflowStates requires teamId', async () => {
  const ws = createLinearGraphqlWorkspace({ apiKey: FAKE_KEY, fetch: async () => jsonResponse({}) });
  await assert.rejects(ws.listWorkflowStates({}), TypeError);
});

test('createIssue forwards stateId when provided', async () => {
  const fetch = recordingFetch(() => jsonResponse({
    data: { issueCreate: { success: true, issue: { id: 'iss_1', identifier: 'GRV-99', title: 'HH', url: 'u' } } },
  }));
  const ws = createLinearGraphqlWorkspace({ apiKey: FAKE_KEY, fetch });
  await ws.createIssue({ teamId: 't1', title: 'HH', projectId: 'p1', stateId: 'state_backlog' });
  const body = JSON.parse(fetch.calls[0].init.body);
  assert.equal(body.variables.input.stateId, 'state_backlog');
  assert.equal(body.variables.input.projectId, 'p1');
});

test('syncHumanHandoffTemplate is not yet implemented and raises an actionable error', async () => {
  const ws = createLinearGraphqlWorkspace({ apiKey: FAKE_KEY, fetch: async () => jsonResponse({}) });
  await assert.rejects(ws.syncHumanHandoffTemplate({ body: 'x' }), LinearApiError);
});

test('bootstrapHumanHandoffProject is not yet implemented and raises an actionable error', async () => {
  const ws = createLinearGraphqlWorkspace({ apiKey: FAKE_KEY, fetch: async () => jsonResponse({}) });
  await assert.rejects(ws.bootstrapHumanHandoffProject({}), LinearApiError);
});
