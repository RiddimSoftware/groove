import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { forecastIssueCost } from '../src/forecast.mjs';
import { forecastProjectCost } from '../src/project-forecast.mjs';

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

/**
 * Build a `{ size, model }` cell from a list of per-issue token totals. Each
 * value becomes one distinct single-turn historical issue, so the issue's
 * rolled-up tokens equal that value and its turns equal 1.
 */
function cell(size, model, tokenValues, prefix) {
  return tokenValues.map((tokens, index) => usageRecord({
    issueIdentifier: `${prefix}-${index}`,
    size,
    model,
    totalTokens: tokens,
    inputTokens: Math.round(tokens * 0.7),
    outputTokens: tokens - Math.round(tokens * 0.7),
  }));
}

function sum(values) {
  return values.reduce((acc, value) => acc + value, 0);
}

describe('forecastProjectCost', () => {
  it('convolution beats summed quantiles: project p80 < Σ per-issue p80, p50 ≈ Σ medians', async () => {
    // A symmetric per-issue cell: median 100, p80 125, mean 100.
    const usage = cell('L', 'sonnet', [50, 75, 100, 125, 150], 'HIST');
    const issues = Array.from({ length: 5 }, () => ({ size: 'L', model: 'sonnet' }));

    // Σ of the issues' individual P80s / medians, computed via GRV-3's API.
    const perIssue = [];
    for (const issue of issues) {
      perIssue.push(await forecastIssueCost(issue, usage));
    }
    const summedP80 = sum(perIssue.map((f) => f.tokens.p80)); // 5 × 125 = 625
    const summedP50 = sum(perIssue.map((f) => f.tokens.p50)); // 5 × 100 = 500

    const project = await forecastProjectCost(issues, usage, { seed: 1 });

    // Diversification: tail risk is sub-additive, so the convolved project P80
    // is strictly below the naive sum of per-issue P80s.
    assert.ok(
      project.tokens.p80 < summedP80,
      `expected project p80 ${project.tokens.p80} < summed p80 ${summedP80}`,
    );
    // ...but it still sits above the project median (it is a higher quantile).
    assert.ok(project.tokens.p80 > project.tokens.p50);
    // For (roughly) symmetric per-issue costs the project median tracks Σ medians.
    assert.ok(
      Math.abs(project.tokens.p50 - summedP50) <= 25,
      `expected project p50 ${project.tokens.p50} ≈ summed p50 ${summedP50}`,
    );

    assert.equal(project.empty, false);
    assert.equal(project.lowConfidence, false);
    assert.equal(project.issues, 5);
  });

  it('closed-form independence: simulated mean ≈ Σ means and variance ≈ Σ variances', async () => {
    // Cell X: {0, 100} → mean 50, population variance 2500.
    // Cell Y: {20, 40, 60} → mean 40, population variance 266.67.
    // Repeated to keep the empirical distribution identical while lifting n ≥ 5.
    const usage = [
      ...cell('S', 'sonnet', [0, 100, 0, 100, 0, 100], 'X'),
      ...cell('M', 'sonnet', [20, 40, 60, 20, 40, 60], 'Y'),
    ];
    const issues = [
      { size: 'S', model: 'sonnet' },
      { size: 'M', model: 'sonnet' },
    ];

    const expectedMean = 50 + 40;
    const expectedVariance = 2500 + (8000 / 30); // 2500 + 266.67

    const project = await forecastProjectCost(issues, usage, { seed: 7, iterations: 50_000 });

    assert.ok(
      Math.abs(project.tokens.mean - expectedMean) < 1.5,
      `simulated mean ${project.tokens.mean} ≈ Σ means ${expectedMean}`,
    );
    assert.ok(
      Math.abs(project.tokens.variance - expectedVariance) / expectedVariance < 0.05,
      `simulated variance ${project.tokens.variance} ≈ Σ variances ${expectedVariance}`,
    );
    assert.equal(project.lowConfidence, false);
  });

  it('samples the empirical cell, not a refit parametric', async () => {
    // A bimodal cell whose mean (500) is a value that never actually occurs.
    // A parametric refit would place mass near 500; empirical sampling of a
    // single-issue project can only ever total 0 or 1000.
    const usage = cell('L', 'opus', [0, 1000, 0, 1000, 0, 1000], 'BIMODAL');
    const project = await forecastProjectCost([{ size: 'L', model: 'opus' }], usage, { seed: 3 });

    assert.ok(
      [project.tokens.p50, project.tokens.p80].every((value) => value === 0 || value === 1000),
      `quantiles ${project.tokens.p50}/${project.tokens.p80} must be observed values, not refit`,
    );
  });

  it('is deterministic under a fixed seed and varies across seeds', async () => {
    const usage = cell('L', 'sonnet', [10, 20, 30, 40, 50, 60], 'D');
    const issues = [{ size: 'L', model: 'sonnet' }, { size: 'L', model: 'sonnet' }];

    const first = await forecastProjectCost(issues, usage, { seed: 123 });
    const second = await forecastProjectCost(issues, usage, { seed: 123 });
    assert.deepEqual(first, second);

    // Default seed is also reproducible run-to-run.
    const defaultA = await forecastProjectCost(issues, usage);
    const defaultB = await forecastProjectCost(issues, usage);
    assert.deepEqual(defaultA, defaultB);

    const different = await forecastProjectCost(issues, usage, { seed: 999 });
    assert.notEqual(first.tokens.mean, different.tokens.mean);
    assert.equal(different.seed, 999);
  });

  it('reports tokens, turns, and dollars channels — and excludes quota and wall-clock', async () => {
    const usage = cell('L', 'sonnet', [100, 200, 300, 400, 500], 'CH');
    const issues = [{ size: 'L', model: 'sonnet' }, { size: 'L', model: 'sonnet' }];
    const RATE = 0.000003; // $3 / 1M tokens

    const project = await forecastProjectCost(issues, usage, {
      seed: 5,
      priceUSD: (observation) => observation.tokens * RATE,
    });

    assert.equal(typeof project.tokens.p50, 'number');
    assert.equal(typeof project.turns.p50, 'number');
    assert.equal(project.dollars.priced, true);
    assert.equal(typeof project.dollars.p50, 'number');

    // Each issue contributes exactly one turn, so the project always has two.
    assert.equal(project.turns.p50, 2);
    assert.equal(project.turns.p80, 2);
    assert.equal(project.turns.variance, 0);

    // Dollars are a joint draw with tokens, so a linear price scales the mean.
    assert.ok(Math.abs(project.dollars.mean - project.tokens.mean * RATE) < 1e-9);

    // Windowed / scheduling quantities are intentionally absent (they don't sum).
    assert.equal('quota' in project, false);
    assert.equal('wallClock' in project, false);
  });

  it('leaves dollars unpriced when no pricing port is supplied', async () => {
    const usage = cell('L', 'sonnet', [100, 200, 300, 400, 500], 'NP');
    const project = await forecastProjectCost([{ size: 'L', model: 'sonnet' }], usage, { seed: 1 });

    assert.equal(project.dollars.priced, false);
    assert.equal(project.dollars.p50, null);
    assert.equal(project.dollars.p80, null);
  });

  it('flags thin cells as low confidence while still forecasting', async () => {
    const usage = cell('L', 'sonnet', [10, 20, 30], 'THIN');
    const project = await forecastProjectCost([{ size: 'L', model: 'sonnet' }], usage, { seed: 1 });

    assert.equal(project.empty, false);
    assert.equal(project.lowConfidence, true);
    assert.equal(typeof project.tokens.p50, 'number');
  });

  it('returns a clearly marked empty forecast when no issue has data', async () => {
    const usage = cell('S', 'sonnet', [10, 20, 30], 'OTHER');
    const project = await forecastProjectCost([{ size: 'L', model: 'opus' }], usage, { seed: 1 });

    assert.equal(project.empty, true);
    assert.equal(project.lowConfidence, true);
    assert.equal(project.tokens.p50, null);
    assert.equal(project.tokens.p80, null);
    assert.equal(project.dollars.priced, false);
  });

  it('forecasts issues that have data while flagging those that do not', async () => {
    // Only the {L, sonnet} cell has history; the {L, opus} issue has none.
    const usage = cell('L', 'sonnet', [100, 100, 100, 100, 100], 'PARTIAL');
    const issues = [{ size: 'L', model: 'sonnet' }, { size: 'L', model: 'opus' }];

    const project = await forecastProjectCost(issues, usage, { seed: 2 });

    assert.equal(project.empty, false);
    assert.equal(project.lowConfidence, true);
    // The data-less issue contributes 0, so the project total is just the
    // {L, sonnet} issue's constant 100.
    assert.equal(project.tokens.p50, 100);
    assert.equal(project.tokens.p80, 100);
  });

  it('rejects malformed inputs', async () => {
    const usage = cell('L', 'sonnet', [10, 20], 'V');

    await assert.rejects(() => forecastProjectCost([], usage), /must not be empty/);
    await assert.rejects(() => forecastProjectCost('nope', usage), /must be an array/);
    await assert.rejects(() => forecastProjectCost([{ model: 'sonnet' }], usage), /size is required/);
    await assert.rejects(() => forecastProjectCost([{ size: 'L' }], usage), /model is required/);
    await assert.rejects(
      () => forecastProjectCost([{ size: 'L', model: 'sonnet' }], usage, { iterations: 0 }),
      /iterations must be a positive integer/,
    );
    await assert.rejects(
      () => forecastProjectCost([{ size: 'L', model: 'sonnet' }], usage, { seed: Infinity }),
      /seed must be a finite number/,
    );
    await assert.rejects(
      () => forecastProjectCost([{ size: 'L', model: 'sonnet' }], usage, { priceUSD: 'x' }),
      /priceUSD must be a function/,
    );
  });
});
