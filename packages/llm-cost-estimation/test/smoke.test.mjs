import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  forecastIssueCost,
  forecastProjectCost,
  enrichUsageWithEstimate,
  calibrate,
} from '../src/index.mjs';

describe('llm-cost-estimation stubs', () => {
  it('forecastIssueCost throws "not implemented"', async () => {
    await assert.rejects(() => forecastIssueCost('GRV-1', 2), /not implemented/);
  });

  it('forecastProjectCost throws "not implemented"', async () => {
    await assert.rejects(() => forecastProjectCost('proj-1', []), /not implemented/);
  });

  it('enrichUsageWithEstimate throws "not implemented"', () => {
    assert.throws(() => enrichUsageWithEstimate({}, 2), /not implemented/);
  });

  it('calibrate throws "not implemented"', () => {
    assert.throws(() => calibrate([]), /not implemented/);
  });
});
