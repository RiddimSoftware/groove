import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  enrichUsageWithEstimate,
  forecastIssueCost,
  forecastProjectCost,
  calibrateCoverage,
  calibrate,
  createLinearEstimateSource,
} from '../src/index.mjs';

// `enrichUsageWithEstimate` (GRV-2) and `forecastIssueCost` (GRV-3 + GRV-5 +
// GRV-8 wiring) ship from this barrel; `forecastProjectCost` and
// `calibrateCoverage` are re-exported from the implemented attribution
// forecasters. The bare `calibrate` name is a deprecated shim that names its
// replacement.
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

  it('forecastProjectCost forecasts an empty project over no history', async () => {
    const forecast = await forecastProjectCost(
      [{ size: 'L', model: 'claude-sonnet-4-6' }],
      [],
    );
    assert.equal(forecast.empty, true);
    assert.equal(forecast.lowConfidence, true);
    assert.equal(forecast.issues, 1);
    assert.equal(forecast.tokens.p50, null);
    assert.equal(forecast.dollars.priced, false);
  });

  it('enrichUsageWithEstimate is exported from the barrel', () => {
    assert.equal(typeof enrichUsageWithEstimate, 'function');
  });

  it('createLinearEstimateSource is exported from the barrel', () => {
    assert.equal(typeof createLinearEstimateSource, 'function');
  });

  it('calibrateCoverage is exported from the barrel', () => {
    assert.equal(typeof calibrateCoverage, 'function');
  });

  it('calibrate is a deprecated shim whose error names calibrateCoverage', () => {
    assert.throws(() => calibrate([]), /calibrateCoverage/);
  });
});
