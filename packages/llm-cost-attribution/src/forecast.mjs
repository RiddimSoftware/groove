import { empiricalP50P80 } from './quantiles.mjs';

export const DEFAULT_MIN_FORECAST_SAMPLE_SIZE = 5;

/**
 * Forecast per-issue cost for a `{ size, model }` cell.
 *
 * The source is an iterable port: pass an Array, async generator, or an object
 * with `records()` / `iterate()` returning either. The function intentionally
 * has no filesystem dependency; callers can pass `readUsageRecords(path)`.
 *
 * v0 conditions only on `{ size, model }`. Unknown feature keys are accepted
 * and ignored so the conditioning record can grow later.
 *
 * Output channels:
 *   - `tokens` and `turns` — empirical P50/P80 of total tokens and turn counts.
 *   - `dollars` — empirical P50/P80 of API-equivalent USD, derived per issue
 *     from the aggregated token breakdown via the injected `pricingTable`
 *     port. Always returned; `n: 0` when the port is absent or returns null
 *     for every issue (e.g. model not in the rate table).
 *   - `quota` — empirical P50/P80 of the Codex plan-utilization fraction, one
 *     value per issue, via the injected `quotaModel` port. Single-issue only:
 *     never sum across issues (a project-level rollup would lie because plan
 *     quotas are window-scoped). `null` with a top-level `quotaReason` when
 *     no port is provided or no issue has a usable quota sample.
 *
 * @param {{ size: unknown, model: unknown, [key: string]: unknown }} featureRecord
 * @param {Iterable<object> | AsyncIterable<object> | { records?: unknown, iterate?: unknown }} [usageSource]
 * @param {{
 *   minSampleSize?: number,
 *   pricingTable?: { priceFor: (model: string, buckets: TokenBuckets) => number | null },
 *   quotaModel?: { quotaFractionFor: (record: object) => number | null }
 * }} [options]
 * @returns {Promise<{
 *   tokens: { p50: number | null, p80: number | null, n: number },
 *   turns: { p50: number | null, p80: number | null, n: number },
 *   dollars: { p50: number | null, p80: number | null, n: number },
 *   quota: { p50: number | null, p80: number | null, n: number } | null,
 *   quotaReason?: string,
 *   lowConfidence: boolean,
 *   empty: boolean
 * }>}
 *
 * @typedef {{
 *   inputUncached: number,
 *   inputCached: number,
 *   cacheCreate5m: number,
 *   cacheCreate1h: number,
 *   outputVisible: number,
 *   outputReasoning: number,
 * }} TokenBuckets
 */
export async function forecastIssueCost(featureRecord, usageSource = [], options = {}) {
  const feature = normalizeFeatureRecord(featureRecord);
  const minSampleSize = normalizeMinSampleSize(options.minSampleSize);
  const pricingTable = options.pricingTable ?? null;
  const quotaModel = options.quotaModel ?? null;

  const issueCosts = await collectCellSamples(featureRecord, usageSource, { quotaModel });
  const n = issueCosts.length;

  const dollars = dollarsForecast(issueCosts, feature.model, pricingTable);
  const { quota, reason: quotaReason } = quotaForecast(issueCosts, quotaModel);

  const result = {
    tokens: costForecast(issueCosts.map((cost) => cost.tokens), n),
    turns: costForecast(issueCosts.map((cost) => cost.turns), n),
    dollars,
    quota,
    lowConfidence: n < minSampleSize,
    empty: n === 0,
  };
  if (quota === null) result.quotaReason = quotaReason;
  return result;
}

/**
 * The per-cell sampler that `forecastIssueCost` reads. Returns the empirical
 * per-issue cost observations for a `{ size, model }` cell: one entry per
 * distinct historical issue, with that issue's turns and token buckets rolled
 * up to issue-level totals. This is the distribution interface project-level
 * forecasters consume: they draw from these observed per-issue costs rather
 * than refitting a parametric model or re-walking raw records themselves.
 *
 * Each observation carries `tokens` and `turns` (the channels `forecastIssueCost`
 * forecasts) plus the aggregated `buckets` breakdown, so a caller holding a
 * `PricingTable` port can derive a dollar cost per observed issue. When a
 * `quotaModel` is supplied the per-issue peak quota fraction is captured too;
 * quota is single-issue only, so project-level callers ignore it.
 *
 * @param {{ size: unknown, model: unknown, [key: string]: unknown }} featureRecord
 * @param {Iterable<object> | AsyncIterable<object> | { records?: unknown, iterate?: unknown }} [usageSource]
 * @param {{ quotaModel?: { quotaFractionFor: (record: object) => number | null } }} [options]
 * @returns {Promise<Array<{ tokens: number, turns: number, buckets: TokenBuckets, quotaFractionMax: number | null }>>}
 */
