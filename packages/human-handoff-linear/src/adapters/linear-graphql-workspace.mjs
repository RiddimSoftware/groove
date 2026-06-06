/**
 * LinearGraphqlWorkspace — concrete LinearWorkspace adapter backed by the
 * Linear GraphQL HTTP API.
 *
 * Implements every method on the LinearWorkspace port (see ../ports.mjs):
 *   describe                       — port-required identity payload (no network call)
 *   getViewer                      — used by ValidateLinearSetupAuth / `doctor`
 *   listTeams                      — for later template / label install
 *   listLabels, createLabel        — for the label-install command
 *   getTemplate, createTemplate,
 *   updateTemplate                 — for sync-template
 *   createIssue, createRelation    — for bootstrap-project
 *   syncHumanHandoffTemplate,
 *   bootstrapHumanHandoffProject   — port-required higher-level hooks, deferred
 *                                    to later issues; throw a typed error today
 *                                    so callers cannot silently no-op.
 *
 * Tests inject `fetch` so no real Linear API token is ever required.
 */

import {
  LinearAuthError,
  LinearPermissionError,
  LinearRateLimitError,
  LinearNetworkError,
  LinearApiError,
  MissingTokenError,
} from '../errors.mjs';

export const LINEAR_GRAPHQL_ENDPOINT = 'https://api.linear.app/graphql';

/**
 * @param {object} opts
 * @param {string} opts.apiKey   Linear personal API key (never logged).
 * @param {typeof fetch} [opts.fetch] Injected fetch — defaults to global fetch.
 * @param {string} [opts.endpoint] GraphQL endpoint override (for tests/mocks).
 * @returns {import('../ports.mjs').LinearWorkspace}
 */
