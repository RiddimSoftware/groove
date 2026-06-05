import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import * as attributionApi from '../../../packages/llm-cost-attribution/src/index.mjs';

const WORKTREE_PATH = '/synthetic/worktrees/GRV-23';
const OTHER_WORKTREE_PATH = '/synthetic/worktrees/GRV-99';
const RECORDED_AT = '2026-06-01T12:00:00.000Z';

function tokens(overrides) {
  return {
    inputUncached: 0,
    inputCached: 0,
    cacheCreate5m: 0,
    cacheCreate1h: 0,
    outputVisible: 0,
    outputReasoning: 0,
    ...overrides,
  };
}

function parsedSession({ provider, sessionId, cwd, turns, quotaSamples = [] }) {
  return {
    provider,
    sessionId,
    cwd,
    sourceFile: `in-memory://${provider}/${sessionId}`,
    quotaSamples,
    turns: turns.map((turn) => ({
      provider,
      sessionId,
      cwd,
      webSearchRequests: 0,
      webFetchRequests: 0,
      ...turn,
    })),
  };
}

function usageRecord(overrides) {
  const inputTokens = overrides.inputTokens ?? 0;
  const outputTokens = overrides.outputTokens ?? 0;
  return {
    schemaVersion: attributionApi.SCHEMA_VERSION,
    recordedAt: '2026-06-01T11:00:00.000Z',
    runID: overrides.runID,
    turn: overrides.turn ?? 1,
    issueIdentifier: overrides.issueIdentifier,
    provider: overrides.provider,
    model: overrides.model,
    botRole: 'developer',
    inputTokens,
    outputTokens,
    totalTokens: overrides.totalTokens ?? inputTokens + outputTokens,
    usageSource: 'provider_reported',
    startedAt: overrides.startedAt ?? '2026-06-01T11:00:00.000Z',
    endedAt: overrides.endedAt ?? '2026-06-01T11:00:00.000Z',
    ...overrides,
  };
}

function inMemorySessionSource(sessions) {
  return {
    async *listSessions() {
      for (const session of sessions) yield session;
    },
  };
}

function inMemoryUsageRecordSource(records) {
  return {
    async *readUsageRecords() {
      for (const record of records) yield record;
    },
  };
}

function inMemoryUsageRecordSink(writtenRecords) {
  return {
    async writeUsageRecords(records) {
      writtenRecords.push(...records);
    },
  };
}

function inMemoryIssueMatcher(issueBySessionId) {
  return {
    issueIdentifierForSession(session) {
      return issueBySessionId.get(session.sessionId) ?? null;
    },
    worktreePathForSession(session) {
      return session.cwd;
    },
  };
}

function summarizeRecordsByIssue(records) {
  const summary = {};
  for (const record of records) {
    const issue = record.issueIdentifier;
    summary[issue] ??= { records: 0, totalTokens: 0 };
    summary[issue].records += 1;
    summary[issue].totalTokens += record.totalTokens ?? 0;
  }
  return summary;
}

function assertIssueRollupTotals(rollup) {
  assert.equal(rollup.issueIdentifier, 'GRV-23');
  assert.equal(rollup.combinedSessions, 2);
  assert.equal(rollup.combinedTurns, 3);
  assert.equal(rollup.combinedTokens, 330);
  assert.equal(rollup.providerTotals.claude.sessionCount, 1);
  assert.equal(rollup.providerTotals.claude.turnCount, 2);
  assert.equal(rollup.providerTotals.claude.tokensGrandTotal, 225);
  assert.equal(rollup.providerTotals.codex.sessionCount, 1);
  assert.equal(rollup.providerTotals.codex.turnCount, 1);
  assert.equal(rollup.providerTotals.codex.tokensGrandTotal, 105);
}