export async function collectCellSamples(featureRecord, usageSource = [], options = {}) {
  const feature = normalizeFeatureRecord(featureRecord);
  const quotaModel = options.quotaModel ?? null;
  const perIssue = new Map();

  for await (const record of iterateEstimateTaggedUsageSource(usageSource)) {
    if (!matchesForecastCell(record, feature)) continue;

    const issueIdentifier = issueIdentifierFor(record);
    if (issueIdentifier === null) continue;

    const totalTokens = totalTokensFor(record);
    if (totalTokens === null) continue;

    let aggregate = perIssue.get(issueIdentifier);
    if (aggregate === undefined) {
      aggregate = {
        tokens: 0,
        turns: 0,
        buckets: emptyBuckets(),
        quotaFractionMax: null,
      };
      perIssue.set(issueIdentifier, aggregate);
    }
    aggregate.tokens += totalTokens;
    aggregate.turns += 1;
    addBuckets(aggregate.buckets, tokenBucketsFor(record));

    if (quotaModel !== null) {
      const fraction = quotaModel.quotaFractionFor(record);
      if (typeof fraction === 'number' && Number.isFinite(fraction)) {
        if (aggregate.quotaFractionMax === null || fraction > aggregate.quotaFractionMax) {
          aggregate.quotaFractionMax = fraction;
        }
      }
    }
  }

  return [...perIssue.values()];
}

/**
 * @param {unknown} source
 */
export async function *iterateEstimateTaggedUsageSource(source) {
  if (source === null || source === undefined) return;

  if (isAsyncIterable(source)) {
    yield* source;
    return;
  }
  if (isIterable(source)) {
    yield* source;
    return;
  }

  if (typeof source === 'object') {
    const objectSource = /** @type {{ records?: unknown, iterate?: unknown }} */ (source);
    if (typeof objectSource.records === 'function') {
      yield* iterateEstimateTaggedUsageSource(objectSource.records());
      return;
    }
    if (objectSource.records !== undefined) {
      yield* iterateEstimateTaggedUsageSource(objectSource.records);
      return;
    }
    if (typeof objectSource.iterate === 'function') {
      yield* iterateEstimateTaggedUsageSource(objectSource.iterate());
      return;
    }
  }

  throw new TypeError('forecastIssueCost: usageSource must be iterable');
}

/**
 * @param {number[]} values
 * @param {number} n
 */
function costForecast(values, n) {
  const quantiles = empiricalP50P80(values);
  return {
    p50: quantiles.p50,
    p80: quantiles.p80,
    n,
  };
}

/**
 * @param {{ buckets: TokenBuckets }[]} issueCosts
 * @param {string} model
 * @param {{ priceFor: (model: string, buckets: TokenBuckets) => number | null } | null} pricingTable
 */
function dollarsForecast(issueCosts, model, pricingTable) {
  if (pricingTable === null || typeof pricingTable.priceFor !== 'function') {
    return { p50: null, p80: null, n: 0 };
  }
  const values = [];
  for (const cost of issueCosts) {
    const usd = pricingTable.priceFor(model, cost.buckets);
    if (typeof usd === 'number' && Number.isFinite(usd)) values.push(usd);
  }
  return costForecast(values, values.length);
}

/**
 * @param {{ quotaFractionMax: number | null }[]} issueCosts
 * @param {{ quotaFractionFor: (record: object) => number | null } | null} quotaModel
 */
function quotaForecast(issueCosts, quotaModel) {
  if (quotaModel === null || typeof quotaModel.quotaFractionFor !== 'function') {
    return { quota: null, reason: 'no quota model' };
  }
  const values = [];
  for (const cost of issueCosts) {
    if (cost.quotaFractionMax !== null) values.push(cost.quotaFractionMax);
  }
  if (values.length === 0) {
    return { quota: null, reason: 'no quota samples' };
  }
  const quantiles = empiricalP50P80(values);
  return { quota: { p50: quantiles.p50, p80: quantiles.p80, n: values.length }, reason: null };
}

function emptyBuckets() {
  return {
    inputUncached: 0,
    inputCached: 0,
    cacheCreate5m: 0,
    cacheCreate1h: 0,
    outputVisible: 0,
    outputReasoning: 0,
  };
}

/**
 * @param {TokenBuckets} target
 * @param {TokenBuckets} delta
 */
function addBuckets(target, delta) {
  target.inputUncached += delta.inputUncached;
  target.inputCached += delta.inputCached;
  target.cacheCreate5m += delta.cacheCreate5m;
  target.cacheCreate1h += delta.cacheCreate1h;
  target.outputVisible += delta.outputVisible;
  target.outputReasoning += delta.outputReasoning;
}

/**
 * Extract a TokenBuckets-shaped breakdown from a usage record. Falls back to
 * crediting the bare `inputTokens` / `outputTokens` totals to `inputUncached`
 * and `outputVisible` so older or stripped records still produce a defensible
 * (if pessimistic) $ estimate.
 *
 * @param {unknown} record
 * @returns {TokenBuckets}
 */
