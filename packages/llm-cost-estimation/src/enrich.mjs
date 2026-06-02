/**
 * `EnrichUsageWithEstimate` use case.
 *
 * A pure transform: given cost-only usage records (as defined by the Symphony
 * Coding-Agent Cost Telemetry Extension) and a `LinearEstimateSource` port,
 * stamp each record with its issue's story-point `estimate` (spec §5.2).
 *
 * Boundary rule: this module MUST NOT import any Linear SDK or HTTP client. It
 * depends only on the injected port so the estimation core stays key-free and
 * tracker-agnostic — mirroring how `llm-cost-attribution` stays key-free.
 *
 * The port contract:
 *
 *   source.resolveEstimates(issueIdentifiers: string[])
 *     => Map<string, number|null> | Record<string, number|null>
 *        (or a Promise of one)
 *
 *   Resolve each distinct identifier to a non-negative integer estimate, or to
 *   `null` (or omit the key) when the issue has no estimate or no longer
 *   resolves. The core de-duplicates identifiers before calling, so the source
 *   sees at most one lookup per issue.
 */

/**
 * True for a spec-valid `estimate`: a non-negative integer (spec §5.2,
 * "integer ≥ 0"). `0` is a real estimate value, so it passes — only `null`,
 * `undefined`, fractional, or negative values are rejected.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidEstimate(value) {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/**
 * Look up an estimate for an identifier from whatever the source returned. The
 * source MAY return a `Map` or a plain object; absent keys and non-own
 * properties are treated as unresolved (`null`).
 *
 * @param {Map<string, unknown> | Record<string, unknown> | null | undefined} resolved
 * @param {string} id
 * @returns {unknown}
 */
function lookupEstimate(resolved, id) {
  if (resolved == null) return null;
  if (resolved instanceof Map) return resolved.has(id) ? resolved.get(id) : null;
  if (Object.prototype.hasOwnProperty.call(resolved, id)) return resolved[id];
  return null;
}

/**
 * Stamp the spec's optional `estimate` field onto each usage record.
 *
 * Distinct `issueIdentifier`s are de-duplicated before the source is queried,
 * so the port sees at most one lookup per issue. Records whose issue resolves
 * to a non-negative integer estimate gain `estimate`; all other fields are left
 * unchanged. Records whose issue has no estimate (`null`) or no longer resolves
 * are returned untouched — `estimate` stays **absent, never `0`** — and the
 * issue identifier is reported in the `unresolved` summary.
 *
 * Input records are never mutated; a shallow copy is returned for each.
 *
 * @param {Iterable<object>} records  Usage records (typically estimate-free).
 * @param {{ resolveEstimates: (ids: string[]) => unknown }} source  A `LinearEstimateSource`.
 * @param {object} [options]  Reserved for future options.
 * @returns {Promise<{
 *   records: object[],
 *   unresolved: string[],
 *   stats: {
 *     recordsTotal: number,
 *     recordsEnriched: number,
 *     issuesQueried: number,
 *     issuesResolved: number,
 *     issuesUnresolved: number,
 *   },
 * }>}
 */
export async function enrichUsageWithEstimate(records, source, options = {}) {
  if (source == null || typeof source.resolveEstimates !== 'function') {
    throw new TypeError(
      'enrichUsageWithEstimate: source must implement resolveEstimates(ids)',
    );
  }

  const input = [...records];

  // De-duplicate distinct issue identifiers so the source is queried at most
  // once per issue (≤1 lookup per issue, batched where the API allows).
  const distinctIds = [
    ...new Set(
      input
        .map((rec) => rec?.issueIdentifier)
        .filter((id) => typeof id === 'string' && id !== ''),
    ),
  ];

  const resolved = distinctIds.length > 0
    ? await source.resolveEstimates(distinctIds)
    : new Map();

  const resolvedIds = new Set();
  const unresolvedIds = new Set();
  let recordsEnriched = 0;

  const out = input.map((rec) => {
    const id = rec?.issueIdentifier;
    if (typeof id !== 'string' || id === '') {
      return { ...rec };
    }
    const estimate = lookupEstimate(resolved, id);
    if (isValidEstimate(estimate)) {
      resolvedIds.add(id);
      recordsEnriched += 1;
      return { ...rec, estimate };
    }
    unresolvedIds.add(id);
    return { ...rec };
  });

  return {
    records: out,
    unresolved: [...unresolvedIds].sort(),
    stats: {
      recordsTotal: out.length,
      recordsEnriched,
      issuesQueried: distinctIds.length,
      issuesResolved: resolvedIds.size,
      issuesUnresolved: unresolvedIds.size,
    },
  };
}
