/**
 * ForecastProjectCost — forecast a whole project's cost by Monte Carlo
 * convolution over its planned issues.
 *
 * A project's cost is NOT the sum of its issues' P80s. Summing per-issue
 * quantiles systematically over-estimates: an extreme outcome on issue A and an
 * extreme outcome on issue B rarely happen together, so their tail risks partly
 * diversify away. The correct aggregation is a convolution of the per-issue
 * distributions. We approximate it by sampling: draw one observed cost for each
 * planned issue from its `{ size, model }` empirical cell, sum the draws into a
 * project total, repeat `iterations` times, and read P50/P80 (plus mean and
 * variance) off the resulting project distribution.
 *
 * Channels: tokens, turns, and — when a pricing port is supplied — dollars.
 * Quota and wall-clock are intentionally excluded. They are windowed /
 * scheduling quantities that do not sum across issues: you cannot add two
 * issues' remaining-quota percentages, and adding their wall-clock durations
 * ignores concurrency (project wall-clock is a scheduling problem, not a sum).
 * Forecasting either by summation would be meaningless, so this use case omits
 * them by construction.
 *
 * v0 assumes the issues are independent. Real issues are positively correlated
 * (a hard sprint inflates everything at once), and correlated risks diversify
 * less, so a correlated project has a heavier tail than this model. The
 * independence assumption therefore makes the reported P80 a mild
 * under-estimate of true tail risk — a known simplification, not a bug.
 *
 * Boundary: this is a core use case. It consumes the per-issue forecaster's
 * empirical cell sampler (`collectCellSamples`) and the shared empirical
 * quantile helper — not raw usage records, the filesystem, or the pricing
 * adapter. Dollars are derived through an injected `priceUSD` port because the
 * telemetry spec stores tokens, not prices, and pricing is an adapter concern.
 */
import { collectCellSamples, DEFAULT_MIN_FORECAST_SAMPLE_SIZE } from './forecast.mjs';
import { empiricalQuantile } from './quantiles.mjs';

export const DEFAULT_PROJECT_FORECAST_ITERATIONS = 10_000;
export const DEFAULT_PROJECT_FORECAST_SEED = 1;

/**
 * @typedef {object} ProjectChannelForecast
 * @property {number | null} p50       Median project total for this channel.
 * @property {number | null} p80       80th-percentile project total.
 * @property {number | null} mean      Mean of the simulated project totals.
 * @property {number | null} variance  Population variance of the simulated totals.
 */

/**
 * @typedef {object} ProjectForecast
 * @property {ProjectChannelForecast} tokens
 * @property {ProjectChannelForecast} turns
 * @property {ProjectChannelForecast & { priced: boolean }} dollars
 * @property {number} iterations   Monte Carlo iterations actually run.
 * @property {number} seed         The seed used (echoed for reproducibility).
 * @property {number} issues       Number of planned issues in the project.
 * @property {boolean} lowConfidence  True if any issue's cell was empty or thin.
 * @property {boolean} empty       True if no issue had any historical data.
 */

/**
 * Forecast total project cost by Monte Carlo convolution over planned issues.
 *
 * @param {Array<{ size: unknown, model: unknown, [key: string]: unknown }>} issues
 *   One IssuePlan per planned issue. Each needs a `{ size, model }` to locate
 *   its empirical cell; extra keys are accepted and ignored.
 * @param {Iterable<object> | AsyncIterable<object> | { records?: unknown, iterate?: unknown }} [usageSource]
 *   The estimate-tagged history, same source shape `forecastIssueCost` accepts.
 * @param {{
 *   iterations?: number,
 *   seed?: number,
 *   minSampleSize?: number,
 *   priceUSD?: (observation: {
 *     tokens: number, turns: number, inputTokens: number, outputTokens: number,
 *     model: unknown, size: unknown,
 *   }) => number,
 * }} [options]
 *   `iterations` (default 10,000) and `seed` (default 1) control the seeded RNG.
 *   `minSampleSize` flags thin cells (default mirrors the per-issue forecaster).
 *   `priceUSD` is the optional pricing port: given one observed issue's cost, it
 *   returns that issue's dollar cost. Without it, the dollars channel is null
 *   and `dollars.priced` is false.
 * @returns {Promise<ProjectForecast>}
 */
