import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { forecastIssueCost } from '../src/forecast.mjs';
import {
  DEFAULT_PRICING_TABLE,
  DEFAULT_QUOTA_MODEL,
  forecastIssueCost as forecastIssueCostWired,
} from '../src/index.mjs';

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

  it('defaults the dollars channel to an empty result when no pricing port is wired', async () => {
    const forecast = await forecastIssueCost(
      { size: 'L', model: 'claude-sonnet-4.6' },
      [usageRecord({ model: 'claude-sonnet-4.6', totalTokens: 1000 })],
    );

    assert.deepEqual(forecast.dollars, { p50: null, p80: null, n: 0 });
  });

  it('defaults the quota channel to null with a reason when no quota port is wired', async () => {
    const forecast = await forecastIssueCost(
      { size: 'L', model: 'gpt-5.5' },
      [usageRecord({ model: 'gpt-5.5', totalTokens: 1000 })],
    );

    assert.equal(forecast.quota, null);
    assert.equal(forecast.quotaReason, 'no quota model');
  });
});

function tokenBreakdownRecord(overrides = {}) {
  const inputUncached = overrides.inputUncached ?? 1000;
  const inputCached = overrides.inputCached ?? 0;
  const outputVisible = overrides.outputVisible ?? 500;
  const outputReasoning = overrides.outputReasoning ?? 0;
  const totalTokens = inputUncached + inputCached + outputVisible + outputReasoning;
  return {
    schemaVersion: 1,
    recordedAt: '2026-06-01T00:00:00Z',
    runID: overrides.runID ?? '00000000-0000-4000-8000-000000000000',
    turn: overrides.turn ?? 1,
    issueIdentifier: overrides.issueIdentifier ?? 'GRV-1',
    provider: overrides.provider ?? 'claude',
    model: overrides.model ?? 'claude-sonnet-4.6',
    botRole: 'developer',
    size: overrides.size ?? 'L',
    inputTokens: inputUncached + inputCached,
    outputTokens: outputVisible + outputReasoning,
    totalTokens,
    inputUncachedTokens: inputUncached,
    inputCachedReadTokens: inputCached,
    outputVisibleTokens: outputVisible,
    outputReasoningTokens: outputReasoning,
    usageSource: 'provider_reported',
    startedAt: '2026-06-01T00:00:00Z',
    endedAt: '2026-06-01T00:00:01Z',
    ...overrides,
  };
}

function codexQuotaRecord(overrides = {}) {
  const usedPercent = overrides.usedPercent ?? 10;
  return tokenBreakdownRecord({
    provider: 'codex',
    model: overrides.model ?? 'gpt-5.5',
    outputReasoning: overrides.outputReasoning ?? 100,
    quota: {
      planType: 'pro',
      windows: [
        { label: 'primary', windowMinutes: 300, usedPercent },
        { label: 'secondary', windowMinutes: 10080, usedPercent: usedPercent / 2 },
      ],
    },
    ...overrides,
  });
}

describe('forecastIssueCost — dollars channel', () => {
  it('derives $ per issue from the aggregated token breakdown via pricing.mjs', async () => {
    // Build a Claude-sonnet-4.6 cell with increasing per-issue token volumes
    // so the resulting $ distribution must be monotonic with the token bands.
    const records = [];
    for (let i = 1; i <= 7; i++) {
      records.push(tokenBreakdownRecord({
        issueIdentifier: `GRV-${i}`,
        runID: `run-${i}`,
        inputUncached: 1_000_000 * i,
        outputVisible: 200_000 * i,
      }));
    }

    const forecast = await forecastIssueCostWired({ size: 'L', model: 'claude-sonnet-4.6' }, records);

    assert.equal(forecast.dollars.n, 7);
    assert.ok(forecast.dollars.p50 !== null && forecast.dollars.p80 !== null);
    // P80 ≥ P50 (the AC's monotonicity-with-token-bands clause).
    assert.ok(forecast.dollars.p80 >= forecast.dollars.p50);
    // P50 ≥ P50(tokens) implies positive $; both bands should be > 0.
    assert.ok(forecast.dollars.p50 > 0);

    // Spot-check: the median issue is i=4 → 4M input @ $3/M + 0.8M output @ $15/M = $24.
    assert.ok(Math.abs(forecast.dollars.p50 - 24) < 1e-6, `expected ~$24, got $${forecast.dollars.p50}`);
    // P80 corresponds to i=6 → 6M @ $3/M + 1.2M @ $15/M = $36.
    assert.ok(Math.abs(forecast.dollars.p80 - 36) < 1e-6, `expected ~$36, got $${forecast.dollars.p80}`);
  });

  it('returns an empty dollars result when no record matches the cell', async () => {
    const forecast = await forecastIssueCostWired(
      { size: 'L', model: 'claude-sonnet-4.6' },
      [tokenBreakdownRecord({ size: 'S' })],
    );

    assert.deepEqual(forecast.dollars, { p50: null, p80: null, n: 0 });
  });

  it('returns an empty dollars result when the cell model is unknown to pricing', async () => {
    const records = [
      tokenBreakdownRecord({ model: 'mystery-model-1', issueIdentifier: 'GRV-1', inputUncached: 1000, outputVisible: 100 }),
      tokenBreakdownRecord({ model: 'mystery-model-1', issueIdentifier: 'GRV-2', inputUncached: 2000, outputVisible: 200 }),
    ];

    const forecast = await forecastIssueCostWired({ size: 'L', model: 'mystery-model-1' }, records);

    assert.deepEqual(forecast.tokens, { p50: 1100, p80: 2200, n: 2 });
    assert.deepEqual(forecast.dollars, { p50: null, p80: null, n: 0 });
  });

  it('accepts a custom pricingTable port that overrides the default rate table', async () => {
    const fixedRate = { priceFor: () => 7 };

    const records = [
      tokenBreakdownRecord({ issueIdentifier: 'GRV-1' }),
      tokenBreakdownRecord({ issueIdentifier: 'GRV-2' }),
    ];

    const forecast = await forecastIssueCost(
      { size: 'L', model: 'claude-sonnet-4.6' },
      records,
      { pricingTable: fixedRate },
    );

    assert.deepEqual(forecast.dollars, { p50: 7, p80: 7, n: 2 });
  });
});

