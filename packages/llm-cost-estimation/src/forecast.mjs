/**
 * `ForecastIssueCost` integration: composes the empirical-quantile forecaster
 * from `llm-cost-attribution` (tokens + turns) with dollar and quota
 * forecasting derived from the same record stream.
 *
 * Inputs: a `{ size, model }` feature record and an iterable of
 * estimate-tagged usage records (Symphony Cost Telemetry Extension spec §5).
 * Output: P50/P80 + n for tokens, turns, dollar cost, and (when records
 * carry Codex `quota` samples) per-window quota delta.
 *
 * Pure: no filesystem, no Linear, no HTTP. Callers supply the records.
 */
import {
  empiricalP50P80,
  forecastIssueCost as forecastTokenAndTurnForecast,
  ratesForModel,
  calculateCost,
} from 'llm-cost-attribution';

/**
 * @typedef {{ p50: number | null, p80: number | null, n: number }} QuantilePoint
 *
 * @typedef {object} CellForecast
 * @property {QuantilePoint} tokens
 * @property {QuantilePoint} turns
 * @property {QuantilePoint | null} costUsd       null when no rates are known for the model.
 * @property {Record<string, QuantilePoint> | null} quota  per-window-label deltas (Codex only).
 * @property {boolean} lowConfidence
 * @property {boolean} empty
 */

/**
 * Forecast tokens, turns, dollar cost, and (for Codex) quota delta for a
 * `{ size, model }` cell over a set of estimate-tagged usage records.
 *
 * Records are matched on `size` and `model` exactly like the underlying
 * `forecastIssueCost` from `llm-cost-attribution` (records' `estimate` field
 * is treated as `size` when `size` is absent — spec §5.2).
 *
 * @param {{ size: unknown, model: unknown }} featureRecord
 * @param {Iterable<object> | AsyncIterable<object>} records
 * @param {{ minSampleSize?: number }} [options]
 * @returns {Promise<CellForecast>}
 */
export async function forecastIssueCost(featureRecord, records, options = {}) {
  const materialized = await materialize(records);
  const tokensAndTurns = await forecastTokenAndTurnForecast(featureRecord, materialized, options);
  const costUsd = costForecastFor(featureRecord, materialized);
  const quota = quotaForecastFor(featureRecord, materialized);
  return {
    tokens: tokensAndTurns.tokens,
    turns: tokensAndTurns.turns,
    costUsd,
    quota,
    lowConfidence: tokensAndTurns.lowConfidence,
    empty: tokensAndTurns.empty,
  };
}

async function materialize(records) {
  if (records === null || records === undefined) return [];
  if (Array.isArray(records)) return records;
  const out = [];
  for await (const rec of records) out.push(rec);
  return out;
}

function costForecastFor(feature, records) {
  const model = cellKey(feature.model);
  if (model === null) return null;
  if (ratesForModel(model) === null) return null;

  const perIssue = new Map();
  for (const record of records) {
    if (!matchesCell(record, feature)) continue;
    if (record.usageSource === 'unavailable') continue;
    const issue = issueIdentifierFor(record);
    if (issue === null) continue;
    const buckets = toTokenBuckets(record);
    const cost = calculateCost(model, buckets);
    if (cost === null) return null;
    perIssue.set(issue, (perIssue.get(issue) ?? 0) + cost.totalUsd);
  }
  const dollars = [...perIssue.values()];
  const { p50, p80 } = empiricalP50P80(dollars);
  return { p50, p80, n: dollars.length };
}

