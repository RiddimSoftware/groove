/**
 * Multi-issue rollup: aggregate cost across a set of issues specified as
 * either explicit IDs (`EPAC-1940`) or inclusive ranges (`EPAC-1990-1999`).
 *
 * Range syntax exploits the fact that Linear issue keys are strictly
 * `<TEAM>-<NUMBER>` (no other hyphens permitted in the key), so a
 * positional matching `<PREFIX>-<START>-<END>` is unambiguously a range.
 */

const SINGLE_ISSUE_PATTERN = /^([A-Z][A-Z0-9]*)-(\d+)$/;
const RANGE_PATTERN = /^([A-Z][A-Z0-9]*)-(\d+)-(\d+)$/;

/**
 * Expand a single positional into a list of issue IDs.
 *
 *   "EPAC-1940"       → ["EPAC-1940"]
 *   "EPAC-1990-1999"  → ["EPAC-1990", "EPAC-1991", ..., "EPAC-1999"]
 *
 * Throws if the positional doesn't match either shape, or if a range
 * has start > end, or if the range is unreasonably large (> 10,000).
 *
 * @param {string} arg
 * @returns {string[]}
 */
export function expandIssueArg(arg) {
  if (typeof arg !== 'string' || arg.length === 0) {
    throw new Error(`empty issue argument`);
  }
  const normalized = arg.trim().toUpperCase();

  const rangeMatch = RANGE_PATTERN.exec(normalized);
  if (rangeMatch !== null) {
    const prefix = rangeMatch[1];
    const start = Number.parseInt(rangeMatch[2], 10);
    const end = Number.parseInt(rangeMatch[3], 10);
    if (start > end) {
      throw new Error(`range start > end: ${arg} (parsed as ${start}..${end})`);
    }
    const count = end - start + 1;
    if (count > 10_000) {
      throw new Error(`range too large: ${arg} would expand to ${count} issues (cap is 10,000)`);
    }
    const out = new Array(count);
    for (let i = 0; i < count; i++) out[i] = `${prefix}-${start + i}`;
    return out;
  }

  const singleMatch = SINGLE_ISSUE_PATTERN.exec(normalized);
  if (singleMatch !== null) {
    return [normalized];
  }

  throw new Error(
    `unrecognized issue argument: ${arg}` +
    ` (expected <TEAM>-<N> or <TEAM>-<N>-<M>, e.g. EPAC-1940 or EPAC-1990-1999)`,
  );
}

/**
 * Expand and deduplicate a list of positionals into a stable-ordered set.
 *
 * Order is: first appearance of each unique ID across the args. This way
 * `./cost EPAC-1990-1999 EPAC-1995` doesn't double-count or shuffle.
 *
 * @param {readonly string[]} args
 * @returns {{ ids: string[], requestedCount: number }}
 *   - ids: ordered unique issue identifiers
 *   - requestedCount: total IDs after range expansion (before dedup). Useful
 *     for "10 issues requested, 7 had data" framing when ranges are involved.
 */