describe('forecastIssueCost — quota channel', () => {
  it('returns Codex quota P50/P80 when matching records carry rate_limits samples', async () => {
    const records = [];
    for (let i = 1; i <= 7; i++) {
      records.push(codexQuotaRecord({
        issueIdentifier: `GRV-${i}`,
        runID: `run-${i}`,
        usedPercent: i * 10,
      }));
    }

    const forecast = await forecastIssueCostWired({ size: 'L', model: 'gpt-5.5' }, records);

    assert.deepEqual(forecast.quota, { p50: 0.4, p80: 0.6, n: 7 });
    assert.equal(forecast.quotaReason, undefined);
  });

  it('uses the peak primary-window fraction per issue (does not sum across turns)', async () => {
    // Two turns for the same issue at 30% and 70%. Per-issue value must be 0.7
    // (peak), not 1.0 (sum) — quota does not aggregate.
    const records = [
      codexQuotaRecord({ issueIdentifier: 'GRV-1', runID: 'run-1', turn: 1, usedPercent: 30 }),
      codexQuotaRecord({ issueIdentifier: 'GRV-1', runID: 'run-1', turn: 2, usedPercent: 70 }),
    ];

    const forecast = await forecastIssueCostWired({ size: 'L', model: 'gpt-5.5' }, records);

    assert.deepEqual(forecast.quota, { p50: 0.7, p80: 0.7, n: 1 });
  });

  it('returns null quota with a reason when no record carries a quota sample', async () => {
    const records = [
      tokenBreakdownRecord({ model: 'claude-sonnet-4.6', issueIdentifier: 'GRV-1' }),
      tokenBreakdownRecord({ model: 'claude-sonnet-4.6', issueIdentifier: 'GRV-2' }),
    ];

    const forecast = await forecastIssueCostWired({ size: 'L', model: 'claude-sonnet-4.6' }, records);

    assert.equal(forecast.quota, null);
    assert.equal(forecast.quotaReason, 'no quota samples');
  });

  it('returns null quota with a reason for a non-Codex cell even if a Codex record happens to be in the source', async () => {
    // A Codex record exists but doesn't match the Claude cell — quota signal
    // is filtered out by cell match, so we land in the "no quota samples" branch.
    const records = [
      codexQuotaRecord({ issueIdentifier: 'GRV-1', model: 'gpt-5.5', size: 'S' }),
      tokenBreakdownRecord({ model: 'claude-sonnet-4.6', issueIdentifier: 'GRV-2' }),
    ];

    const forecast = await forecastIssueCostWired({ size: 'L', model: 'claude-sonnet-4.6' }, records);

    assert.equal(forecast.quota, null);
    assert.equal(forecast.quotaReason, 'no quota samples');
  });
});

describe('default port adapters', () => {
  it('DEFAULT_PRICING_TABLE delegates to pricing.mjs and exposes USD totals', () => {
    const usd = DEFAULT_PRICING_TABLE.priceFor('claude-sonnet-4.6', {
      inputUncached: 1_000_000, inputCached: 0,
      cacheCreate5m: 0, cacheCreate1h: 0,
      outputVisible: 1_000_000, outputReasoning: 0,
    });
    // 1M input @ $3/M + 1M output @ $15/M = $18.
    assert.equal(usd, 18);
    assert.equal(DEFAULT_PRICING_TABLE.priceFor('unknown-model', {
      inputUncached: 1_000, inputCached: 0, cacheCreate5m: 0, cacheCreate1h: 0,
      outputVisible: 0, outputReasoning: 0,
    }), null);
  });

  it('DEFAULT_QUOTA_MODEL extracts the primary-window fraction from a Codex record', () => {
    const record = codexQuotaRecord({ usedPercent: 42 });
    assert.equal(DEFAULT_QUOTA_MODEL.quotaFractionFor(record), 0.42);
  });

  it('DEFAULT_QUOTA_MODEL returns null for non-Codex records', () => {
    assert.equal(DEFAULT_QUOTA_MODEL.quotaFractionFor(tokenBreakdownRecord({ provider: 'claude' })), null);
  });

  it('DEFAULT_QUOTA_MODEL returns null when the record has no primary window', () => {
    const record = codexQuotaRecord();
    record.quota = { planType: 'pro', windows: [{ label: 'secondary', windowMinutes: 10080, usedPercent: 50 }] };
    assert.equal(DEFAULT_QUOTA_MODEL.quotaFractionFor(record), null);
  });
});
