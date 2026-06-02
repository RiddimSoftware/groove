/**
 * Deterministic synthetic usage records for calibration and tests.
 *
 * The point of a synthetic generator is to have a *known* ground truth: draw
 * per-issue cost from a distribution whose P50 and P80 we chose analytically,
 * so a test can assert the empirical forecaster recovers those quantiles. The
 * default distribution is log-normal — costs are positive and right-skewed, a
 * good model for "most issues are cheap, a few blow up" — parameterised so its
 * median and 80th percentile hit exactly the values you ask for.
 *
 * Everything here is seeded and pure: the same `(seed, …)` always yields the
 * same records, so held-out splits and recovery assertions are reproducible.
 */

/** Standard-normal 80th-percentile quantile, z such that Φ(z) = 0.80. */
export const Z_P80 = 0.8416212335729143;

/**
 * mulberry32 — a tiny, fast, well-distributed 32-bit seeded PRNG. Returns a
 * function producing uniform floats in [0, 1). Deterministic for a given seed.
 *
 * @param {number} seed
 * @returns {() => number}
 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Draw one standard-normal value from a uniform PRNG via the Box–Muller
 * transform. Consumes two uniforms per call.
 *
 * @param {() => number} rng
 * @returns {number}
 */
export function standardNormal(rng) {
  let u1 = rng();
  const u2 = rng();
  if (u1 < 1e-12) u1 = 1e-12; // guard log(0)
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Solve for the log-normal parameters `{ mu, sigma }` whose median is `p50`
 * and whose 80th percentile is `p80`.
 *
 * For a log-normal, median = exp(mu) and the q-quantile = exp(mu + sigma·z_q),
 * so mu = ln(p50) and sigma = (ln(p80) − ln(p50)) / z_0.8.
 *
 * @param {number} p50  Target median (> 0).
 * @param {number} p80  Target 80th percentile (> p50).
 * @returns {{ mu: number, sigma: number }}
 */
export function logNormalParamsForP50P80(p50, p80) {
  if (!(p50 > 0) || !(p80 > 0)) {
    throw new RangeError('logNormalParamsForP50P80: p50 and p80 must be positive');
  }
  if (!(p80 > p50)) {
    throw new RangeError('logNormalParamsForP50P80: p80 must exceed p50');
  }
  const mu = Math.log(p50);
  const sigma = (Math.log(p80) - Math.log(p50)) / Z_P80;
  return { mu, sigma };
}

/**
 * Generate `n` spec-valid usage records — one per issue — whose per-issue
 * `totalTokens` are drawn from a log-normal distribution with the requested
 * median (`p50`) and 80th percentile (`p80`). Each record carries the same
 * `{ size, model }` cell so the whole batch forms a single forecast cell.
 *
 * Because each issue gets exactly one record, the forecaster's per-issue
 * aggregation is the identity, and its empirical P50/P80 over the batch should
 * recover `p50`/`p80` within sampling error.
 *
 * @param {object} options
 * @param {number}  options.p50              Target median tokens (> 0).
 * @param {number}  options.p80              Target 80th-percentile tokens (> p50).
 * @param {number}  options.n                Number of issues/records to generate.
 * @param {number}  [options.seed=1]         PRNG seed; same seed → same records.
 * @param {string}  [options.size='L']       The cell's `size` tag.
 * @param {string}  [options.model='sonnet'] The cell's `model` tag.
 * @param {string}  [options.idPrefix='SYN'] Issue-identifier prefix.
 * @param {number}  [options.idStart=1]      First issue number (lets callers
 *                                           generate disjoint issue-id ranges).
 * @returns {object[]} Usage records valid per the cost-telemetry spec §5.1.
 */
export function syntheticUsageRecords(options) {
  const {
    p50,
    p80,
    n,
    seed = 1,
    size = 'L',
    model = 'sonnet',
    idPrefix = 'SYN',
    idStart = 1,
  } = options ?? {};

  if (!Number.isInteger(n) || n < 0) {
    throw new RangeError('syntheticUsageRecords: n must be a non-negative integer');
  }
  const { mu, sigma } = logNormalParamsForP50P80(p50, p80);
  const rng = mulberry32(seed);

  const records = [];
  for (let i = 0; i < n; i++) {
    const z = standardNormal(rng);
    const totalTokens = Math.max(0, Math.round(Math.exp(mu + sigma * z)));
    records.push(syntheticRecord({
      issueIdentifier: `${idPrefix}-${idStart + i}`,
      size,
      model,
      totalTokens,
    }));
  }
  return records;
}

/**
 * Build a single spec-valid usage record carrying the given cell tags and
 * token total. Token split is recorded as fully-uncached input so the totals
 * line up; the calibration backtest only reads `totalTokens`.
 *
 * @param {{ issueIdentifier: string, size: string, model: string, totalTokens: number }} fields
 * @returns {object}
 */
export function syntheticRecord({ issueIdentifier, size, model, totalTokens }) {
  return {
    schemaVersion: 1,
    recordedAt: '2026-01-01T00:00:00.000Z',
    runID: '00000000-0000-4000-8000-000000000000',
    turn: 1,
    issueIdentifier,
    provider: 'synthetic',
    model,
    botRole: 'developer',
    size,
    inputTokens: totalTokens,
    outputTokens: 0,
    totalTokens,
    usageSource: 'estimated',
    startedAt: '2026-01-01T00:00:00.000Z',
    endedAt: '2026-01-01T00:00:01.000Z',
  };
}