export function expandAllIssueArgs(args) {
  const seen = new Set();
  const ids = [];
  let requestedCount = 0;
  for (const arg of args) {
    const expanded = expandIssueArg(arg);
    requestedCount += expanded.length;
    for (const id of expanded) {
      if (!seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
    }
  }
  return { ids, requestedCount };
}

/**
 * @typedef {object} PerIssueRow
 * @property {string} issueIdentifier
 * @property {number} sessionCount
 * @property {number} turnCount
 * @property {number} tokens                Combined input + output across providers.
 * @property {number|null} apiCostUsd       Null if no rates known for any model used.
 * @property {Record<string, {sessions: number, turns: number, tokens: number, costUsd: number|null}>} byProvider
 */

/**
 * @typedef {object} MultiIssueRollup
 * @property {string} label                 Human-readable summary (e.g. "EPAC-1990-1999" or "3 issues").
 * @property {string[]} positionals         The raw args the user passed.
 * @property {string[]} requestedIds        Every unique ID after expansion.
 * @property {number} requestedCount        Sum of expanded args before dedup.
 * @property {PerIssueRow[]} issues         One row per ID that had any data.
 * @property {string[]} missing             IDs in requestedIds with no data.
 * @property {PerIssueRow} totals           Aggregate across `issues`.
 */

/**
 * Compute a rollup across multiple issue IDs.
 *
 * `loader` is `(issueId) => Promise<IssueRollup>` so this function works
 * against either CLI transcripts or a usage.jsonl source — the caller
 * passes whichever loader they want.
 *
 * @param {readonly string[]} positionals     The user's raw positional args.
 * @param {(id: string) => Promise<import('./aggregator.js').IssueRollup>} loader
 * @returns {Promise<MultiIssueRollup>}
 */
export async function computeMultiIssueRollup(positionals, loader) {
  const { ids, requestedCount } = expandAllIssueArgs(positionals);

  const issues = [];
  const missing = [];

  for (const id of ids) {
    const rollup = await loader(id);
    if (rollup.combinedSessions === 0 && rollup.combinedTurns === 0) {
      missing.push(id);
      continue;
    }
    issues.push(rollupToRow(id, rollup));
  }

  return {
    label: labelFor(positionals),
    positionals: [...positionals],
    requestedIds: ids,
    requestedCount,
    issues,
    missing,
    totals: sumRows(issues),
  };
}

function rollupToRow(issueIdentifier, rollup) {
  const byProvider = {};
  let totalCost = null;
  let costKnown = true;
  for (const provider of ['claude', 'codex']) {
    const t = rollup.providerTotals[provider];
    const cost = t.pricing?.totalUsd ?? null;
    byProvider[provider] = {
      sessions: t.sessionCount,
      turns: t.turnCount,
      tokens: t.tokensGrandTotal,
      costUsd: cost,
    };
    if (t.sessionCount > 0 && cost === null) costKnown = false;
    if (cost !== null) totalCost = (totalCost ?? 0) + cost;
  }
  return {
    issueIdentifier,
    sessionCount: rollup.combinedSessions,
    turnCount: rollup.combinedTurns,
    tokens: rollup.combinedTokens,
    apiCostUsd: costKnown ? totalCost : null,
    byProvider,
  };
}

function sumRows(rows) {
  let sessionCount = 0;
  let turnCount = 0;
  let tokens = 0;
  let apiCostUsd = null;
  let costKnown = true;
  const byProvider = {
    claude: { sessions: 0, turns: 0, tokens: 0, costUsd: null },
    codex: { sessions: 0, turns: 0, tokens: 0, costUsd: null },
  };
  let claudeCost = null;
  let codexCost = null;
  for (const r of rows) {
    sessionCount += r.sessionCount;
    turnCount += r.turnCount;
    tokens += r.tokens;
    if (r.apiCostUsd === null) costKnown = false;
    else apiCostUsd = (apiCostUsd ?? 0) + r.apiCostUsd;
    for (const provider of ['claude', 'codex']) {
      byProvider[provider].sessions += r.byProvider[provider].sessions;
      byProvider[provider].turns += r.byProvider[provider].turns;
      byProvider[provider].tokens += r.byProvider[provider].tokens;
      const c = r.byProvider[provider].costUsd;
      if (c !== null) {
        if (provider === 'claude') claudeCost = (claudeCost ?? 0) + c;
        else codexCost = (codexCost ?? 0) + c;
      }
    }
  }
  byProvider.claude.costUsd = claudeCost;
  byProvider.codex.costUsd = codexCost;
  return {
    issueIdentifier: 'TOTAL',
    sessionCount,
    turnCount,
    tokens,
    apiCostUsd: costKnown ? apiCostUsd : null,
    byProvider,
  };
}

function labelFor(positionals) {
  if (positionals.length === 1) return positionals[0].toUpperCase();
  if (positionals.length <= 3) return positionals.map((p) => p.toUpperCase()).join(', ');
  return `${positionals.length} arguments`;
}
