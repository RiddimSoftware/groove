import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  computeMultiIssueRollup,
  expandAllIssueArgs,
  expandIssueArg,
} from '../src/multi-issue.mjs';

describe('expandIssueArg', () => {
  it('passes through a single issue ID', () => {
    assert.deepEqual(expandIssueArg('EPAC-1940'), ['EPAC-1940']);
    assert.deepEqual(expandIssueArg('FAC-67'), ['FAC-67']);
  });

  it('uppercases the team prefix', () => {
    assert.deepEqual(expandIssueArg('epac-1940'), ['EPAC-1940']);
  });

  it('expands an inclusive range', () => {
    assert.deepEqual(
      expandIssueArg('EPAC-1990-1999'),
      Array.from({ length: 10 }, (_, i) => `EPAC-${1990 + i}`),
    );
  });

  it('expands a one-element range', () => {
    assert.deepEqual(expandIssueArg('EPAC-100-100'), ['EPAC-100']);
  });

  it('rejects range start > end', () => {
    assert.throws(() => expandIssueArg('EPAC-1999-1990'), /start > end/);
  });

  it('rejects ranges that are too large', () => {
    assert.throws(() => expandIssueArg('EPAC-1-100000'), /range too large/);
  });

  it('rejects malformed inputs', () => {
    assert.throws(() => expandIssueArg(''), /empty/);
    assert.throws(() => expandIssueArg('EPAC'), /unrecognized/);
    assert.throws(() => expandIssueArg('1940'), /unrecognized/);
    assert.throws(() => expandIssueArg('EPAC-'), /unrecognized/);
    assert.throws(() => expandIssueArg('EPAC-1940-1999-extra'), /unrecognized/);
    assert.throws(() => expandIssueArg('FOO.BAR-1'), /unrecognized/);
  });

  it('supports team prefixes with digits (e.g. S2S)', () => {
    assert.deepEqual(expandIssueArg('S2S-12'), ['S2S-12']);
    assert.deepEqual(expandIssueArg('S2S-10-12'), ['S2S-10', 'S2S-11', 'S2S-12']);
  });
});

describe('expandAllIssueArgs', () => {
  it('deduplicates across args while preserving first-seen order', () => {
    const result = expandAllIssueArgs(['EPAC-1990-1999', 'EPAC-1995']);
    assert.equal(result.ids.length, 10);
    assert.equal(result.ids[0], 'EPAC-1990');
    assert.equal(result.ids[5], 'EPAC-1995');
    assert.equal(result.requestedCount, 11); // 10 from range + 1 explicit, before dedup
  });

  it('mixes ranges and singletons', () => {
    const result = expandAllIssueArgs(['EPAC-1940', 'FAC-67', 'EPAC-1990-1992']);
    assert.deepEqual(result.ids, [
      'EPAC-1940', 'FAC-67', 'EPAC-1990', 'EPAC-1991', 'EPAC-1992',
    ]);
    assert.equal(result.requestedCount, 5);
  });

  it('reports requestedCount distinctly from unique ids', () => {
    // EPAC-1995 appears in the range AND as a singleton → 11 requested, 10 unique
    const result = expandAllIssueArgs(['EPAC-1990-1999', 'EPAC-1995']);
    assert.equal(result.requestedCount, 11);
    assert.equal(result.ids.length, 10);
  });
});

