import { empiricalP50P80 } from './quantiles.mjs';

export const DEFAULT_MIN_FORECAST_SAMPLE_SIZE = 5;

/**
 * Forecast per-issue token and turn cost for a `{ size, model }` cell.
 *
 * The source is an iterable port: pass an Array, async generator, or an object
 * with `records()` / `iterate()` returning either. The function intentionally
 * has no filesystem dependency; callers can pass `readUsageRecords(path)`.
 *
 * v0 conditions only on `{ size, model }`. Unknown feature keys are accepted
 * and ignored so the conditioning record can grow later.
 *
 * @param {{ size: unknown, model: unknown, [key: string]: unknown }} featureRecord
 * @param {Iterable<object> | AsyncIterable<object> | { records?: unknown, iterate?: unknown }} [usageSource]
 * @param {{ minSampleSize?: number }} [options]
 * @returns {Promise<{
 *   tokens: { p50: number | null, p80: number | null, n: number },
 *   turns: { p50: number | null, p80: number | null, n: number },
 *   lowConfidence: boolean,
 *   empty: boolean
 * }>}
 */
export async function forecastIssueCost(featureRecord, usageSource = [], options = {}) {
  const minSampleSize = normalizeMinSampleSize(options.minSampleSize);
  const issueCosts = await collectCellSamples(featureRecord, usageSource);
  const n = issueCosts.length;

  return {
    tokens: costForecast(issueCosts.map((cost) => cost.tokens), n),
    turns: costForecast(issueCosts.map((cost) => cost.turns), n),
    lowConfidence: n < minSampleSize,
    empty: n === 0,
  };
}

/**
 * The per-cell sampler that `forecastIssueCost` reads. Returns the empirical
 * per-issue cost observations for a `{ size, model }` cell: one entry per
 * distinct historical issue, with that issue's turns rolled up to project-level
 * totals. This is the distribution interface project-level forecasters consume
 * — they draw from these observed per-issue costs rather than refitting a
 * parametric model or re-walking raw records themselves.
 *
 * Each observation carries `tokens` and `turns` (the channels `forecastIssueCost`
 * forecasts) plus the `inputTokens` / `outputTokens` split, so a caller that
 * supplies a pricing port can derive a dollar cost per observed issue.
 *
 * @param {{ size: unknown, model: unknown, [key: string]: unknown }} featureRecord
 * @param {Iterable<object> | AsyncIterable<object> | { records?: unknown, iterate?: unknown }} [usageSource]
 * @returns {Promise<Array<{ tokens: number, turns: number, inputTokens: number, outputTokens: number }>>}
 */
export async function collectCellSamples(featureRecord, usageSource = []) {
  const feature = normalizeFeatureRecord(featureRecord);
  const perIssue = new Map();

  for await (const record of iterateEstimateTaggedUsageSource(usageSource)) {
    if (!matchesForecastCell(record, feature)) continue;

    const issueIdentifier = issueIdentifierFor(record);
    if (issueIdentifier === null) continue;

    const totalTokens = totalTokensFor(record);
    if (totalTokens === null) continue;

    let aggregate = perIssue.get(issueIdentifier);
    if (aggregate === undefined) {
      aggregate = { tokens: 0, turns: 0, inputTokens: 0, outputTokens: 0 };
      perIssue.set(issueIdentifier, aggregate);
    }
    aggregate.tokens += totalTokens;
    aggregate.turns += 1;
    aggregate.inputTokens += nonNegInt(record.inputTokens);
    aggregate.outputTokens += nonNegInt(record.outputTokens);
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
 * Coerce an optional token-count field to a non-negative number, defaulting to
 * 0 when absent or null (the spec allows null token counts on some records).
 *
 * @param {unknown} value
 */
function nonNegInt(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
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
