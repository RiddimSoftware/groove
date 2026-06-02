/**
 * Core correctness test for the empirical quantile forecaster (GRV-3).
 *
 * A forecaster nobody calibrated is a horoscope. Here we draw synthetic
 * per-issue costs from a log-normal distribution whose median (P50) and 80th
 * percentile (P80) we chose analytically, then assert `forecastIssueCost`
 * recovers those quantiles within tolerance. If the estimator can't recover a
 * distribution it was *handed*, its forecasts on real data mean nothing.
 */
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { forecastIssueCost } from '../src/forecast.mjs';
import { syntheticUsageRecords } from '../src/synthetic.mjs';

/** Assert `actual` is within `tol` (relative) of `expected`. */
function assertWithinRelative(actual, expected, tol, label) {
  assert.notEqual(actual, null, `${label}: forecast was null`);
  const relErr = Math.abs(actual - expected) / expected;
  assert.ok(
    relErr <= tol,
    `${label}: expected ≈${expected}, got ${actual} (relative error ${(relErr * 100).toFixed(2)}% > ${(tol * 100).toFixed(0)}%)`,
  );
}

describe('forecastIssueCost recovers a known distribution', () => {
  // n=5000 log-normal draws recover the chosen quantiles to well under 1%;
  // a 5% tolerance proves recovery with comfortable margin against seed noise.
  const N = 5000;
  const TOL = 0.05;

  for (const { p50, p80 } of [
    { p50: 1000, p80: 2000 },
    { p50: 50000, p80: 90000 },
    { p50: 200, p80: 260 },
  ]) {
    it(`recovers P50≈${p50} / P80≈${p80} from a log-normal cell`, async () => {
      const records = syntheticUsageRecords({ p50, p80, n: N, seed: 12345, size: 'L', model: 'sonnet' });

      const forecast = await forecastIssueCost({ size: 'L', model: 'sonnet' }, records);

      assert.equal(forecast.empty, false);
      assert.equal(forecast.lowConfidence, false);
      assert.equal(forecast.tokens.n, N);
      assertWithinRelative(forecast.tokens.p50, p50, TOL, 'P50');
      assertWithinRelative(forecast.tokens.p80, p80, TOL, 'P80');
      // P80 must sit above P50 — the band has positive width.
      assert.ok(forecast.tokens.p80 > forecast.tokens.p50, 'P80 should exceed P50');
    });
  }

  it('only conditions on the requested {size, model} cell', async () => {
    // Two cells with very different scales; the forecaster must isolate the cell.
    const cellL = syntheticUsageRecords({ p50: 1000, p80: 2000, n: N, seed: 7, size: 'L', model: 'sonnet', idPrefix: 'L' });
    const cellS = syntheticUsageRecords({ p50: 100000, p80: 200000, n: N, seed: 7, size: 'S', model: 'sonnet', idPrefix: 'S' });

    const forecast = await forecastIssueCost({ size: 'L', model: 'sonnet' }, [...cellL, ...cellS]);

    assert.equal(forecast.tokens.n, N, 'other cells must not leak into this cell');
    assertWithinRelative(forecast.tokens.p50, 1000, TOL, 'P50');
    assertWithinRelative(forecast.tokens.p80, 2000, TOL, 'P80');
  });

  it('is deterministic under a fixed seed', async () => {
    const a = syntheticUsageRecords({ p50: 3000, p80: 7000, n: 1000, seed: 99 });
    const b = syntheticUsageRecords({ p50: 3000, p80: 7000, n: 1000, seed: 99 });
    assert.deepEqual(a, b, 'same seed must produce identical records');

    const fa = await forecastIssueCost({ size: 'L', model: 'sonnet' }, a);
    const fb = await forecastIssueCost({ size: 'L', model: 'sonnet' }, b);
    assert.deepEqual(fa, fb, 'same records must produce identical forecasts');
  });

  it('changes draw with the seed', async () => {
    const a = syntheticUsageRecords({ p50: 3000, p80: 7000, n: 1000, seed: 1 });
    const b = syntheticUsageRecords({ p50: 3000, p80: 7000, n: 1000, seed: 2 });
    assert.notDeepEqual(a, b, 'different seeds should produce different draws');
  });
});
