import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  forecastIssueCost,
  forecastProjectCost,
  calibrate,
} from '../src/index.mjs';

// `enrichUsageWithEstimate` is implemented (see enrich.test.mjs); the remaining
// exports are still stubs until their implementing issue lands.
describe('llm-cost-estimation stubs', () => {
  it('forecastIssueCost throws "not implemented"', async () => {
    await assert.rejects(() => forecastIssueCost('GRV-1', 2), /not implemented/);
  });

  it('forecastProjectCost throws "not implemented"', async () => {
    await assert.rejects(() => forecastProjectCost('proj-1', []), /not implemented/);
  });

  it('calibrate throws "not implemented"', () => {
    assert.throws(() => calibrate([]), /not implemented/);
  });
});