function tokenBucketsFor(record) {
  const r = /** @type {Record<string, unknown>} */ (record);
  const inputUncached = nonNegativeNumber(r.inputUncachedTokens);
  const inputCached = nonNegativeNumber(r.inputCachedReadTokens);
  const cacheCreate5m = nonNegativeNumber(r.inputCacheWriteEphemeral5mTokens);
  const cacheCreate1h = nonNegativeNumber(r.inputCacheWriteEphemeral1hTokens);
  const outputVisible = nonNegativeNumber(r.outputVisibleTokens);
  const outputReasoning = nonNegativeNumber(r.outputReasoningTokens);

  const hasInputBreakdown =
    typeof r.inputUncachedTokens === 'number' ||
    typeof r.inputCachedReadTokens === 'number' ||
    typeof r.inputCacheWriteEphemeral5mTokens === 'number' ||
    typeof r.inputCacheWriteEphemeral1hTokens === 'number';
  const hasOutputBreakdown =
    typeof r.outputVisibleTokens === 'number' ||
    typeof r.outputReasoningTokens === 'number';

  return {
    inputUncached: hasInputBreakdown ? inputUncached : nonNegativeNumber(r.inputTokens),
    inputCached: hasInputBreakdown ? inputCached : 0,
    cacheCreate5m: hasInputBreakdown ? cacheCreate5m : 0,
    cacheCreate1h: hasInputBreakdown ? cacheCreate1h : 0,
    outputVisible: hasOutputBreakdown ? outputVisible : nonNegativeNumber(r.outputTokens),
    outputReasoning: hasOutputBreakdown ? outputReasoning : 0,
  };
}

function nonNegativeNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
}

/**
 * @param {unknown} featureRecord
 */
function normalizeFeatureRecord(featureRecord) {
  if (featureRecord === null || typeof featureRecord !== 'object' || Array.isArray(featureRecord)) {
    throw new TypeError('forecastIssueCost: featureRecord must be an object');
  }
  const record = /** @type {Record<string, unknown>} */ (featureRecord);
  const size = cellKey(record.size);
  const model = cellKey(record.model);
  if (size === null) throw new TypeError('forecastIssueCost: featureRecord.size is required');
  if (model === null) throw new TypeError('forecastIssueCost: featureRecord.model is required');
  return { size, model };
}

/**
 * @param {unknown} value
 */
function cellKey(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value === '') return null;
  return String(value);
}

/**
 * @param {unknown} value
 */
function normalizeMinSampleSize(value) {
  if (value === undefined) return DEFAULT_MIN_FORECAST_SAMPLE_SIZE;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new TypeError('forecastIssueCost: options.minSampleSize must be a positive integer');
  }
  return value;
}

/**
 * @param {unknown} record
 * @param {{ size: string, model: string }} feature
 */
function matchesForecastCell(record, feature) {
  if (record === null || typeof record !== 'object' || Array.isArray(record)) return false;
  const r = /** @type {Record<string, unknown>} */ (record);
  const nested = nestedFeatureRecord(r);
  const size = cellKey(firstPresent(r.size, nested?.size, r.estimate));
  const model = cellKey(firstPresent(r.model, nested?.model));
  return size === feature.size && model === feature.model;
}

/**
 * @param {Record<string, unknown>} record
 * @returns {Record<string, unknown> | null}
 */
function nestedFeatureRecord(record) {
  for (const key of ['featureRecord', 'features', 'feature']) {
    const value = record[key];
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      return /** @type {Record<string, unknown>} */ (value);
    }
  }
  return null;
}

/**
 * @param {...unknown} values
 */
function firstPresent(...values) {
  for (const value of values) {
    if (value !== null && value !== undefined) return value;
  }
  return undefined;
}

/**
 * @param {unknown} record
 */
function issueIdentifierFor(record) {
  if (record === null || typeof record !== 'object' || Array.isArray(record)) return null;
  const r = /** @type {Record<string, unknown>} */ (record);
  const value = firstPresent(r.issueIdentifier, r.issueID, r.issueId);
  const key = cellKey(value);
  return key === '' ? null : key;
}

/**
 * @param {unknown} record
 */
function totalTokensFor(record) {
  if (record === null || typeof record !== 'object' || Array.isArray(record)) return null;
  const r = /** @type {Record<string, unknown>} */ (record);
  if (r.usageSource === 'unavailable') return null;
  return typeof r.totalTokens === 'number' && Number.isFinite(r.totalTokens) && r.totalTokens >= 0
    ? r.totalTokens
    : null;
}

/**
 * @param {unknown} value
 * @returns {value is AsyncIterable<object>}
 */
function isAsyncIterable(value) {
  return value !== null &&
    typeof value === 'object' &&
    typeof /** @type {AsyncIterable<object>} */ (value)[Symbol.asyncIterator] === 'function';
}

/**
 * @param {unknown} value
 * @returns {value is Iterable<object>}
 */
function isIterable(value) {
  return value !== null &&
    typeof value === 'object' &&
    typeof /** @type {Iterable<object>} */ (value)[Symbol.iterator] === 'function';
}