function quotaForecastFor(feature, records) {
  // Per issue, per window-label: delta = lastUsedPercent - firstUsedPercent.
  // Forecasts how much a new issue at this size+model tends to consume.
  const perIssue = new Map();
  let sawQuota = false;
  for (const record of records) {
    if (!matchesCell(record, feature)) continue;
    if (record.usageSource === 'unavailable') continue;
    const issue = issueIdentifierFor(record);
    if (issue === null) continue;
    const quota = record.quota;
    if (quota === null || typeof quota !== 'object' || !Array.isArray(quota.windows)) continue;
    const stamp = typeof record.endedAt === 'string' && record.endedAt !== ''
      ? record.endedAt
      : (typeof record.recordedAt === 'string' ? record.recordedAt : '');
    let perWindow = perIssue.get(issue);
    if (perWindow === undefined) {
      perWindow = new Map();
      perIssue.set(issue, perWindow);
    }
    for (const window of quota.windows) {
      if (typeof window?.label !== 'string') continue;
      if (typeof window.usedPercent !== 'number' || !Number.isFinite(window.usedPercent)) continue;
      sawQuota = true;
      const entry = perWindow.get(window.label);
      if (entry === undefined) {
        perWindow.set(window.label, { firstStamp: stamp, firstUsed: window.usedPercent, lastStamp: stamp, lastUsed: window.usedPercent });
      } else {
        if (stamp !== '' && stamp < entry.firstStamp) {
          entry.firstStamp = stamp;
          entry.firstUsed = window.usedPercent;
        }
        if (stamp !== '' && stamp >= entry.lastStamp) {
          entry.lastStamp = stamp;
          entry.lastUsed = window.usedPercent;
        }
      }
    }
  }

  if (!sawQuota) return null;

  const deltasByLabel = new Map();
  for (const perWindow of perIssue.values()) {
    for (const [label, entry] of perWindow) {
      const delta = entry.lastUsed - entry.firstUsed;
      const arr = deltasByLabel.get(label) ?? [];
      arr.push(delta);
      deltasByLabel.set(label, arr);
    }
  }

  const out = {};
  for (const [label, deltas] of deltasByLabel) {
    const { p50, p80 } = empiricalP50P80(deltas);
    out[label] = { p50, p80, n: deltas.length };
  }
  return out;
}

function matchesCell(record, feature) {
  if (record === null || typeof record !== 'object' || Array.isArray(record)) return false;
  const nested = nestedFeatureRecord(record);
  const size = cellKey(firstPresent(record.size, nested?.size, record.estimate));
  const model = cellKey(firstPresent(record.model, nested?.model));
  return size === cellKey(feature.size) && model === cellKey(feature.model);
}

function nestedFeatureRecord(record) {
  for (const key of ['featureRecord', 'features', 'feature']) {
    const value = record[key];
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) return value;
  }
  return null;
}

function firstPresent(...values) {
  for (const value of values) {
    if (value !== null && value !== undefined) return value;
  }
  return undefined;
}

function issueIdentifierFor(record) {
  if (record === null || typeof record !== 'object') return null;
  const value = record.issueIdentifier ?? record.issueID ?? record.issueId;
  const key = cellKey(value);
  return key === '' ? null : key;
}

function cellKey(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value === '') return null;
  return String(value);
}

function toTokenBuckets(record) {
  const hasInputBreakdown =
    typeof record.inputUncachedTokens === 'number' ||
    typeof record.inputCachedReadTokens === 'number' ||
    typeof record.inputCacheWriteTokens === 'number';

  const inputUncached = hasInputBreakdown
    ? numOr0(record.inputUncachedTokens)
    : numOr0(record.inputTokens);
  const inputCached = numOr0(record.inputCachedReadTokens);

  let cacheCreate5m = numOr0(record.inputCacheWriteEphemeral5mTokens);
  let cacheCreate1h = numOr0(record.inputCacheWriteEphemeral1hTokens);
  const writeTotal = numOr0(record.inputCacheWriteTokens);
  const splitTotal = cacheCreate5m + cacheCreate1h;
  if (writeTotal > splitTotal) {
    cacheCreate5m += (writeTotal - splitTotal);
  }

  const hasOutputBreakdown =
    typeof record.outputVisibleTokens === 'number' ||
    typeof record.outputReasoningTokens === 'number';
  const outputVisible = hasOutputBreakdown
    ? numOr0(record.outputVisibleTokens)
    : numOr0(record.outputTokens);
  const outputReasoning = numOr0(record.outputReasoningTokens);

  return { inputUncached, inputCached, cacheCreate5m, cacheCreate1h, outputVisible, outputReasoning };
}

function numOr0(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}
