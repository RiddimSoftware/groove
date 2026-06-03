/**
 * JoinCostWithFeature — the pluggable cost↔feature join port.
 *
 * The only workflow-specific decision in cost-drivers is *what ties a chunk of
 * cost to a chunk of code change*. This module inverts that decision behind a
 * named-strategy registry plus caller-supplied escape hatches, so the tool is
 * not hard-wired to any one org's issue-key/worktree convention.
 *
 * Cost records (from `readUsageRecords`) and diff/feature records (from a
 * `DiffSource` such as `readGitDiffs`) go in; `{ feature, cost }` pairs come
 * out, shaped so they compose with `correlateCostWithFeature` without glue:
 *
 *   { feature: <number>, cost: { tokens: <number>, turns: <number> } }
 *
 * Boundary rule: this is pure join logic. It imports neither git/child_process
 * nor any transcript/Linear reader — both streams arrive as in-memory data
 * (enforced by `npm run test:boundary`). The only sibling it leans on is the
 * pure `issue-pattern` helper for the default issue-key extractor.
 */
import { DEFAULT_CWD_PATTERN, issueFromCwd } from './issue-pattern.mjs';

/**
 * Names of the built-in, label-free join strategies. The set is intentionally
 * open: new strategies are added to {@link buildKeyStrategies} / the `time`
 * branch without any caller having to change. Callers who need something
 * outside this set reach for `keyOfUsage`/`keyOfDiff` or a full `join`.
 *
 * @type {readonly string[]}
 */
export const BUILTIN_JOIN_STRATEGIES = Object.freeze(['issue-key', 'worktree', 'time']);

/**
 * Join a stream of cost records with a stream of diff/feature records into
 * `correlate`-ready `{ feature, cost }` pairs, using a selectable strategy.
 *
 * @param {object} args
 * @param {Iterable<object> | AsyncIterable<object>} args.usage
 *   Cost records (e.g. from `readUsageRecords`). Each may carry
 *   `issueIdentifier?`, `workspacePath?`, `startedAt`/`endedAt`, `totalTokens`.
 *   One record == one turn (matching `rollupUsageRecords`), unless the record
 *   carries an explicit numeric `turns`/`turnCount`. `usageSource:
 *   'unavailable'` records are skipped.
 * @param {Iterable<object> | AsyncIterable<object>} args.diffs
 *   Diff records (e.g. from `readGitDiffs`): `{ key, additions, deletions,
 *   changedFiles }`. For the `worktree` strategy the join key is the diff's
 *   `key`/`workspacePath`; for `time` it is the diff's commit timestamp.
 * @param {'issue-key'|'worktree'|'time'|string} [args.strategy]
 *   Named strategy. Defaults to `'issue-key'`. Ignored when `join` is given.
 * @param {(usage: object) => (string|null|undefined)} [args.keyOfUsage]
 *   Override the strategy's usage-key extractor (custom key join).
 * @param {(diff: object) => (string|null|undefined)} [args.keyOfDiff]
 *   Override the strategy's diff-key extractor (custom key join).
 * @param {(usage: object[], diffs: object[]) => object[]} [args.join]
 *   Full escape hatch: bypass strategies and return pairs directly. The
 *   returned pair shape is validated.
 * @param {(diff: object) => number} [args.featureOf]
 *   Reduce a (per-key merged) diff record to the numeric `feature`. Defaults to
 *   churn = `additions + deletions`.
 * @param {RegExp} [args.cwdPattern]
 *   Pattern for the default issue-key extractor's `workspacePath` fallback.
 *   Defaults to `DEFAULT_CWD_PATTERN`. Overridable so the issue-key default
 *   never leaks one org's path convention.
 * @param {number | {ms?: number, seconds?: number, minutes?: number, hours?: number}} [args.window]
 *   Required by `strategy: 'time'`: how far *before* a commit to sweep cost.
 * @param {(usage: object) => (number|string|Date)} [args.timestampOfUsage]
 *   `time` strategy: usage timestamp. Defaults to `endedAt ?? startedAt`.
 * @param {(diff: object) => (number|string|Date)} [args.timestampOfDiff]
 *   `time` strategy: commit timestamp. Defaults to
 *   `committedAt ?? timestamp ?? endedAt`.
 * @returns {Promise<{pairs: object[], unjoined: {usage: string[], diffs: string[]}}>}
 *   `pairs` ready for `correlateCostWithFeature`, and `unjoined` listing the
 *   keys (or, for `time`, the timestamps) present on only one side.
 */
