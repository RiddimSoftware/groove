import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { forecastIssueCost } from '../src/forecast.mjs';

function usageRecord(overrides = {}) {
  return {
    schemaVersion: 1,
    recordedAt: '2026-06-01T00:00:00Z',
    runID: '00000000-0000-4000-8000-000000000000',
    turn: 1,
    issueIdentifier: 'GRV-1',
    provider: 'codex',
    model: 'sonnet',
    botRole: 'developer',
    size: 'L',
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    usageSource: 'provider_reported',
    startedAt: '2026-06-01T00:00:00Z',
    endedAt: '2026-06-01T00:00:01Z',
    ...overrides,
  };
}

function issueRecords(issueIdentifier, totalTokens, turnCount, overrides = {}) {
  const base = Math.floor(totalTokens / turnCount);
  const remainder = totalTokens - (base * turnCount);
  return Array.from({ length: turnCount }, (_, idx) => usageRecord({
    ...overrides,
    issueIdentifier,
    turn: idx + 1,
    totalTokens: base + (idx === turnCount - 1 ? remainder : 0),
  }));
}

describe('forecastIssueCost', () => {
  it('returns P50/P80 token and turn forecasts for a populated cell', async () => {
    const records = [
      ...issueRecords('GRV-1', 100, 1),
      ...issueRecords('GRV-2', 200, 2),
      ...issueRecords('GRV-3', 300, 3),
      ...issueRecords('GRV-4', 400, 4),
      ...issueRecords('GRV-5', 500, 5),
      ...issueRecords('GRV-6', 600, 6),
      ...issueRecords('GRV-7', 700, 7),
      ...issueRecords('GRV-8', 9999, 1, { size: 'M' }),
      ...issueRecords('GRV-9', 9999, 1, { model: 'opus' }),
    ];

    const forecast = await forecastIssueCost({ size: 'L', model: 'sonnet' }, records);

    assert.deepEqual(forecast.tokens, { p50: 400, p80: 600, n: 7 });
    assert.deepEqual(forecast.turns, { p50: 4, p80: 6, n: 7 });
    assert.equal(forecast.lowConfidence, false);
    assert.equal(forecast.empty, false);
  });

  it('aggregates per issue before computing quantiles', async () => {
    const records = [
      ...issueRecords('GRV-1', 1000, 2),
      ...issueRecords('GRV-2', 10, 1),
      ...issueRecords('GRV-3', 20, 1),
      ...issueRecords('GRV-4', 30, 1),
      ...issueRecords('GRV-5', 40, 1),
    ];

    const forecast = await forecastIssueCost({ size: 'L', model: 'sonnet' }, records);

    assert.deepEqual(forecast.tokens, { p50: 30, p80: 40, n: 5 });
    assert.deepEqual(forecast.turns, { p50: 1, p80: 1, n: 5 });
  });

  it('marks thin cells as low confidence while returning empirical quantiles', async () => {
    const records = [
      ...issueRecords('GRV-1', 10, 1),
      ...issueRecords('GRV-2', 20, 1),
      ...issueRecords('GRV-3', 30, 1),
    ];

    const forecast = await forecastIssueCost({ size: 'L', model: 'sonnet' }, records);

    assert.deepEqual(forecast.tokens, { p50: 20, p80: 30, n: 3 });
    assert.deepEqual(forecast.turns, { p50: 1, p80: 1, n: 3 });
    assert.equal(forecast.lowConfidence, true);
    assert.equal(forecast.empty, false);
  });

  it('returns a clearly marked empty result for empty cells', async () => {
    const forecast = await forecastIssueCost(
      { size: 'L', model: 'sonnet', repo: 'RiddimSoftware/groove', type: 'feature' },
      [usageRecord({ size: 'S' })],
    );

    assert.deepEqual(forecast.tokens, { p50: null, p80: null, n: 0 });
    assert.deepEqual(forecast.turns, { p50: null, p80: null, n: 0 });
    assert.equal(forecast.lowConfidence, true);
    assert.equal(forecast.empty, true);
  });

  it('accepts estimate and nested feature tags from forward-compatible records', async () => {
    async function *source() {
      yield usageRecord({ issueIdentifier: 'GRV-1', size: undefined, estimate: 'L', totalTokens: 100 });
      yield usageRecord({
        issueIdentifier: 'GRV-2',
        size: undefined,
        estimate: 8,
        model: undefined,
        featureRecord: { size: 'L', model: 'sonnet', repo: 'RiddimSoftware/groove' },
        totalTokens: 200,
      });
    }

    const forecast = await forecastIssueCost({ size: 'L', model: 'sonnet', type: 'bug' }, { records: source });

    assert.deepEqual(forecast.tokens, { p50: 100, p80: 200, n: 2 });
    assert.deepEqual(forecast.turns, { p50: 1, p80: 1, n: 2 });
    assert.equal(forecast.lowConfidence, true);
  });
});
