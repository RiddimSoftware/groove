import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { sessionToUsageRecords } from '../src/transcript-to-usage.mjs';
import { validateUsageRecord } from '../src/usage-jsonl.mjs';

function claudeSession(turns) {
  return {
    provider: 'claude',
    sessionId: '0ed83fa7-7a8a-4e3a-8c6a-7d35f8c9b3a3',
    cwd: '/Users/x/repo/.symphony/workspaces/FOO-1',
    sourceFile: '/tmp/x.jsonl',
    turns,
    quotaSamples: [],
  };
}

describe('sessionToUsageRecords', () => {
  it('produces one record per turn with monotonic 1-based ordinals', () => {
    const session = claudeSession([
      {
        provider: 'claude', sessionId: 'a', turnIdx: 0, timestamp: '2026-05-01T00:00:00Z',
        cwd: '/c', model: 'claude-sonnet-4-6', webSearchRequests: 0, webFetchRequests: 0,
        tokens: { inputUncached: 10, inputCached: 90, cacheCreate5m: 0, cacheCreate1h: 0, outputVisible: 50, outputReasoning: 0 },
      },
      {
        provider: 'claude', sessionId: 'a', turnIdx: 1, timestamp: '2026-05-01T00:00:05Z',
        cwd: '/c', model: 'claude-sonnet-4-6', webSearchRequests: 0, webFetchRequests: 0,
        tokens: { inputUncached: 5, inputCached: 45, cacheCreate5m: 0, cacheCreate1h: 0, outputVisible: 25, outputReasoning: 0 },
      },
    ]);
    const recs = sessionToUsageRecords(session, 'FOO-1');
    assert.equal(recs.length, 2);
    assert.equal(recs[0].turn, 1);
    assert.equal(recs[1].turn, 2);
  });

  it('sums every input bucket into inputTokens and visible+reasoning into outputTokens', () => {
    const session = claudeSession([
      {
        provider: 'claude', sessionId: 'a', turnIdx: 0, timestamp: '2026-05-01T00:00:00Z',
        cwd: '/c', model: 'claude-sonnet-4-6', webSearchRequests: 0, webFetchRequests: 0,
        tokens: { inputUncached: 100, inputCached: 1000, cacheCreate5m: 50, cacheCreate1h: 200, outputVisible: 80, outputReasoning: 20 },
      },
    ]);
    const [r] = sessionToUsageRecords(session, 'FOO-1');
    assert.equal(r.inputTokens, 1350); // 100+1000+50+200
    assert.equal(r.outputTokens, 100); // 80+20
    assert.equal(r.totalTokens, 1450);
  });

  it('uses the next turn timestamp as endedAt of the previous turn', () => {
    const session = claudeSession([
      {
        provider: 'claude', sessionId: 'a', turnIdx: 0, timestamp: '2026-05-01T00:00:00Z',
        cwd: '/c', model: 'claude-sonnet-4-6', webSearchRequests: 0, webFetchRequests: 0,
        tokens: { inputUncached: 1, inputCached: 0, cacheCreate5m: 0, cacheCreate1h: 0, outputVisible: 1, outputReasoning: 0 },
      },
      {
        provider: 'claude', sessionId: 'a', turnIdx: 1, timestamp: '2026-05-01T00:00:05Z',
        cwd: '/c', model: 'claude-sonnet-4-6', webSearchRequests: 0, webFetchRequests: 0,
        tokens: { inputUncached: 1, inputCached: 0, cacheCreate5m: 0, cacheCreate1h: 0, outputVisible: 1, outputReasoning: 0 },
      },
    ]);
    const recs = sessionToUsageRecords(session, 'FOO-1');
    assert.equal(recs[0].startedAt, '2026-05-01T00:00:00Z');
    assert.equal(recs[0].endedAt, '2026-05-01T00:00:05Z');
    assert.equal(recs[1].startedAt, '2026-05-01T00:00:05Z');
    assert.equal(recs[1].endedAt, '2026-05-01T00:00:05Z'); // last turn: endedAt == startedAt
  });

  it('produces records that validate as spec-conformant', () => {
    const session = claudeSession([
      {
        provider: 'claude', sessionId: 'a', turnIdx: 0, timestamp: '2026-05-01T00:00:00Z',
        cwd: '/c', model: 'claude-sonnet-4-6', webSearchRequests: 0, webFetchRequests: 0,
        tokens: { inputUncached: 1, inputCached: 0, cacheCreate5m: 0, cacheCreate1h: 0, outputVisible: 1, outputReasoning: 0 },
      },
    ]);
    for (const r of sessionToUsageRecords(session, 'FOO-1')) {
      assert.equal(validateUsageRecord(r), null);
    }
  });

  it('populates workspacePath when session.cwd is present', () => {
    const session = claudeSession([
      {
        provider: 'claude', sessionId: 'a', turnIdx: 0, timestamp: '2026-05-01T00:00:00Z',
        cwd: '/c', model: 'claude-sonnet-4-6', webSearchRequests: 0, webFetchRequests: 0,
        tokens: { inputUncached: 1, inputCached: 0, cacheCreate5m: 0, cacheCreate1h: 0, outputVisible: 1, outputReasoning: 0 },
      },
    ]);
    const [r] = sessionToUsageRecords(session, 'FOO-1');
    assert.equal(r.workspacePath, '/Users/x/repo/.symphony/workspaces/FOO-1');
  });

  it('§5.2.1 emits Claude cache-tier breakdown when cache writes are present', () => {
    const session = claudeSession([
      {
        provider: 'claude', sessionId: 'a', turnIdx: 0, timestamp: '2026-05-01T00:00:00Z',
        cwd: '/c', model: 'claude-sonnet-4-6', webSearchRequests: 0, webFetchRequests: 0,
        tokens: { inputUncached: 100, inputCached: 1000, cacheCreate5m: 50, cacheCreate1h: 200, outputVisible: 80, outputReasoning: 0 },
      },
    ]);
    const [r] = sessionToUsageRecords(session, 'FOO-1');
    assert.equal(r.inputUncachedTokens, 100);
    assert.equal(r.inputCachedReadTokens, 1000);
    assert.equal(r.inputCacheWriteTokens, 250);
    assert.equal(r.inputCacheWriteEphemeral5mTokens, 50);
    assert.equal(r.inputCacheWriteEphemeral1hTokens, 200);
    // Spec §5.3 SHOULD: breakdown sums to inputTokens
    assert.equal(r.inputUncachedTokens + r.inputCachedReadTokens + r.inputCacheWriteTokens, r.inputTokens);
    // Spec §5.3 SHOULD: tier-split sums to inputCacheWriteTokens
    assert.equal(r.inputCacheWriteEphemeral5mTokens + r.inputCacheWriteEphemeral1hTokens, r.inputCacheWriteTokens);
  });

  it('§5.2.1 omits Claude cache-write fields when writes are zero', () => {
    const session = claudeSession([
      {
        provider: 'claude', sessionId: 'a', turnIdx: 0, timestamp: '2026-05-01T00:00:00Z',
        cwd: '/c', model: 'claude-sonnet-4-6', webSearchRequests: 0, webFetchRequests: 0,
        tokens: { inputUncached: 100, inputCached: 1000, cacheCreate5m: 0, cacheCreate1h: 0, outputVisible: 80, outputReasoning: 0 },
      },
    ]);
    const [r] = sessionToUsageRecords(session, 'FOO-1');
    assert.equal(r.inputCacheWriteTokens, undefined);
    assert.equal(r.inputCacheWriteEphemeral5mTokens, undefined);
    assert.equal(r.inputCacheWriteEphemeral1hTokens, undefined);
  });

  it('§5.2.2 emits Codex reasoning-output unconditionally for Codex provider', () => {
    const session = {
      provider: 'codex',
      sessionId: 'b',
      cwd: '/Users/x/repo/.symphony/workspaces/FOO-2',
      sourceFile: '/tmp/x.jsonl',
      quotaSamples: [],
      turns: [
        {
          provider: 'codex', sessionId: 'b', turnIdx: 0, timestamp: '2026-05-01T00:00:00Z',
          cwd: '/c', model: 'gpt-5-codex', webSearchRequests: 0, webFetchRequests: 0,
          tokens: { inputUncached: 100, inputCached: 1000, cacheCreate5m: 0, cacheCreate1h: 0, outputVisible: 80, outputReasoning: 30 },
        },
      ],
    };
    const [r] = sessionToUsageRecords(session, 'FOO-2');
    assert.equal(r.outputVisibleTokens, 80);
    assert.equal(r.outputReasoningTokens, 30);
    assert.equal(r.outputVisibleTokens + r.outputReasoningTokens, r.outputTokens);
  });

  it('§5.2.2 omits reasoning field for Claude provider', () => {
    const session = claudeSession([
      {
        provider: 'claude', sessionId: 'a', turnIdx: 0, timestamp: '2026-05-01T00:00:00Z',
        cwd: '/c', model: 'claude-sonnet-4-6', webSearchRequests: 0, webFetchRequests: 0,
        tokens: { inputUncached: 100, inputCached: 0, cacheCreate5m: 0, cacheCreate1h: 0, outputVisible: 80, outputReasoning: 0 },
      },
    ]);
    const [r] = sessionToUsageRecords(session, 'FOO-1');
    assert.equal(r.outputVisibleTokens, 80);
    assert.equal(r.outputReasoningTokens, undefined);
  });

  it('§5.2.3 embeds quota with windows array when Codex rate_limits were captured', () => {
    const session = {
      provider: 'codex',
      sessionId: 'b',
      cwd: '/Users/x/repo/.symphony/workspaces/FOO-2',
      sourceFile: '/tmp/x.jsonl',
      quotaSamples: [
        {
          provider: 'codex', timestamp: '2026-05-01T00:00:00Z',
          planType: 'pro',
          windows: [
            { label: 'primary', windowMinutes: 300, usedPercent: 12, resetsAt: 1 },
            { label: 'secondary', windowMinutes: 10080, usedPercent: 45, resetsAt: 2 },
          ],
        },
      ],
      turns: [
        {
          provider: 'codex', sessionId: 'b', turnIdx: 0, timestamp: '2026-05-01T00:00:00Z',
          cwd: '/c', model: 'gpt-5-codex', webSearchRequests: 0, webFetchRequests: 0,
          tokens: { inputUncached: 100, inputCached: 0, cacheCreate5m: 0, cacheCreate1h: 0, outputVisible: 50, outputReasoning: 0 },
        },
      ],
    };
    const [r] = sessionToUsageRecords(session, 'FOO-2');
    assert.ok(r.quota);
    assert.equal(r.quota.planType, 'pro');
    assert.equal(r.quota.windows.length, 2);
    assert.equal(r.quota.windows[0].label, 'primary');
    assert.equal(r.quota.windows[0].usedPercent, 12);
    assert.equal(r.quota.windows[0].windowMinutes, 300);
    assert.equal(r.quota.windows[0].resetsAt, 1);
    assert.equal(r.quota.windows[1].label, 'secondary');
    assert.equal(r.quota.windows[1].usedPercent, 45);
  });
});
