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
  const feature = normalizeFeatureRecord(featureRecord);
  const minSampleSize = normalizeMinSampleSize(options.minSampleSize);
  const perIssue = new Map();

  for await (const record of iterateEstimateTaggedUsageSource(usageSource)) {
    if (!matchesForecastCell(record, feature)) continue;

    const issueIdentifier = issueIdentifierFor(record);
    if (issueIdentifier === null) continue;

    const totalTokens = totalTokensFor(record);
    if (totalTokens === null) continue;

    let aggregate = perIssue.get(issueIdentifier);
    if (aggregate === undefined) {
      aggregate = { tokens: 0, turns: 0 };
      perIssue.set(issueIdentifier, aggregate);
    }
    aggregate.tokens += totalTokens;
    aggregate.turns += 1;
  }

  const issueCosts = [...perIssue.values()];
  const n = issueCosts.length;

  return {
    tokens: costForecast(issueCosts.map((cost) => cost.tokens), n),
    turns: costForecast(issueCosts.map((cost) => cost.turns), n),
    lowConfidence: n < minSampleSize,
    empty: n === 0,
  };
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
  const { size, model } = featureCellOf(record);
  return size === feature.size && model === feature.model;
}

/**
 * Extract the `{ size, model }` forecast cell a usage record belongs to, using
 * the same precedence the forecaster matches on: `size` (falling back to a
 * nested feature record's `size`, then the spec's `estimate` tag) and `model`
 * (falling back to a nested feature record's `model`). Either field is `null`
 * when absent, so the record belongs to no cell. Shared with `calibrate.mjs`
 * so the backtest interprets records identically to the forecaster.
 *
 * @param {unknown} record
 * @returns {{ size: string | null, model: string | null }}
 */
export function featureCellOf(record) {
  if (record === null || typeof record !== 'object' || Array.isArray(record)) {
    return { size: null, model: null };
  }
  const r = /** @type {Record<string, unknown>} */ (record);
  const nested = nestedFeatureRecord(r);
  return {
    size: cellKey(firstPresent(r.size, nested?.size, r.estimate)),
    model: cellKey(firstPresent(r.model, nested?.model)),
  };
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
 * Resolve the issue identifier a usage record is attributed to (`issueIdentifier`,
 * falling back to `issueID` / `issueId`). Returns `null` when none is present.
 * Exported so the calibration backtest groups records by the same key.
 *
 * @param {unknown} record
 */
export function issueIdentifierFor(record) {
  if (record === null || typeof record !== 'object' || Array.isArray(record)) return null;
  const r = /** @type {Record<string, unknown>} */ (record);
  const value = firstPresent(r.issueIdentifier, r.issueID, r.issueId);
  const key = cellKey(value);
  return key === '' ? null : key;
}

/**
 * The non-negative `totalTokens` a usage record contributes, or `null` when the
 * record is `usageSource === "unavailable"` or carries no valid count. Exported
 * so the calibration backtest sums each issue's cost exactly as the forecaster does.
 *
 * @param {unknown} record
 */
export function totalTokensFor(record) {
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