export function createLinearGraphqlWorkspace({
  apiKey,
  fetch: fetchImpl = globalThis.fetch,
  endpoint = LINEAR_GRAPHQL_ENDPOINT,
} = {}) {
  if (!apiKey) throw new MissingTokenError();
  if (typeof fetchImpl !== 'function') {
    throw new TypeError('createLinearGraphqlWorkspace requires a fetch implementation.');
  }

  async function graphql(query, variables) {
    let response;
    try {
      response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: apiKey,
        },
        body: JSON.stringify({ query, variables }),
      });
    } catch (cause) {
      throw new LinearNetworkError(`Could not reach the Linear API: ${cause?.message ?? cause}.`, { cause });
    }

    if (response.status === 401) {
      throw new LinearAuthError('Linear API rejected the API key (HTTP 401). Check that LINEAR_API_KEY is valid.');
    }
    if (response.status === 403) {
      throw new LinearPermissionError('Linear API returned HTTP 403: the API key is valid but missing a required scope.');
    }
    if (response.status === 429) {
      const retryAfter = response.headers?.get?.('retry-after');
      const detail = retryAfter ? ` Retry after ${retryAfter}s.` : '';
      throw new LinearRateLimitError(`Linear API rate limit hit (HTTP 429).${detail}`);
    }

    let json;
    try {
      json = await response.json();
    } catch (cause) {
      throw new LinearApiError(`Linear API returned a non-JSON response (HTTP ${response.status}).`, { cause });
    }

    if (!response.ok) {
      const msg = extractErrorMessage(json) ?? `Linear API responded with HTTP ${response.status}.`;
      throw new LinearApiError(`Linear API error (HTTP ${response.status}): ${msg}`);
    }

    if (Array.isArray(json?.errors) && json.errors.length > 0) {
      throw classifyGraphqlErrors(json.errors);
    }

    return json?.data ?? null;
  }

  return Object.freeze({
    describe() {
      return Object.freeze({ connected: true, mutationsPerformed: 0, endpoint });
    },

    async getViewer() {
      const data = await graphql(
        `query Viewer {
          viewer { id name email }
          organization { id name urlKey }
        }`,
      );
      if (!data?.viewer || !data?.organization) {
        throw new LinearApiError('Linear API returned no viewer/organization payload.');
      }
      return {
        viewer: {
          id: data.viewer.id,
          name: data.viewer.name,
          email: data.viewer.email,
        },
        organization: {
          id: data.organization.id,
          name: data.organization.name,
          urlKey: data.organization.urlKey,
        },
      };
    },

    async listTeams() {
      const data = await graphql(`query Teams { teams(first: 100) { nodes { id key name } } }`);
      return data?.teams?.nodes?.map((t) => ({ id: t.id, key: t.key, name: t.name })) ?? [];
    },

    async listLabels({ teamId } = {}) {
      const data = await graphql(
        `query Labels($teamId: ID) {
          issueLabels(first: 250, filter: { team: { id: { eq: $teamId } } }) {
            nodes { id name color teamId description }
          }
        }`,
        { teamId: teamId ?? null },
      );
      return data?.issueLabels?.nodes?.map((l) => ({
        id: l.id,
        name: l.name,
        color: l.color,
        teamId: l.teamId,
        description: l.description ?? null,
      })) ?? [];
    },

    async createLabel({ teamId, name, color, description } = {}) {
      if (!teamId) throw new TypeError('createLabel requires { teamId }.');
      if (!name) throw new TypeError('createLabel requires { name }.');
      const data = await graphql(
        `mutation CreateLabel($input: IssueLabelCreateInput!) {
          issueLabelCreate(input: $input) {
            success
            issueLabel { id name color teamId description }
          }
        }`,
        { input: { teamId, name, color, description } },
      );
      const result = data?.issueLabelCreate;
      if (!result?.success || !result.issueLabel) {
        throw new LinearApiError(`Linear refused to create label "${name}".`);
      }
      return {
        id: result.issueLabel.id,
        name: result.issueLabel.name,
        color: result.issueLabel.color,
        teamId: result.issueLabel.teamId,
        description: result.issueLabel.description ?? null,
      };
    },

    async getTemplate({ id, teamId, name } = {}) {
      if (id) {
        const data = await graphql(
          `query Template($id: String!) {
            template(id: $id) { id name description type teamId }
          }`,
          { id },
        );
        return data?.template ? normalizeTemplate(data.template) : null;
      }
      if (!teamId || !name) {
        throw new TypeError('getTemplate requires { id } or { teamId, name }.');
      }
      const data = await graphql(
        `query TeamTemplates($teamId: String!) {
          team(id: $teamId) {
            templates { nodes { id name description type teamId } }
          }
        }`,
        { teamId },
      );
      const nodes = data?.team?.templates?.nodes ?? [];
      const match = nodes.find((n) => n.name === name);
      return match ? normalizeTemplate(match) : null;
    },

    async createTemplate({ teamId, name, description, type = 'issue' } = {}) {
      if (!teamId) throw new TypeError('createTemplate requires { teamId }.');
      if (!name) throw new TypeError('createTemplate requires { name }.');
      const data = await graphql(
        `mutation CreateTemplate($input: TemplateCreateInput!) {
          templateCreate(input: $input) {
            success
            template { id name description type teamId }
          }
        }`,
        { input: { teamId, name, description, type } },
      );
      const result = data?.templateCreate;
      if (!result?.success || !result.template) {
        throw new LinearApiError(`Linear refused to create template "${name}".`);
      }
      return normalizeTemplate(result.template);
    },

    async updateTemplate({ id, name, description } = {}) {
      if (!id) throw new TypeError('updateTemplate requires { id }.');
      const input = {};
      if (name !== undefined) input.name = name;
      if (description !== undefined) input.description = description;
      const data = await graphql(
        `mutation UpdateTemplate($id: String!, $input: TemplateUpdateInput!) {
          templateUpdate(id: $id, input: $input) {
            success
            template { id name description type teamId }
          }
        }`,
        { id, input },
      );
      const result = data?.templateUpdate;
      if (!result?.success || !result.template) {
        throw new LinearApiError(`Linear refused to update template ${id}.`);
      }
      return normalizeTemplate(result.template);
    },

    async createIssue({ teamId, title, description, labelIds, templateId, projectId } = {}) {
      if (!teamId) throw new TypeError('createIssue requires { teamId }.');
      if (!title) throw new TypeError('createIssue requires { title }.');
      const input = { teamId, title };
      if (description !== undefined) input.description = description;
      if (labelIds) input.labelIds = labelIds;
      if (templateId) input.templateId = templateId;
      if (projectId) input.projectId = projectId;
      const data = await graphql(
        `mutation CreateIssue($input: IssueCreateInput!) {
          issueCreate(input: $input) {
            success
            issue { id identifier title url }
          }
        }`,
        { input },
      );
      const result = data?.issueCreate;
      if (!result?.success || !result.issue) {
        throw new LinearApiError(`Linear refused to create issue "${title}".`);
      }
      return {
        id: result.issue.id,
        identifier: result.issue.identifier,
        title: result.issue.title,
        url: result.issue.url,
      };
    },

    async createRelation({ issueId, relatedIssueId, type = 'related' } = {}) {
      if (!issueId) throw new TypeError('createRelation requires { issueId }.');
      if (!relatedIssueId) throw new TypeError('createRelation requires { relatedIssueId }.');
      const data = await graphql(
        `mutation CreateRelation($input: IssueRelationCreateInput!) {
          issueRelationCreate(input: $input) {
            success
            issueRelation { id type issueId relatedIssueId }
          }
        }`,
        { input: { issueId, relatedIssueId, type } },
      );
      const result = data?.issueRelationCreate;
      if (!result?.success || !result.issueRelation) {
        throw new LinearApiError(`Linear refused to create relation between ${issueId} and ${relatedIssueId}.`);
      }
      return {
        id: result.issueRelation.id,
        type: result.issueRelation.type,
        issueId: result.issueRelation.issueId,
        relatedIssueId: result.issueRelation.relatedIssueId,
      };
    },

    async syncHumanHandoffTemplate(_input) {
      throw new LinearApiError(
        'syncHumanHandoffTemplate is not yet implemented. Compose getTemplate / createTemplate / updateTemplate explicitly.',
      );
    },

    async bootstrapHumanHandoffProject(_input) {
      throw new LinearApiError(
        'bootstrapHumanHandoffProject is not yet implemented. Compose createIssue / createRelation explicitly.',
      );
    },
  });
}

