/**
 * Linear adapter implementing the `LinearEstimateSource` port consumed by the
 * `EnrichUsageWithEstimate` use case (`enrich.mjs`).
 *
 * This is the ONLY module in the package that talks to Linear. The enrichment
 * core depends on the port, not on this adapter, so the core stays key-free and
 * tracker-agnostic. The API token is read from an injected option or the
 * `LINEAR_API_TOKEN` environment variable — it is never hardcoded, logged, or
 * written to any usage record (spec §8).
 *
 * Tests inject a fake source instead of this adapter; there are no live Linear
 * calls in CI.
 */

const LINEAR_GRAPHQL_ENDPOINT = 'https://api.linear.app/graphql';

// Linear caps `first` at 250; one (teamKey, number) filter matches at most one
// issue, so a chunk of this size returns in a single page with no pagination.
const DEFAULT_CHUNK_SIZE = 100;

const IDENTIFIER_PATTERN = /^([A-Za-z][A-Za-z0-9]*)-(\d+)$/;

const ESTIMATES_QUERY = `query IssueEstimates($filter: IssueFilter, $first: Int) {
  issues(filter: $filter, first: $first) {
    nodes { identifier estimate }
  }
}`;

/**
 * Split `"EPAC-1999"` into `{ teamKey: "EPAC", number: 1999 }`, or `null` if it
 * isn't a `<TEAM>-<NUMBER>` identifier.
 *
 * @param {string} identifier
 */
function parseIdentifier(identifier) {
  const match = IDENTIFIER_PATTERN.exec(identifier);
  if (match === null) return null;
  return { teamKey: match[1], number: Number(match[2]) };
}

function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/**
 * Create a `LinearEstimateSource` backed by Linear's GraphQL API.
 *
 * @param {object} [options]
 * @param {string} [options.token]      Linear API token. Defaults to `process.env.LINEAR_API_TOKEN`.
 * @param {string} [options.endpoint]   GraphQL endpoint. Defaults to Linear's production endpoint.
 * @param {typeof fetch} [options.fetch] Fetch implementation. Defaults to the global `fetch`.
 * @param {number} [options.chunkSize]  Max identifiers per GraphQL request.
 * @returns {{ resolveEstimates: (issueIdentifiers: string[]) => Promise<Map<string, number|null>> }}
 */
export function createLinearEstimateSource(options = {}) {
  const token = options.token ?? process.env.LINEAR_API_TOKEN;
  if (typeof token !== 'string' || token === '') {
    throw new Error(
      'createLinearEstimateSource: a Linear API token is required (pass options.token or set LINEAR_API_TOKEN)',
    );
  }
  const endpoint = options.endpoint ?? LINEAR_GRAPHQL_ENDPOINT;
  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new TypeError('createLinearEstimateSource: no fetch implementation available');
  }
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;

  async function fetchChunk(parsed) {
    const filter = {
      or: parsed.map(({ teamKey, number }) => ({
        team: { key: { eq: teamKey } },
        number: { eq: number },
      })),
    };
    const res = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: token,
      },
      body: JSON.stringify({
        query: ESTIMATES_QUERY,
        variables: { filter, first: parsed.length },
      }),
    });
    if (!res.ok) {
      throw new Error(`Linear API request failed: HTTP ${res.status}`);
    }
    const json = await res.json();
    if (json.errors) {
      throw new Error(`Linear API returned errors: ${JSON.stringify(json.errors)}`);
    }
    return json?.data?.issues?.nodes ?? [];
  }

  return {
    /**
     * Resolve each distinct identifier to a non-negative integer estimate, or
     * `null` when the issue has no estimate or no longer resolves. Identifiers
     * are de-duplicated by the caller; this method assumes they are distinct.
     */
    async resolveEstimates(issueIdentifiers) {
      const result = new Map();
      const parsed = [];
      for (const id of issueIdentifiers) {
        const p = parseIdentifier(id);
        if (p === null) {
          result.set(id, null); // unparseable → unresolved
        } else {
          parsed.push({ id, ...p });
        }
      }

      for (const group of chunk(parsed, chunkSize)) {
        const nodes = await fetchChunk(group);
        const byIdentifier = new Map(nodes.map((n) => [n.identifier, n.estimate]));
        for (const { id } of group) {
          const estimate = byIdentifier.has(id) ? byIdentifier.get(id) : null;
          result.set(id, estimate ?? null);
        }
      }

      return result;
    },
  };
}