describe('computeMultiIssueRollup', () => {
  function makeLoader(data) {
    return async (id) => {
      if (!(id in data)) {
        // Issue not present → return an empty rollup so it lands in `missing`.
        return {
          issueIdentifier: id,
          providerTotals: {
            claude: emptyProvider(),
            codex: emptyProvider(),
          },
          combinedTokens: 0,
          combinedTurns: 0,
          combinedSessions: 0,
        };
      }
      return data[id];
    };
  }

  function emptyProvider() {
    return {
      sessionCount: 0,
      turnCount: 0,
      tokens: {
        inputUncached: 0, inputCached: 0,
        cacheCreate5m: 0, cacheCreate1h: 0,
        outputVisible: 0, outputReasoning: 0,
      },
      tokensGrandTotal: 0,
      models: [],
      firstTimestamp: null,
      lastTimestamp: null,
      quotaSamples: [],
      sourceFiles: [],
    };
  }

  function rollupFixture(id, claudeTokens, codexTokens, claudeCost, codexCost) {
    const claude = emptyProvider();
    const codex = emptyProvider();
    if (claudeTokens > 0) {
      claude.sessionCount = 1;
      claude.turnCount = 10;
      claude.tokensGrandTotal = claudeTokens;
      claude.models = ['claude-sonnet-4.6'];
      if (claudeCost !== null) claude.pricing = { totalUsd: claudeCost };
    }
    if (codexTokens > 0) {
      codex.sessionCount = 1;
      codex.turnCount = 20;
      codex.tokensGrandTotal = codexTokens;
      codex.models = ['gpt-5.5'];
      if (codexCost !== null) codex.pricing = { totalUsd: codexCost };
    }
    return {
      issueIdentifier: id,
      providerTotals: { claude, codex },
      combinedTokens: claudeTokens + codexTokens,
      combinedTurns: (claudeTokens > 0 ? 10 : 0) + (codexTokens > 0 ? 20 : 0),
      combinedSessions: (claudeTokens > 0 ? 1 : 0) + (codexTokens > 0 ? 1 : 0),
    };
  }

  it('aggregates token totals + costs across the requested IDs', async () => {
    const loader = makeLoader({
      'EPAC-1': rollupFixture('EPAC-1', 1_000_000, 5_000_000, 3.0, 25.0),
      'EPAC-2': rollupFixture('EPAC-2', 2_000_000, 10_000_000, 6.0, 50.0),
    });
    const result = await computeMultiIssueRollup(['EPAC-1', 'EPAC-2'], loader);
    assert.equal(result.issues.length, 2);
    assert.equal(result.missing.length, 0);
    assert.equal(result.totals.tokens, 18_000_000);
    assert.equal(result.totals.sessionCount, 4);
    assert.equal(result.totals.apiCostUsd, 84.0);
    assert.equal(result.totals.byProvider.claude.tokens, 3_000_000);
    assert.equal(result.totals.byProvider.codex.tokens, 15_000_000);
    assert.equal(result.totals.byProvider.claude.costUsd, 9.0);
    assert.equal(result.totals.byProvider.codex.costUsd, 75.0);
  });

  it('separates issues with no data into the missing list', async () => {
    const loader = makeLoader({
      'EPAC-1990': rollupFixture('EPAC-1990', 1_000_000, 0, 3.0, null),
      'EPAC-1993': rollupFixture('EPAC-1993', 0, 5_000_000, null, 25.0),
    });
    const result = await computeMultiIssueRollup(['EPAC-1990-1992', 'EPAC-1993'], loader);
    assert.equal(result.requestedCount, 4); // 3 from range + 1
    assert.equal(result.requestedIds.length, 4);
    assert.equal(result.issues.length, 2);
    assert.deepEqual(result.missing, ['EPAC-1991', 'EPAC-1992']);
  });

  it('reports null apiCostUsd when ANY contributing issue lacks pricing', async () => {
    const loader = makeLoader({
      'EPAC-1': rollupFixture('EPAC-1', 1_000_000, 0, 3.0, null),
      'EPAC-2': rollupFixture('EPAC-2', 1_000_000, 0, null, null), // no pricing
    });
    const result = await computeMultiIssueRollup(['EPAC-1', 'EPAC-2'], loader);
    assert.equal(result.issues[0].apiCostUsd, 3.0);
    assert.equal(result.issues[1].apiCostUsd, null);
    assert.equal(result.totals.apiCostUsd, null);
  });

  it('chooses a sensible label for the rollup', async () => {
    const loader = makeLoader({});
    const r1 = await computeMultiIssueRollup(['EPAC-1990-1999'], loader);
    assert.equal(r1.label, 'EPAC-1990-1999');

    const r2 = await computeMultiIssueRollup(['EPAC-1', 'EPAC-2'], loader);
    assert.equal(r2.label, 'EPAC-1, EPAC-2');

    const r3 = await computeMultiIssueRollup(['A-1', 'A-2', 'A-3', 'A-4'], loader);
    assert.equal(r3.label, '4 arguments');
  });
});
