import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { correlateCostWithFeature } from '../src/correlate.mjs';
import { mulberry32, standardNormal } from '../src/synthetic.mjs';

describe('correlateCostWithFeature', () => {
  describe('edge cases', () => {
    it('returns explicit nulls for empty input', () => {
      const result = correlateCostWithFeature([]);
      assert.equal(result.n, 0);
      assert.equal(result.spearman, null);
      assert.equal(result.pearsonLinear, null);
      assert.equal(result.pearsonLogLog, null);
      assert.equal(result.pearsonLogLogDropped, 0);
      assert.deepEqual(result.deciles, []);
    });

    it('returns explicit nulls for a single pair (n < 2)', () => {
      const result = correlateCostWithFeature([{ feature: 100, cost: 200 }]);
      assert.equal(result.n, 1);
      assert.equal(result.spearman, null);
      assert.equal(result.pearsonLinear, null);
      assert.equal(result.pearsonLogLog, null);
    });

    it('returns null (not NaN) when feature variance is zero', () => {
      const pairs = [
        { feature: 5, cost: 10 },
        { feature: 5, cost: 20 },
        { feature: 5, cost: 30 },
      ];
      const result = correlateCostWithFeature(pairs);
      assert.equal(result.n, 3);
      assert.equal(result.pearsonLinear, null);
      assert.equal(result.spearman, null);
      assert.ok(!Number.isNaN(result.pearsonLinear));
      assert.ok(!Number.isNaN(result.spearman));
    });

    it('returns null (not NaN) when cost variance is zero', () => {
      const pairs = [
        { feature: 1, cost: 7 },
        { feature: 2, cost: 7 },
        { feature: 3, cost: 7 },
      ];
      const result = correlateCostWithFeature(pairs);
      assert.equal(result.n, 3);
      assert.equal(result.pearsonLinear, null);
      assert.equal(result.spearman, null);
    });

    it('ignores pairs with non-finite values', () => {
      const pairs = [
        { feature: 1, cost: 10 },
        { feature: Number.NaN, cost: 20 },
        { feature: 2, cost: Number.POSITIVE_INFINITY },
        { feature: 3, cost: 30 },
      ];
      const result = correlateCostWithFeature(pairs);
      assert.equal(result.n, 2);
    });

    it('accepts a generator iterable', () => {
      function* gen() {
        yield { feature: 1, cost: 10 };
        yield { feature: 2, cost: 20 };
        yield { feature: 3, cost: 30 };
      }
      const result = correlateCostWithFeature(gen());
      assert.equal(result.n, 3);
      assert.equal(result.spearman, 1);
    });
  });

  describe('known relationships', () => {
    it('recovers spearman = 1 for a perfectly monotonic feature/cost relationship', () => {
      const pairs = Array.from({ length: 20 }, (_, i) => ({
        feature: i + 1,
        cost: Math.pow(i + 1, 2),
      }));
      const result = correlateCostWithFeature(pairs);
      assert.equal(result.n, 20);
      assert.equal(result.spearman, 1);
    });

    it('recovers spearman = -1 for a perfectly anti-monotonic relationship', () => {
      const pairs = Array.from({ length: 15 }, (_, i) => ({
        feature: i + 1,
        cost: 1000 / (i + 1),
      }));
      const result = correlateCostWithFeature(pairs);
      assert.equal(result.spearman, -1);
    });

    it('recovers spearman ≈ 0 for an unrelated feature/cost pair', () => {
      const rng = mulberry32(1234);
      const features = Array.from({ length: 200 }, () => rng());
      const costs = Array.from({ length: 200 }, () => rng());
      const pairs = features.map((f, i) => ({ feature: f, cost: costs[i] }));
      const result = correlateCostWithFeature(pairs);
      assert.ok(Math.abs(result.spearman) < 0.15, `expected |spearman| < 0.15 for random pairs, got ${result.spearman}`);
    });

    it('recovers Pearson = 1 for a perfectly linear y = a + b·x relationship', () => {
      const pairs = Array.from({ length: 30 }, (_, i) => ({
        feature: i,
        cost: 5 + 3 * i,
      }));
      const result = correlateCostWithFeature(pairs);
      assert.ok(Math.abs(result.pearsonLinear - 1) < 1e-9, `expected pearsonLinear ≈ 1, got ${result.pearsonLinear}`);
    });

    it('recovers Pearson log-log ≈ 1 for a power-law y = a·x^k relationship', () => {
      const pairs = Array.from({ length: 30 }, (_, i) => {
        const x = i + 1;
        return { feature: x, cost: 2 * Math.pow(x, 1.7) };
      });
      const result = correlateCostWithFeature(pairs);
      assert.ok(
        Math.abs(result.pearsonLogLog - 1) < 1e-9,
        `expected pearsonLogLog ≈ 1, got ${result.pearsonLogLog}`,
      );
    });

    it('recovers a noisy monotonic relationship within tolerance', () => {
      const rng = mulberry32(42);
      const pairs = Array.from({ length: 80 }, (_, i) => {
        const x = i + 1;
        const noise = 1 + 0.2 * standardNormal(rng);
        return { feature: x, cost: x * x * Math.max(0.1, noise) };
      });
      const result = correlateCostWithFeature(pairs);
      assert.equal(result.n, 80);
      assert.ok(result.spearman > 0.9, `expected spearman > 0.9 for noisy monotonic data, got ${result.spearman}`);
    });

    it('reproduces the documented motivating gap: Pearson(linear) << Spearman on heavy-tailed data', () => {
      const rng = mulberry32(7);
      const pairs = Array.from({ length: 100 }, () => {
        const x = rng() * 100;
        const heavyTail = Math.exp(3 * rng());
        return { feature: x, cost: x * heavyTail };
      });
      pairs.push({ feature: 1, cost: 1_000_000 });
      pairs.push({ feature: 2, cost: 5_000_000 });
      const result = correlateCostWithFeature(pairs);
      assert.ok(result.spearman > result.pearsonLinear,
        `expected spearman > pearsonLinear on heavy-tailed data, got spearman=${result.spearman}, pearsonLinear=${result.pearsonLinear}`);
    });
  });

  describe('ties (average-rank handling)', () => {
    it('produces a well-defined Spearman on a tie-heavy fixture', () => {
      const pairs = [
        { feature: 1, cost: 10 },
        { feature: 1, cost: 12 },
        { feature: 1, cost: 11 },
        { feature: 2, cost: 20 },
        { feature: 2, cost: 22 },
        { feature: 2, cost: 21 },
        { feature: 3, cost: 30 },
        { feature: 3, cost: 31 },
        { feature: 3, cost: 32 },
      ];
      const result = correlateCostWithFeature(pairs);
      assert.equal(result.n, 9);
      assert.ok(result.spearman !== null);
      assert.ok(!Number.isNaN(result.spearman));
      assert.ok(result.spearman > 0.9,
        `expected spearman well above 0 (ties handled by average rank), got ${result.spearman}`);
    });

    it('average-rank handling matches the textbook formula for an all-tied middle band', () => {
      const pairs = [
        { feature: 1, cost: 10 },
        { feature: 2, cost: 20 },
        { feature: 2, cost: 22 },
        { feature: 2, cost: 21 },
        { feature: 3, cost: 30 },
      ];
      const result = correlateCostWithFeature(pairs);
      const expected = 8 / Math.sqrt(80);
      assert.ok(Math.abs(result.spearman - expected) < 1e-9,
        `expected spearman = 8/√80 ≈ ${expected} for ranks xs=[1,3,3,3,5] vs ys=[1,2,4,3,5], got ${result.spearman}`);
    });
  });

  describe('log-log handling of non-positive values', () => {
    it('filters non-positive features before log10 and reports the dropped count', () => {
      const pairs = [
        { feature: 0, cost: 10 },
        { feature: -1, cost: 5 },
        { feature: 1, cost: 1 },
        { feature: 10, cost: 100 },
        { feature: 100, cost: 10_000 },
      ];
      const result = correlateCostWithFeature(pairs);
      assert.equal(result.pearsonLogLogDropped, 2);
      assert.ok(result.pearsonLogLog !== null);
      assert.ok(Math.abs(result.pearsonLogLog - 1) < 1e-9,
        `expected pearsonLogLog ≈ 1 on the remaining power-law pairs, got ${result.pearsonLogLog}`);
    });

    it('filters non-positive costs before log10', () => {
      const pairs = [
        { feature: 1, cost: 0 },
        { feature: 2, cost: -5 },
        { feature: 3, cost: 8 },
        { feature: 4, cost: 16 },
      ];
      const result = correlateCostWithFeature(pairs);
      assert.equal(result.pearsonLogLogDropped, 2);
      assert.ok(result.pearsonLogLog !== null);
    });

    it('returns null pearsonLogLog when fewer than 2 positive pairs remain', () => {
      const pairs = [
        { feature: 0, cost: 0 },
        { feature: -1, cost: -1 },
        { feature: 5, cost: 25 },
      ];
      const result = correlateCostWithFeature(pairs);
      assert.equal(result.pearsonLogLog, null);
      assert.equal(result.pearsonLogLogDropped, 2);
    });

    it('reports 0 dropped pairs when every value is positive', () => {
      const pairs = [
        { feature: 1, cost: 1 },
        { feature: 10, cost: 100 },
      ];
      const result = correlateCostWithFeature(pairs);
      assert.equal(result.pearsonLogLogDropped, 0);
    });
  });

  describe('deciles', () => {
    it('returns 10 buckets ordered by feature for ≥ 10 pairs', () => {
      const pairs = Array.from({ length: 50 }, (_, i) => ({
        feature: i + 1,
        cost: (i + 1) * 10,
      }));
      const result = correlateCostWithFeature(pairs);
      assert.equal(result.deciles.length, 10);

      for (let i = 1; i < result.deciles.length; i += 1) {
        assert.ok(
          result.deciles[i - 1].featureRange.max <= result.deciles[i].featureRange.min,
          `bucket ${i} should be ordered after bucket ${i - 1}`,
        );
      }
      const totalN = result.deciles.reduce((acc, b) => acc + b.n, 0);
      assert.equal(totalN, 50);
    });

    it('each bucket has { n, featureRange, medianCost }', () => {
      const pairs = Array.from({ length: 20 }, (_, i) => ({
        feature: i,
        cost: i * 2,
      }));
      const result = correlateCostWithFeature(pairs);
      for (const bucket of result.deciles) {
        assert.equal(typeof bucket.n, 'number');
        assert.equal(typeof bucket.featureRange.min, 'number');
        assert.equal(typeof bucket.featureRange.max, 'number');
        assert.equal(typeof bucket.medianCost, 'number');
        assert.ok(bucket.n > 0);
      }
    });

    it('median cost is non-decreasing across buckets for a positively correlated fixture', () => {
      const pairs = Array.from({ length: 100 }, (_, i) => ({
        feature: i,
        cost: i * i + 5,
      }));
      const result = correlateCostWithFeature(pairs);
      for (let i = 1; i < result.deciles.length; i += 1) {
        assert.ok(
          result.deciles[i].medianCost >= result.deciles[i - 1].medianCost,
          `bucket ${i} median (${result.deciles[i].medianCost}) should be ≥ bucket ${i - 1} median (${result.deciles[i - 1].medianCost})`,
        );
      }
    });

    it('produces fewer than 10 buckets when there are fewer than 10 pairs', () => {
      const pairs = Array.from({ length: 5 }, (_, i) => ({
        feature: i,
        cost: i * 2,
      }));
      const result = correlateCostWithFeature(pairs);
      assert.ok(result.deciles.length <= 5);
      const totalN = result.deciles.reduce((acc, b) => acc + b.n, 0);
      assert.equal(totalN, 5);
    });
  });

  describe('large-input safety', () => {
    it('handles large integer cost values without overflow', () => {
      const pairs = Array.from({ length: 50 }, (_, i) => ({
        feature: i + 1,
        cost: (i + 1) * 1_000_000_000,
      }));
      const result = correlateCostWithFeature(pairs);
      assert.equal(result.spearman, 1);
      assert.ok(Math.abs(result.pearsonLinear - 1) < 1e-9);
    });

    it('is deterministic — repeated calls return identical results', () => {
      const pairs = Array.from({ length: 30 }, (_, i) => ({
        feature: i,
        cost: i * i,
      }));
      const a = correlateCostWithFeature(pairs);
      const b = correlateCostWithFeature(pairs);
      assert.deepEqual(a, b);
    });
  });
});