export async function joinCostWithFeature(args = {}) {
  const {
    usage,
    diffs,
    strategy = 'issue-key',
    keyOfUsage,
    keyOfDiff,
    join,
    featureOf = defaultFeatureOf,
    cwdPattern = DEFAULT_CWD_PATTERN,
    window,
    timestampOfUsage,
    timestampOfDiff,
  } = args;

  const usageRecords = await collect(usage);
  const diffRecords = await collect(diffs);

  // Full custom join: bypass every strategy; only validate what comes back.
  if (join !== undefined) {
    if (typeof join !== 'function') throw new TypeError('`join` must be a function');
    const pairs = validatePairs(join(usageRecords, diffRecords), 'join');
    return { pairs, unjoined: { usage: [], diffs: [] } };
  }

  if (strategy === 'time' && keyOfUsage === undefined && keyOfDiff === undefined) {
    const pairs = timeJoin(usageRecords, diffRecords, { window, timestampOfUsage, timestampOfDiff, featureOf });
    return { pairs: pairs.joined, unjoined: pairs.unjoined };
  }

  // Key-based join: issue-key (default), worktree, or caller-supplied extractors.
  const strategies = buildKeyStrategies(cwdPattern);
  const base = strategies[strategy];
  if (base === undefined && !(keyOfUsage !== undefined || keyOfDiff !== undefined)) {
    throw new Error(
      `unknown join strategy: ${JSON.stringify(strategy)}. ` +
        `Use one of ${BUILTIN_JOIN_STRATEGIES.join(', ')}, supply keyOfUsage/keyOfDiff, or pass a full join().`,
    );
  }
  const resolvedKeyOfUsage = keyOfUsage ?? base?.keyOfUsage ?? strategies['issue-key'].keyOfUsage;
  const resolvedKeyOfDiff = keyOfDiff ?? base?.keyOfDiff ?? strategies['issue-key'].keyOfDiff;

  return keyJoin(usageRecords, diffRecords, { keyOfUsage: resolvedKeyOfUsage, keyOfDiff: resolvedKeyOfDiff, featureOf });
}

/* ------------------------------------------------------------------------- *
 * Key-based join (issue-key / worktree / custom extractors)
 * ------------------------------------------------------------------------- */

function keyJoin(usageRecords, diffRecords, { keyOfUsage, keyOfDiff, featureOf }) {
  const costByKey = new Map();
  for (const rec of usageRecords) {
    const contribution = usageContribution(rec);
    if (contribution === null) continue;
    const key = normalizeKey(keyOfUsage(rec));
    if (key === null) continue;
    addCost(costByKey, key, contribution);
  }

  const diffByKey = new Map();
  for (const rec of diffRecords) {
    const key = normalizeKey(keyOfDiff(rec));
    if (key === null) continue;
    addDiff(diffByKey, key, rec);
  }

  const pairs = [];
  const unjoinedDiffs = [];
  for (const [key, mergedDiff] of diffByKey) {
    const cost = costByKey.get(key);
    if (cost === undefined) {
      unjoinedDiffs.push(key);
      continue;
    }
    pairs.push(makePair(key, featureOf(mergedDiff), cost));
  }

  const unjoinedUsage = [];
  for (const key of costByKey.keys()) {
    if (!diffByKey.has(key)) unjoinedUsage.push(key);
  }

  return {
    pairs: validatePairs(pairs, 'key-strategy'),
    unjoined: { usage: unjoinedUsage.sort(), diffs: unjoinedDiffs.sort() },
  };
}