export async function forecastProjectCost(issues, usageSource = [], options = {}) {
  const plans = normalizeIssues(issues);
  const iterations = normalizeIterations(options.iterations);
  const seed = normalizeSeed(options.seed);
  const minSampleSize = normalizeMinSampleSize(options.minSampleSize);
  const priceUSD = normalizePriceUSD(options.priceUSD);

  // Pull each planned issue's empirical {size, model} cell from the per-issue
  // forecaster's sampler. Drawing from this shared sampler is what keeps the
  // project forecast anchored to observed per-issue costs rather than a refit
  // parametric — and means the project reads exactly the cell ForecastIssueCost
  // would read for the same issue.
  const cells = [];
  for (const plan of plans) {
    const observations = await collectCellSamples(plan, usageSource);
    cells.push(buildCell(observations, plan, priceUSD));
  }

  const issuesWithData = cells.filter((cell) => cell.size > 0).length;
  const lowConfidence =
    issuesWithData < cells.length ||
    cells.some((cell) => cell.size > 0 && cell.size < minSampleSize);

  if (issuesWithData === 0) {
    return emptyForecast({ iterations, seed, issues: cells.length, priced: priceUSD !== null });
  }

  // Monte Carlo convolution: each iteration draws one observed cost per issue
  // and sums them into a project total. Because the draws are independent, the
  // simulated project distribution converges to the convolution of the
  // per-issue distributions, so its tail is correctly sub-additive — the whole
  // point of this use case versus summing per-issue quantiles.
  const rng = mulberry32(seed);
  const tokenSums = new Float64Array(iterations);
  const turnSums = new Float64Array(iterations);
  const dollarSums = priceUSD === null ? null : new Float64Array(iterations);

  for (let i = 0; i < iterations; i++) {
    let tokens = 0;
    let turns = 0;
    let dollars = 0;
    for (const cell of cells) {
      // An issue with no historical data contributes nothing this draw; the
      // result is already flagged lowConfidence so the caller knows the project
      // total is missing that issue's cost.
      if (cell.size === 0) continue;
      const index = Math.floor(rng() * cell.size);
      tokens += cell.tokens[index];
      turns += cell.turns[index];
      if (dollarSums !== null) dollars += cell.dollars[index];
    }
    tokenSums[i] = tokens;
    turnSums[i] = turns;
    if (dollarSums !== null) dollarSums[i] = dollars;
  }

  return {
    tokens: channelForecast(tokenSums),
    turns: channelForecast(turnSums),
    dollars: dollarSums === null
      ? unpricedChannel()
      : { ...channelForecast(dollarSums), priced: true },
    iterations,
    seed,
    issues: cells.length,
    lowConfidence,
    empty: false,
  };
}

/**
 * Materialize one issue's empirical cell into typed sample arrays for fast
 * sampling. When a pricing port is present, each observation's dollar cost is
 * computed once up front so the hot Monte Carlo loop only indexes arrays.
 *
 * @param {Array<{ tokens: number, turns: number, inputTokens: number, outputTokens: number }>} observations
 * @param {{ size: unknown, model: unknown }} plan
 * @param {((observation: object) => number) | null} priceUSD
 */
function buildCell(observations, plan, priceUSD) {
  const size = observations.length;
  const tokens = new Float64Array(size);
  const turns = new Float64Array(size);
  const dollars = priceUSD === null ? null : new Float64Array(size);

  for (let i = 0; i < size; i++) {
    const observation = observations[i];
    tokens[i] = observation.tokens;
    turns[i] = observation.turns;
    if (dollars !== null) {
      const priced = priceUSD({
        tokens: observation.tokens,
        turns: observation.turns,
        inputTokens: observation.inputTokens,
        outputTokens: observation.outputTokens,
        model: plan.model,
        size: plan.size,
      });
      if (typeof priced !== 'number' || !Number.isFinite(priced)) {
        throw new TypeError('forecastProjectCost: options.priceUSD must return a finite number');
      }
      dollars[i] = priced;
    }
  }

  return { size, tokens, turns, dollars };
}