function normalizeTemplate(t) {
  return {
    id: t.id,
    name: t.name,
    description: t.description ?? null,
    type: t.type,
    teamId: t.teamId,
  };
}

function extractErrorMessage(json) {
  if (!json) return null;
  if (Array.isArray(json.errors) && json.errors.length > 0) {
    return json.errors.map((e) => e?.message).filter(Boolean).join('; ');
  }
  if (typeof json.error === 'string') return json.error;
  if (typeof json.message === 'string') return json.message;
  return null;
}

function classifyGraphqlErrors(errors) {
  const summary = errors.map((e) => e?.message).filter(Boolean).join('; ') || 'Linear API returned a GraphQL error.';
  for (const err of errors) {
    const ext = err?.extensions ?? {};
    const code = String(ext.code ?? ext.type ?? '').toLowerCase();
    const userError = String(ext.userError ?? '').toLowerCase();
    if (code.includes('authentication') || code === 'unauthenticated' || userError.includes('authentication')) {
      return new LinearAuthError(`Linear API authentication error: ${summary}`);
    }
    if (code.includes('forbidden') || code.includes('permission')) {
      return new LinearPermissionError(`Linear API permission error: ${summary}`);
    }
    if (code.includes('ratelimited') || code.includes('rate_limit') || code.includes('rate-limit')) {
      return new LinearRateLimitError(`Linear API rate-limit error: ${summary}`);
    }
  }
  return new LinearApiError(`Linear API error: ${summary}`);
}
