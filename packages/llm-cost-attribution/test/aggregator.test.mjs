import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { rollupSessions } from '../src/aggregator.mjs';

function sessionFixture(overrides) {
  return {
    cwd: '/cwd',
    sourceFile: '/tmp/x.jsonl',
    turns: [],
    quotaSamples: [],
    ...overrides,
  };
}

describe('rollupSessions', () => {
  it('zeroes when no sessions', () => {
    const r = rollupSessions('FOO-1', []);
    assert.equal(r.combinedTokens, 0);
    assert.equal(r.combinedTurns, 0);
    assert.equal(r.combinedSessions, 0);
    assert.equal(r.providerTotals.claude.sessionCount, 0);
    assert.equal(r.providerTotals.codex.sessionCount, 0);
  });

  it('sums tokens across a mix of Claude and Codex sessions', () => {
    const sessions = [
      sessionFixture({
        provider: 'claude',
        sessionId: 'a',
        turns: [
          {
            provider: 'claude', sessionId: 'a', turnIdx: 0, timestamp: '2026-05-01T00:00:00Z',
            cwd: '/c', model: 'claude-sonnet-4-6', webSearchRequests: 0, webFetchRequests: 0,
            tokens: { inputUncached: 100, inputCached: 1000, cacheCreate5m: 50, cacheCreate1h: 200, outputVisible: 80, outputReasoning: 0 },
          },
          {
            provider: 'claude', sessionId: 'a', turnIdx: 1, timestamp: '2026-05-01T00:01:00Z',
            cwd: '/c', model: 'claude-sonnet-4-6', webSearchRequests: 1, webFetchRequests: 0,
            tokens: { inputUncached: 50, inputCached: 500, cacheCreate5m: 0, cacheCreate1h: 100, outputVisible: 40, outputReasoning: 0 },
          },
        ],
      }),
      sessionFixture({
        provider: 'codex',
        sessionId: 'b',
        turns: [
          {
            provider: 'codex', sessionId: 'b', turnIdx: 0, timestamp: '2026-05-01T00:02:00Z',
            cwd: '/c', model: 'gpt-5-codex', webSearchRequests: 0, webFetchRequests: 0,
            tokens: { inputUncached: 200, inputCached: 2000, cacheCreate5m: 0, cacheCreate1h: 0, outputVisible: 90, outputReasoning: 30 },
          },
        ],
        quotaSamples: [
          {
            provider: 'codex', timestamp: '2026-05-01T00:02:00Z',
            primaryUsedPercent: 12, secondaryUsedPercent: 45,
            primaryWindowMinutes: 300, secondaryWindowMinutes: 10080,
            primaryResetsAt: 1, secondaryResetsAt: 2, planType: 'pro',
          },
        ],
      }),
    ];

    const r = rollupSessions('FOO-1', sessions);
    assert.equal(r.combinedSessions, 2);
    assert.equal(r.combinedTurns, 3);
    assert.equal(r.providerTotals.claude.turnCount, 2);
    assert.equal(r.providerTotals.codex.turnCount, 1);

    assert.equal(r.providerTotals.claude.tokens.inputUncached, 150);
    assert.equal(r.providerTotals.claude.tokens.inputCached, 1500);
    assert.equal(r.providerTotals.claude.tokens.cacheCreate5m, 50);
    assert.equal(r.providerTotals.claude.tokens.cacheCreate1h, 300);
    assert.equal(r.providerTotals.claude.tokens.outputVisible, 120);
    assert.equal(r.providerTotals.claude.tokensGrandTotal, 150 + 1500 + 50 + 300 + 120);

    assert.equal(r.providerTotals.codex.tokens.inputUncached, 200);
    assert.equal(r.providerTotals.codex.tokens.inputCached, 2000);
    assert.equal(r.providerTotals.codex.tokens.outputVisible, 90);
    assert.equal(r.providerTotals.codex.tokens.outputReasoning, 30);
    assert.equal(r.providerTotals.codex.tokensGrandTotal, 2320);

    assert.equal(
      r.combinedTokens,
      r.providerTotals.claude.tokensGrandTotal + r.providerTotals.codex.tokensGrandTotal,
    );

    assert.equal(r.providerTotals.codex.quotaSamples.length, 1);
    assert.equal(r.providerTotals.codex.quotaSamples[0].primaryUsedPercent, 12);
  });

  it('captures first/last timestamps and deduplicates models', () => {
    const sessions = [
      sessionFixture({
        provider: 'claude',
        sessionId: 'a',
        turns: [
          {
            provider: 'claude', sessionId: 'a', turnIdx: 0, timestamp: '2026-05-02T00:00:00Z',
            cwd: '/c', model: 'claude-haiku-4-5', webSearchRequests: 0, webFetchRequests: 0,
            tokens: { inputUncached: 1, inputCached: 0, cacheCreate5m: 0, cacheCreate1h: 0, outputVisible: 1, outputReasoning: 0 },
          },
          {
            provider: 'claude', sessionId: 'a', turnIdx: 1, timestamp: '2026-05-01T00:00:00Z',
            cwd: '/c', model: 'claude-sonnet-4-6', webSearchRequests: 0, webFetchRequests: 0,
            tokens: { inputUncached: 1, inputCached: 0, cacheCreate5m: 0, cacheCreate1h: 0, outputVisible: 1, outputReasoning: 0 },
          },
        ],
      }),
    ];
    const r = rollupSessions('FOO-1', sessions);
    assert.equal(r.providerTotals.claude.firstTimestamp, '2026-05-01T00:00:00Z');
    assert.equal(r.providerTotals.claude.lastTimestamp, '2026-05-02T00:00:00Z');
    assert.deepEqual(r.providerTotals.claude.models, ['claude-haiku-4-5', 'claude-sonnet-4-6']);
  });
});
