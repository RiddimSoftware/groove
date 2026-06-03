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

  it('readGitDiffs can complete without records from an empty fixture', async () => {
    const gen = readGitDiffs('/fake/repo', { gitLogText: '' });
    const next = await gen.next();
    assert.equal(next.done, true);
    assert.deepEqual(next.value.records, []);
    assert.equal(next.value.error, null);
  });

  it('joinCostWithFeature throws "not implemented" on first iteration', async () => {
    const gen = joinCostWithFeature([], []);
    await assert.rejects(() => gen.next(), /not implemented/);
  });
});