/**
 * Build the registry of key-based strategies, binding the runtime `cwdPattern`
 * into the issue-key extractor. Adding a new named key strategy is a one-line
 * addition here — no caller changes.
 */
function buildKeyStrategies(cwdPattern) {
  return {
    'issue-key': {
      keyOfUsage: (u) => {
        if (typeof u.issueIdentifier === 'string' && u.issueIdentifier !== '') return u.issueIdentifier;
        return issueFromCwd(String(u.workspacePath ?? ''), cwdPattern);
      },
      keyOfDiff: (d) => d.key ?? d.issueIdentifier ?? null,
    },
    worktree: {
      keyOfUsage: (u) => normalizePath(u.workspacePath ?? u.cwd),
      keyOfDiff: (d) => normalizePath(d.workspacePath ?? d.worktreePath ?? d.key),
    },
  };
}

/* ------------------------------------------------------------------------- *
 * Time-window join (noisy, label-free fallback)
 * ------------------------------------------------------------------------- */

/**
 * Attribute each cost record to the nearest commit at or after it, within
 * `window` milliseconds. Deliberately approximate — there is no shared key, so
 * a burst of cost is credited to the next commit that "lands" it. Documented as
 * a low-confidence fallback.
 */
function timeJoin(usageRecords, diffRecords, { window, timestampOfUsage, timestampOfDiff, featureOf }) {
  const windowMs = resolveWindowMs(window);
  const tsUsage = timestampOfUsage ?? ((u) => u.endedAt ?? u.startedAt);
  const tsDiff = timestampOfDiff ?? ((d) => d.committedAt ?? d.timestamp ?? d.endedAt);

  const commits = diffRecords
    .map((rec) => ({ rec, at: toMillis(tsDiff(rec)) }))
    .filter((c) => c.at !== null)
    .sort((a, b) => a.at - b.at);

  const buckets = commits.map((c) => ({ commit: c, cost: { tokens: 0, turns: 0 }, matched: 0 }));

  const unjoinedUsage = [];
  for (const rec of usageRecords) {
    const contribution = usageContribution(rec);
    if (contribution === null) continue;
    const at = toMillis(tsUsage(rec));
    if (at === null) {
      unjoinedUsage.push('(no timestamp)');
      continue;
    }
    const idx = nearestCommitAtOrAfter(buckets, at, windowMs);
    if (idx === -1) {
      unjoinedUsage.push(new Date(at).toISOString());
      continue;
    }
    buckets[idx].cost.tokens += contribution.tokens;
    buckets[idx].cost.turns += contribution.turns;
    buckets[idx].matched += 1;
  }

  const joined = [];
  const unjoinedDiffs = [];
  for (const bucket of buckets) {
    const label = isoOrString(bucket.commit.at);
    if (bucket.matched === 0) {
      unjoinedDiffs.push(label);
      continue;
    }
    joined.push(makePair(label, featureOf(bucket.commit.rec), bucket.cost, { approximate: true }));
  }

  return {
    joined: validatePairs(joined, 'time-strategy'),
    unjoined: { usage: unjoinedUsage, diffs: unjoinedDiffs },
  };
}

/** First commit whose time is >= `at` and within `windowMs` of it; else -1. */
function nearestCommitAtOrAfter(buckets, at, windowMs) {
  let best = -1;
  for (let i = 0; i < buckets.length; i++) {
    const commitAt = buckets[i].commit.at;
    if (commitAt < at) continue;
    if (commitAt - at > windowMs) break; // sorted ascending — no later one is closer
    best = i;
    break;
  }
  return best;
}

function resolveWindowMs(window) {
  if (typeof window === 'number' && Number.isFinite(window) && window > 0) return window;
  if (window !== null && typeof window === 'object') {
    const ms =
      numOr0(window.ms) +
      numOr0(window.seconds) * 1000 +
      numOr0(window.minutes) * 60_000 +
      numOr0(window.hours) * 3_600_000;
    if (ms > 0) return ms;
  }
  throw new Error("strategy: 'time' requires a positive `window` (ms number or { ms|seconds|minutes|hours }).");
}

