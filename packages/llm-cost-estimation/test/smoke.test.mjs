import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  enrichUsageWithEstimate,
  forecastIssueCost,
  forecastProjectCost,
  calibrate,
  createLinearEstimateSource,
} from '../src/index.mjs';

// `enrichUsageWithEstimate` (GRV-2) and `forecastIssueCost` (GRV-3 + GRV-5 +
// GRV-8 wiring) are implemented; `forecastProjectCost` (GRV-6) and `calibrate`
// (planned) are still stubs.
describe('llm-cost-estimation barrel', () => {
  it('forecastIssueCost returns the documented shape on an empty source', async () => {
    const forecast = await forecastIssueCost({ size: 'L', model: 'claude-sonnet-4-6' }, []);
    assert.equal(forecast.empty, true);
    assert.equal(forecast.lowConfidence, true);
    assert.equal(forecast.tokens.n, 0);
    assert.equal(forecast.turns.n, 0);
    assert.equal(forecast.dollars.n, 0);
    assert.equal(forecast.quota, null);
    assert.equal(typeof forecast.quotaReason, 'string');
  });

  it('enrichUsageWithEstimate is exported from the barrel', () => {
    assert.equal(typeof enrichUsageWithEstimate, 'function');
  });

  it('createLinearEstimateSource is exported from the barrel', () => {
    assert.equal(typeof createLinearEstimateSource, 'function');
  });

  it('forecastProjectCost throws "not implemented"', async () => {
    await assert.rejects(() => forecastProjectCost('proj-1', []), /not implemented/);
  });

  it('calibrate throws "not implemented"', () => {
    assert.throws(() => calibrate([]), /not implemented/);
  });
});