test('attribution workflows can run through caller-owned in-memory ports', async () => {
  assert.equal(
    typeof attributionApi.createAttributionWorkflow,
    'function',
    'expected public API: createAttributionWorkflow({ sessionSource: SessionSource, issueMatcher: IssueMatcher, usageRecordSource: UsageRecordSource, usageRecordSink: UsageRecordSink })',
  );

  const sessions = [
    parsedSession({
      provider: 'claude',
      sessionId: 'claude-grv-23',
      cwd: WORKTREE_PATH,
      turns: [
        {
          turnIdx: 0,
          timestamp: '2026-06-01T10:00:00.000Z',
          model: 'claude-sonnet-4-6',
          tokens: tokens({
            inputUncached: 10,
            inputCached: 100,
            cacheCreate5m: 5,
            cacheCreate1h: 20,
            outputVisible: 15,
          }),
        },
        {
          turnIdx: 1,
          timestamp: '2026-06-01T10:05:00.000Z',
          model: 'claude-sonnet-4-6',
          tokens: tokens({
            inputUncached: 7,
            inputCached: 50,
            cacheCreate1h: 10,
            outputVisible: 8,
          }),
        },
      ],
    }),
    parsedSession({
      provider: 'codex',
      sessionId: 'codex-grv-23',
      cwd: WORKTREE_PATH,
      quotaSamples: [
        {
          provider: 'codex',
          timestamp: '2026-06-01T10:06:00.000Z',
          planType: 'pro',
          windows: [
            { label: 'primary', windowMinutes: 300, usedPercent: 37, resetsAt: 123 },
          ],
        },
      ],
      turns: [
        {
          turnIdx: 0,
          timestamp: '2026-06-01T10:06:00.000Z',
          model: 'gpt-5-codex',
          tokens: tokens({
            inputUncached: 12,
            inputCached: 80,
            outputVisible: 9,
            outputReasoning: 4,
          }),
        },
      ],
    }),
    parsedSession({
      provider: 'claude',
      sessionId: 'claude-grv-99',
      cwd: OTHER_WORKTREE_PATH,
      turns: [
        {
          turnIdx: 0,
          timestamp: '2026-06-01T10:30:00.000Z',
          model: 'claude-sonnet-4-6',
          tokens: tokens({
            inputUncached: 900,
            outputVisible: 99,
          }),
        },
      ],
    }),
  ];

  const usageRecords = [
    usageRecord({
      runID: 'usage-claude-grv-23',
      issueIdentifier: 'GRV-23',
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      inputTokens: 30,
      outputTokens: 20,
      inputUncachedTokens: 10,
      inputCachedReadTokens: 15,
      inputCacheWriteTokens: 5,
      inputCacheWriteEphemeral5mTokens: 5,
      outputVisibleTokens: 20,
    }),
    usageRecord({
      runID: 'usage-codex-grv-23',
      issueIdentifier: 'GRV-23',
      provider: 'codex',
      model: 'gpt-5-codex',
      inputTokens: 40,
      outputTokens: 25,
      inputUncachedTokens: 15,
      inputCachedReadTokens: 25,
      outputVisibleTokens: 10,
      outputReasoningTokens: 15,
      quota: {
        planType: 'pro',
        windows: [
          { label: 'primary', windowMinutes: 300, usedPercent: 41, resetsAt: 456 },
        ],
      },
    }),
    usageRecord({
      runID: 'usage-claude-grv-99',
      issueIdentifier: 'GRV-99',
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      inputTokens: 900,
      outputTokens: 100,
    }),
  ];

  const issueBySessionId = new Map([
    ['claude-grv-23', 'GRV-23'],
    ['codex-grv-23', 'GRV-23'],
    ['claude-grv-99', 'GRV-99'],
  ]);
  const writtenRecords = [];
  const attribution = attributionApi.createAttributionWorkflow({
    sessionSource: inMemorySessionSource(sessions),
    issueMatcher: inMemoryIssueMatcher(issueBySessionId),
    usageRecordSource: inMemoryUsageRecordSource(usageRecords),
    usageRecordSink: inMemoryUsageRecordSink(writtenRecords),
    recordedAt: RECORDED_AT,
  });

  assertIssueRollupTotals(await attribution.computeIssueCost('GRV-23'));

  const worktreeRollup = await attribution.computeWorktreeCost(WORKTREE_PATH);
  assert.equal(worktreeRollup.combinedSessions, 2);
  assert.equal(worktreeRollup.combinedTurns, 3);
  assert.equal(worktreeRollup.combinedTokens, 330);

  const usageRollup = await attribution.computeIssueCostFromUsage('GRV-23');
  assert.equal(usageRollup.issueIdentifier, 'GRV-23');
  assert.equal(usageRollup.combinedSessions, 2);
  assert.equal(usageRollup.combinedTurns, 2);
  assert.equal(usageRollup.combinedTokens, 115);
  assert.equal(usageRollup.providerTotals.claude.tokensGrandTotal, 50);
  assert.equal(usageRollup.providerTotals.codex.tokensGrandTotal, 65);

  assert.deepEqual(await attribution.backfillUsage(), {
    recordsWritten: 4,
    sessionsProcessed: 3,
    sessionsSkipped: 0,
  });
  assert.deepEqual(summarizeRecordsByIssue(writtenRecords), {
    'GRV-23': { records: 3, totalTokens: 330 },
    'GRV-99': { records: 1, totalTokens: 999 },
  });
  assert.ok(writtenRecords.every((record) => record.recordedAt === RECORDED_AT));
});