/**
 * Read P50/P80 (nearest-rank, matching the per-issue forecaster) plus mean and
 * population variance off a sample of simulated project totals.
 *
 * @param {Float64Array} samples
 * @returns {ProjectChannelForecast}
 */
function channelForecast(samples) {
  const n = samples.length;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += samples[i];
  const mean = sum / n;

  let squaredError = 0;
  for (let i = 0; i < n; i++) {
    const delta = samples[i] - mean;
    squaredError += delta * delta;
  }

  return {
    p50: empiricalQuantile(samples, 0.5),
    p80: empiricalQuantile(samples, 0.8),
    mean,
    variance: squaredError / n,
  };
}

function unpricedChannel() {
  return { p50: null, p80: null, mean: null, variance: null, priced: false };
}

/**
 * @param {{ iterations: number, seed: number, issues: number, priced: boolean }} meta
 * @returns {ProjectForecast}
 */
function emptyForecast(meta) {
  const nullChannel = () => ({ p50: null, p80: null, mean: null, variance: null });
  return {
    tokens: nullChannel(),
    turns: nullChannel(),
    dollars: { ...nullChannel(), priced: meta.priced },
    iterations: meta.iterations,
    seed: meta.seed,
    issues: meta.issues,
    lowConfidence: true,
    empty: true,
  };
}

/**
 * @param {unknown} issues
 */
function normalizeIssues(issues) {
  if (!Array.isArray(issues)) {
    throw new TypeError('forecastProjectCost: issues must be an array of { size, model }');
  }
  if (issues.length === 0) {
    throw new TypeError('forecastProjectCost: issues must not be empty');
  }
  return issues.map((issue, index) => {
    if (issue === null || typeof issue !== 'object' || Array.isArray(issue)) {
      throw new TypeError(`forecastProjectCost: issues[${index}] must be an object`);
    }
    const record = /** @type {Record<string, unknown>} */ (issue);
    if (record.size === null || record.size === undefined || record.size === '') {
      throw new TypeError(`forecastProjectCost: issues[${index}].size is required`);
    }
    if (record.model === null || record.model === undefined || record.model === '') {
      throw new TypeError(`forecastProjectCost: issues[${index}].model is required`);
    }
    return record;
  });
}

/**
 * @param {unknown} value
 */
function normalizeIterations(value) {
  if (value === undefined) return DEFAULT_PROJECT_FORECAST_ITERATIONS;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new TypeError('forecastProjectCost: options.iterations must be a positive integer');
  }
  return value;
}

/**
 * @param {unknown} value
 */
function normalizeSeed(value) {
  if (value === undefined) return DEFAULT_PROJECT_FORECAST_SEED;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError('forecastProjectCost: options.seed must be a finite number');
  }
  return value;
}

/**
 * @param {unknown} value
 */
function normalizeMinSampleSize(value) {
  if (value === undefined) return DEFAULT_MIN_FORECAST_SAMPLE_SIZE;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new TypeError('forecastProjectCost: options.minSampleSize must be a positive integer');
  }
  return value;
}

/**
 * @param {unknown} value
 */
function normalizePriceUSD(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'function') {
    throw new TypeError('forecastProjectCost: options.priceUSD must be a function');
  }
  return value;
}

/**
 * mulberry32 — a tiny, fast, fully deterministic PRNG. Seeded with a 32-bit
 * integer, it returns a float in [0, 1). It is the seeded-RNG adapter for this
 * use case: same seed + same inputs always yield the same forecast.
 *
 * @param {number} seed
 * @returns {() => number}
 */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
