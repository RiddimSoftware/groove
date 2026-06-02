import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { empiricalQuantile } from '../src/quantiles.mjs';

describe('empiricalQuantile', () => {
  it('uses nearest-rank quantiles over observed sample values', () => {
    assert.equal(empiricalQuantile([500, 100, 300, 200, 400], 0.5), 300);
    assert.equal(empiricalQuantile([500, 100, 300, 200, 400], 0.8), 400);
  });

  it('returns null for an empty sample', () => {
    assert.equal(empiricalQuantile([], 0.5), null);
  });
});