/* ------------------------------------------------------------------------- *
 * Shared helpers
 * ------------------------------------------------------------------------- */

function defaultFeatureOf(diff) {
  return numOr0(diff.additions) + numOr0(diff.deletions);
}

/**
 * Cost contributed by one usage record, or `null` to skip it. One record is
 * one turn (matching `rollupUsageRecords`) unless it carries an explicit
 * numeric `turns`/`turnCount`. `unavailable` records carry no usage and are
 * dropped.
 */
function usageContribution(rec) {
  if (rec.usageSource === 'unavailable') return null;
  const tokens = Number.isFinite(rec.totalTokens)
    ? rec.totalTokens
    : numOr0(rec.inputTokens) + numOr0(rec.outputTokens);
  let turns = 1;
  if (Number.isFinite(rec.turns)) turns = rec.turns;
  else if (Number.isFinite(rec.turnCount)) turns = rec.turnCount;
  return { tokens, turns };
}

function addCost(map, key, contribution) {
  const existing = map.get(key);
  if (existing === undefined) {
    map.set(key, { tokens: contribution.tokens, turns: contribution.turns });
    return;
  }
  existing.tokens += contribution.tokens;
  existing.turns += contribution.turns;
}

function addDiff(map, key, rec) {
  const existing = map.get(key);
  if (existing === undefined) {
    map.set(key, {
      key,
      additions: numOr0(rec.additions),
      deletions: numOr0(rec.deletions),
      changedFiles: numOr0(rec.changedFiles),
    });
    return;
  }
  existing.additions += numOr0(rec.additions);
  existing.deletions += numOr0(rec.deletions);
  existing.changedFiles += numOr0(rec.changedFiles);
}

function makePair(key, feature, cost, extra) {
  const pair = { key, feature, cost: { tokens: cost.tokens, turns: cost.turns } };
  if (extra !== undefined) Object.assign(pair, extra);
  return pair;
}

/**
 * Assert the `{ feature, cost: { tokens, turns } }` contract every consumer
 * (notably `correlateCostWithFeature`) relies on. Runs on built-in output and,
 * critically, on the opaque output of a caller-supplied `join`.
 */
function validatePairs(pairs, source) {
  if (!Array.isArray(pairs)) {
    throw new TypeError(`${source} must return an array of pairs, got ${typeof pairs}`);
  }
  pairs.forEach((pair, i) => {
    if (pair === null || typeof pair !== 'object') {
      throw new TypeError(`${source} pair[${i}] is not an object`);
    }
    if (!Number.isFinite(pair.feature)) {
      throw new TypeError(`${source} pair[${i}].feature must be a finite number, got ${stringifyValue(pair.feature)}`);
    }
    const cost = pair.cost;
    if (cost === null || typeof cost !== 'object') {
      throw new TypeError(`${source} pair[${i}].cost must be an object with { tokens, turns }`);
    }
    if (!Number.isFinite(cost.tokens)) {
      throw new TypeError(`${source} pair[${i}].cost.tokens must be a finite number, got ${stringifyValue(cost.tokens)}`);
    }
    if (!Number.isFinite(cost.turns)) {
      throw new TypeError(`${source} pair[${i}].cost.turns must be a finite number, got ${stringifyValue(cost.turns)}`);
    }
  });
  return pairs;
}

async function collect(source) {
  const out = [];
  if (source === null || source === undefined) return out;
  for await (const item of source) out.push(item);
  return out;
}

function normalizeKey(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s === '' ? null : s;
}

function normalizePath(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim().replace(/[/\\]+$/, '');
  return s === '' ? null : s;
}

function toMillis(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.getTime();
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const t = Date.parse(String(value));
  return Number.isNaN(t) ? null : t;
}

function isoOrString(ms) {
  return new Date(ms).toISOString();
}

function numOr0(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function stringifyValue(v) {
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return JSON.stringify(v);
  return Object.prototype.toString.call(v);
}
