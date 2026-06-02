import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { forecastIssueCost } from '../src/forecast.mjs';

// Spec §5.1 + §5.2.1/2/3 record. Tokens default to zero so each test only sets
// the buckets it cares about.
function usageRecord(overrides = {}) {
  return {
    schemaVersion: 1,
    recordedAt: '2026-06-01T00:00:00Z',
    runID: '00000000-0000-4000-8000-000000000000',
    turn: 1,
    issueIdentifier: 'GRV-1',
    provider: 'codex',
    model: 'gpt-5.4',
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

describe('forecastIssueCost (integration wrapper)', () => {
  it('returns P50/P80 + n for tokens, turns, and cost on a populated cell', async () => {
    const records = [];
    // 7 issues at size=L, model=gpt-5.4 with monotonically-increasing token volume.
    for (let i = 1; i <= 7; i++) {
      const totalTokens = i * 100;
      records.push(usageRecord({
        issueIdentifier: `GRV-${i}`,
        inputTokens: totalTokens,
        outputTokens: 0,
        totalTokens,
        inputUncachedTokens: totalTokens,
        outputVisibleTokens: 0,
      }));
    }
    const forecast = await forecastIssueCost({ size: 'L', model: 'gpt-5.4' }, records);

    assert.deepEqual(forecast.tokens, { p50: 400, p80: 600, n: 7 });
    assert.deepEqual(forecast.turns, { p50: 1, p80: 1, n: 7 });
    assert.ok(forecast.costUsd !== null, 'expected costUsd for a priced model');
    assert.equal(forecast.costUsd.n, 7);
    // gpt-5.4 inputPerMillionUsd = 2.5; cost(P50=400 tokens) = 400 * 2.5 / 1M = 0.001
    assert.ok(Math.abs(forecast.costUsd.p50 - 0.001) < 1e-9, `unexpected costUsd.p50: ${forecast.costUsd.p50}`);
    assert.ok(Math.abs(forecast.costUsd.p80 - 0.0015) < 1e-9, `unexpected costUsd.p80: ${forecast.costUsd.p80}`);
    assert.equal(forecast.empty, false);
    assert.equal(forecast.lowConfidence, false);
  });

  it('marks empty cells as empty + low confidence and returns n=0 for cost', async () => {
    const records = [usageRecord({ size: 'S' })];
    const forecast = await forecastIssueCost({ size: 'L', model: 'gpt-5.4' }, records);
    assert.deepEqual(forecast.tokens, { p50: null, p80: null, n: 0 });
    assert.deepEqual(forecast.turns, { p50: null, p80: null, n: 0 });
    assert.deepEqual(forecast.costUsd, { p50: null, p80: null, n: 0 });
    assert.equal(forecast.empty, true);
    assert.equal(forecast.lowConfidence, true);
    assert.equal(forecast.quota, null);
  });

  it('returns costUsd=null when the model has no pricing rates', async () => {
    const records = [usageRecord({ inputTokens: 100, totalTokens: 100 })];
    const forecast = await forecastIssueCost({ size: 'L', model: 'no-such-model' }, records);
    assert.equal(forecast.costUsd, null);
    assert.equal(forecast.tokens.n, 1);
  });

  it('forecasts per-window Codex quota deltas when records carry quota samples', async () => {
    const records = [
      usageRecord({
        issueIdentifier: 'GRV-1',
        endedAt: '2026-06-01T00:00:00Z',
        totalTokens: 10,
        inputTokens: 10,
        quota: { planType: 'pro', windows: [{ label: 'primary', windowMinutes: 300, usedPercent: 10 }] },
      }),
      usageRecord({
        issueIdentifier: 'GRV-1',
        endedAt: '2026-06-01T01:00:00Z',
        totalTokens: 10,
        inputTokens: 10,
        quota: { planType: 'pro', windows: [{ label: 'primary', windowMinutes: 300, usedPercent: 22 }] },
      }),
      usageRecord({
        issueIdentifier: 'GRV-2',
        endedAt: '2026-06-02T00:00:00Z',
        totalTokens: 10,
        inputTokens: 10,
        quota: { planType: 'pro', windows: [{ label: 'primary', windowMinutes: 300, usedPercent: 50 }] },
      }),
      usageRecord({
        issueIdentifier: 'GRV-2',
        endedAt: '2026-06-02T01:00:00Z',
        totalTokens: 10,
        inputTokens: 10,
        quota: { planType: 'pro', windows: [{ label: 'primary', windowMinutes: 300, usedPercent: 58 }] },
      }),
    ];
    const forecast = await forecastIssueCost({ size: 'L', model: 'gpt-5.4' }, records);
    assert.ok(forecast.quota !== null);
    // GRV-1 moved 12 pp, GRV-2 moved 8 pp → sorted [8, 12] → P50 nearest-rank index = ceil(0.5*2)-1 = 0 → 8
    assert.deepEqual(forecast.quota.primary, { p50: 8, p80: 12, n: 2 });
  });

  it('treats record.estimate as the size when `size` is absent', async () => {
    const records = [
      usageRecord({ issueIdentifier: 'GRV-1', size: undefined, estimate: 3, inputTokens: 100, totalTokens: 100 }),
      usageRecord({ issueIdentifier: 'GRV-2', size: undefined, estimate: 3, inputTokens: 200, totalTokens: 200 }),
    ];
    const forecast = await forecastIssueCost({ size: '3', model: 'gpt-5.4' }, records);
    assert.equal(forecast.tokens.n, 2);
    assert.equal(forecast.tokens.p50, 100);
  });

  it('skips records with usageSource="unavailable" when computing cost', async () => {
    const records = [
      usageRecord({
        issueIdentifier: 'GRV-1',
        usageSource: 'unavailable',
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
      }),
      usageRecord({ issueIdentifier: 'GRV-2', inputTokens: 100, totalTokens: 100 }),
    ];
    const forecast = await forecastIssueCost({ size: 'L', model: 'gpt-5.4' }, records);
    // The tokens forecast already drops `unavailable` records (forecaster contract),
    // so n=1.
    assert.equal(forecast.tokens.n, 1);
    assert.equal(forecast.costUsd.n, 1);
  });
});
