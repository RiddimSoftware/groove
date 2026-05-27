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
});
