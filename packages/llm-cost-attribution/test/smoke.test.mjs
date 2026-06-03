import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  correlateCostWithFeature,
  readGitDiffs,
  joinCostWithFeature,
} from '../src/index.mjs';

describe('llm-cost-attribution cost-drivers barrel', () => {
  it('correlateCostWithFeature is exported as a function', () => {
    assert.equal(typeof correlateCostWithFeature, 'function');
  });

  it('readGitDiffs is exported as a function', () => {
    assert.equal(typeof readGitDiffs, 'function');
  });

  it('joinCostWithFeature is exported as a function', () => {
    assert.equal(typeof joinCostWithFeature, 'function');
  });

  it('correlateCostWithFeature throws "not implemented"', async () => {
    await assert.rejects(() => correlateCostWithFeature([]), /not implemented/);
  });

  it('readGitDiffs throws "not implemented" on first iteration', async () => {
    const gen = readGitDiffs('GRV-13');
    await assert.rejects(() => gen.next(), /not implemented/);
  });

  it('joinCostWithFeature throws "not implemented" on first iteration', async () => {
    const gen = joinCostWithFeature([], []);
    await assert.rejects(() => gen.next(), /not implemented/);
  });
});
