import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  calculateCost,
  hypotheticalNoteFor,
  normalizeModelName,
  ratesForModel,
} from '../src/pricing.mjs';
import { PRICING_TABLE } from '../src/pricing-rates.mjs';

describe('normalizeModelName', () => {
  it("strips Anthropic's `-YYYYMMDD` date suffix", () => {
    assert.equal(normalizeModelName('claude-sonnet-4-6-20251001'), 'claude-sonnet-4.6');
    assert.equal(normalizeModelName('claude-haiku-4-5-20251001'), 'claude-haiku-4.5');
  });

  it('rewrites hyphenated decimals to dotted', () => {
    assert.equal(normalizeModelName('claude-sonnet-4-6'), 'claude-sonnet-4.6');
    assert.equal(normalizeModelName('claude-opus-4-7'), 'claude-opus-4.7');
  });

  it('strips a trailing `-latest`', () => {
    assert.equal(normalizeModelName('claude-sonnet-4-6-latest'), 'claude-sonnet-4.6');
  });

  it('passes through OpenAI names unchanged', () => {
    assert.equal(normalizeModelName('gpt-5.5'), 'gpt-5.5');
    assert.equal(normalizeModelName('gpt-5.3-codex'), 'gpt-5.3-codex');
  });

  it('returns empty for non-string input', () => {
    assert.equal(normalizeModelName(null), '');
    assert.equal(normalizeModelName(undefined), '');
  });
});

describe('ratesForModel', () => {
  it('returns null for an unknown model', () => {
    assert.equal(ratesForModel('unknown-model'), null);
    assert.equal(ratesForModel(''), null);
  });

  it('finds rates by canonical name', () => {
    const r = ratesForModel('claude-sonnet-4.6');
    assert.ok(r);
    assert.equal(r.provider, 'anthropic');
    assert.equal(r.inputPerMillionUsd, 3);
    assert.equal(r.outputPerMillionUsd, 15);
  });

  it('finds rates after normalization (hyphenated decimal, date suffix)', () => {
    assert.ok(ratesForModel('claude-sonnet-4-6'));
    assert.ok(ratesForModel('claude-sonnet-4-6-20251001'));
    assert.ok(ratesForModel('claude-haiku-4-5-20251001'));
  });

  it('finds OpenAI rates', () => {
    const r = ratesForModel('gpt-5.5');
    assert.ok(r);
    assert.equal(r.provider, 'openai');
    assert.equal(r.outputPerMillionUsd, 30);
  });
});

describe('calculateCost', () => {
  it('returns null for unknown model', () => {
    assert.equal(calculateCost('unknown-model', { inputUncached: 100, inputCached: 0, cacheCreate5m: 0, cacheCreate1h: 0, outputVisible: 50, outputReasoning: 0 }), null);
  });

  it('charges Claude buckets at their respective rates', () => {
    const buckets = {
      inputUncached: 1_000_000,    // $3   at $3/1M
      inputCached: 1_000_000,      // $0.30 at $0.30/1M
      cacheCreate5m: 1_000_000,    // $3.75 at $3.75/1M
      cacheCreate1h: 0,
      outputVisible: 1_000_000,    // $15  at $15/1M
      outputReasoning: 0,
    };
    const cost = calculateCost('claude-sonnet-4.6', buckets);
    assert.ok(cost);
    // Visit each row label to be specific about what we're asserting.
    const byLabel = Object.fromEntries(cost.buckets.map((b) => [b.label, b]));
    assert.equal(byLabel['input uncached'].costUsd, 3);
    assert.equal(byLabel['cache read'].costUsd, 0.3);
    assert.equal(byLabel['cache write 5m'].costUsd, 3.75);
    assert.equal(byLabel['output (visible)'].costUsd, 15);
    assert.equal(cost.totalUsd, 3 + 0.3 + 3.75 + 15);
  });

  it('handles Codex (no separate cache-write tier; reasoning billed as output)', () => {
    const buckets = {
      inputUncached: 1_000_000,    // $5  at $5/1M (gpt-5.5)
      inputCached: 1_000_000,      // $0.50 at $0.50/1M
      cacheCreate5m: 0, cacheCreate1h: 0,
      outputVisible: 500_000,      // $15 at $30/1M  → 0.5M × $30 = $15
      outputReasoning: 500_000,    // $15 also at $30/1M
    };
    const cost = calculateCost('gpt-5.5', buckets);
    assert.ok(cost);
    const byLabel = Object.fromEntries(cost.buckets.map((b) => [b.label, b]));
    assert.equal(byLabel['input uncached'].costUsd, 5);
    assert.equal(byLabel['cache read'].costUsd, 0.5);
    assert.equal(byLabel['output (visible)'].costUsd, 15);
    assert.equal(byLabel['output (reasoning)'].costUsd, 15);
    assert.equal(byLabel['cache write 5m'], undefined); // OpenAI has no tier
    assert.equal(cost.totalUsd, 5 + 0.5 + 15 + 15);
  });

  it('omits zero-token buckets from the breakdown', () => {
    const buckets = {
      inputUncached: 100, inputCached: 0, cacheCreate5m: 0, cacheCreate1h: 0,
      outputVisible: 50, outputReasoning: 0,
    };
    const cost = calculateCost('claude-sonnet-4.6', buckets);
    assert.ok(cost);
    const labels = cost.buckets.map((b) => b.label);
    assert.deepEqual(labels, ['input uncached', 'output (visible)']);
  });

  it('reproduces the EPAC-1940 sample numbers from the README/PR', () => {
    // The bake's actual gpt-5.5 record for EPAC-1940's Codex run:
    //   input uncached:    1,517,206 tokens × $5/1M    = $7.5860
    //   cache read:       51,024,768 tokens × $0.50/1M = $25.5124
    //   output (visible):     44,683 tokens × $30/1M   = $1.3405
    //   output (reasoning):   18,649 tokens × $30/1M   = $0.5595
    //   total:                                           $34.998 ≈ $35
    const cost = calculateCost('gpt-5.5', {
      inputUncached: 1_517_206, inputCached: 51_024_768,
      cacheCreate5m: 0, cacheCreate1h: 0,
      outputVisible: 44_683, outputReasoning: 18_649,
    });
    assert.ok(cost);
    assert.ok(Math.abs(cost.totalUsd - 34.998) < 0.01, `expected ~$34.998, got $${cost.totalUsd}`);
  });
});

describe('hypotheticalNoteFor', () => {
  it('mentions the Codex plan type when present', () => {
    assert.match(hypotheticalNoteFor('codex', 'pro'), /Codex Pro plan covers this/);
    assert.match(hypotheticalNoteFor('codex', 'business'), /Codex Business plan covers this/);
  });

  it('falls back to a generic Claude note', () => {
    assert.match(hypotheticalNoteFor('claude', null), /Anthropic API rate/);
  });
});

describe('PRICING_TABLE', () => {
  it('has both Anthropic and OpenAI entries', () => {
    assert.ok(PRICING_TABLE.some((e) => e.provider === 'anthropic'));
    assert.ok(PRICING_TABLE.some((e) => e.provider === 'openai'));
  });

  it('every entry has a verifiedOn ISO date and a sourceUrl', () => {
    for (const e of PRICING_TABLE) {
      assert.match(e.verifiedOn, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(e.sourceUrl.startsWith('https://'));
    }
  });
});
