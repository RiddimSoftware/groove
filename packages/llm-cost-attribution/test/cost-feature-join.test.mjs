import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { joinCostWithFeature, BUILTIN_JOIN_STRATEGIES } from '../src/index.mjs';

/** Minimal spec-shaped usage record (only the fields the join reads). */
function usage(overrides = {}) {
  return {
    schemaVersion: 1,
    provider: 'claude',
    usageSource: 'provider_reported',
    totalTokens: 0,
    startedAt: '2026-01-01T00:00:00.000Z',
    endedAt: '2026-01-01T00:00:01.000Z',
    ...overrides,
  };
}

function diff(overrides = {}) {
  return { key: undefined, additions: 0, deletions: 0, changedFiles: 0, ...overrides };
}

describe('joinCostWithFeature — default issue-key strategy', () => {
  it('emits one { feature, cost } pair per joined issue and reports unjoined keys', async () => {
    const out = await joinCostWithFeature({
      usage: [
        usage({ issueIdentifier: 'ABC-12', totalTokens: 100 }),
        usage({ issueIdentifier: 'ABC-12', totalTokens: 50 }),
        usage({ issueIdentifier: 'ABC-99', totalTokens: 7 }), // diff-less -> unjoined
      ],
      diffs: [
        diff({ key: 'ABC-12', additions: 30, deletions: 10, changedFiles: 3 }),
        diff({ key: 'ABC-77', additions: 5, deletions: 0, changedFiles: 1 }), // cost-less -> unjoined
      ],
    });

    assert.equal(out.pairs.length, 1);
    assert.equal(out.pairs[0].key, 'ABC-12');
    assert.equal(out.pairs[0].feature, 40); // additions + deletions
    assert.deepEqual(out.pairs[0].cost, { tokens: 150, turns: 2 });
    assert.deepEqual(out.unjoined, { usage: ['ABC-99'], diffs: ['ABC-77'] });
  });

  it('defaults to issue-key when no strategy is named', async () => {
    const explicit = await joinCostWithFeature({
      strategy: 'issue-key',
      usage: [usage({ issueIdentifier: 'X-1', totalTokens: 9 })],
      diffs: [diff({ key: 'X-1', additions: 1, deletions: 1 })],
    });
    const implicit = await joinCostWithFeature({
      usage: [usage({ issueIdentifier: 'X-1', totalTokens: 9 })],
      diffs: [diff({ key: 'X-1', additions: 1, deletions: 1 })],
    });
    assert.deepEqual(implicit, explicit);
  });

  it('derives the key from workspacePath via the cwd-pattern when issueIdentifier is absent', async () => {
    const out = await joinCostWithFeature({
      usage: [
        usage({ workspacePath: '/Users/x/code/repo/.symphony/workspaces/DEF-3', totalTokens: 20 }),
        usage({ workspacePath: '/tmp/symphony_workspaces/DEF-3', totalTokens: 5 }),
      ],
      diffs: [diff({ key: 'DEF-3', additions: 2, deletions: 3 })],
    });
    assert.equal(out.pairs.length, 1);
    assert.equal(out.pairs[0].key, 'DEF-3');
    assert.deepEqual(out.pairs[0].cost, { tokens: 25, turns: 2 });
  });

  it('honours an overridable cwdPattern instead of leaking the org default', async () => {
    const out = await joinCostWithFeature({
      cwdPattern: /\/issues\/([A-Z]+-\d+)$/,
      usage: [usage({ workspacePath: '/home/dev/issues/PROJ-9', totalTokens: 11 })],
      diffs: [diff({ key: 'PROJ-9', additions: 4, deletions: 0 })],
    });
    assert.equal(out.pairs.length, 1);
    assert.equal(out.pairs[0].key, 'PROJ-9');
  });

  it('skips unavailable records (no tokens, no turn)', async () => {
    const out = await joinCostWithFeature({
      usage: [
        usage({ issueIdentifier: 'A-1', totalTokens: 100 }),
        usage({ issueIdentifier: 'A-1', usageSource: 'unavailable', totalTokens: null }),
      ],
      diffs: [diff({ key: 'A-1', additions: 1, deletions: 1 })],
    });
    assert.deepEqual(out.pairs[0].cost, { tokens: 100, turns: 1 });
  });

  it('accepts async-iterable streams (as readUsageRecords / readGitDiffs produce)', async () => {
    async function* gen(items) {
      for (const i of items) yield i;
    }
    const out = await joinCostWithFeature({
      usage: gen([usage({ issueIdentifier: 'G-1', totalTokens: 8 })]),
      diffs: gen([diff({ key: 'G-1', additions: 3, deletions: 1 })]),
    });
    assert.equal(out.pairs.length, 1);
    assert.deepEqual(out.pairs[0].cost, { tokens: 8, turns: 1 });
    assert.equal(out.pairs[0].feature, 4);
  });
});

describe('joinCostWithFeature — custom key extractors', () => {
  it('matches on the caller keys, not the default cwd/subject patterns', async () => {
    const out = await joinCostWithFeature({
      keyOfUsage: (u) => u.ticket,
      keyOfDiff: (d) => d.branch,
      usage: [
        usage({ ticket: 'epic/login', issueIdentifier: 'IGNORED-1', totalTokens: 12 }),
        usage({ ticket: 'epic/login', totalTokens: 8 }),
      ],
      diffs: [diff({ branch: 'epic/login', key: 'IGNORED', additions: 6, deletions: 4 })],
    });
    assert.equal(out.pairs.length, 1);
    assert.equal(out.pairs[0].key, 'epic/login');
    assert.deepEqual(out.pairs[0].cost, { tokens: 20, turns: 2 });
    assert.equal(out.pairs[0].feature, 10);
  });

  it('falls back to the strategy extractor for the side the caller did not override', async () => {
    const out = await joinCostWithFeature({
      keyOfDiff: (d) => d.branch, // usage still uses issue-key default
      usage: [usage({ issueIdentifier: 'H-1', totalTokens: 4 })],
      diffs: [diff({ branch: 'H-1', additions: 2, deletions: 0 })],
    });
    assert.equal(out.pairs.length, 1);
    assert.equal(out.pairs[0].key, 'H-1');
  });
});

describe('joinCostWithFeature — worktree strategy', () => {
  it('joins cost-of-a-directory to diff-of-the-branch by normalized workspace path', async () => {
    const out = await joinCostWithFeature({
      strategy: 'worktree',
      usage: [
        usage({ workspacePath: '/work/wt-a/', totalTokens: 30 }), // trailing slash normalized away
        usage({ workspacePath: '/work/wt-a', totalTokens: 20 }),
        usage({ workspacePath: '/work/wt-b', totalTokens: 99 }),
      ],
      diffs: [diff({ workspacePath: '/work/wt-a', additions: 12, deletions: 8 })],
    });
    assert.equal(out.pairs.length, 1);
    assert.equal(out.pairs[0].key, '/work/wt-a');
    assert.deepEqual(out.pairs[0].cost, { tokens: 50, turns: 2 });
    assert.equal(out.pairs[0].feature, 20);
    assert.deepEqual(out.unjoined, { usage: ['/work/wt-b'], diffs: [] });
  });
});

describe('joinCostWithFeature — time strategy (noisy fallback)', () => {
  it('attributes cost in the window before a commit to that commit', async () => {
    const out = await joinCostWithFeature({
      strategy: 'time',
      window: { minutes: 30 },
      usage: [
        usage({ endedAt: '2026-01-01T11:50:00.000Z', totalTokens: 10 }), // within 30m before commit
        usage({ endedAt: '2026-01-01T11:55:00.000Z', totalTokens: 5 }),
        usage({ endedAt: '2026-01-01T09:00:00.000Z', totalTokens: 999 }), // too early -> unjoined
      ],
      diffs: [diff({ committedAt: '2026-01-01T12:00:00.000Z', additions: 7, deletions: 3 })],
    });
    assert.equal(out.pairs.length, 1);
    assert.equal(out.pairs[0].feature, 10);
    assert.deepEqual(out.pairs[0].cost, { tokens: 15, turns: 2 });
    assert.equal(out.pairs[0].approximate, true);
    assert.equal(out.unjoined.usage.length, 1);
    assert.equal(out.unjoined.usage[0], '2026-01-01T09:00:00.000Z');
  });

  it('credits each cost record to the nearest following commit only (no double count)', async () => {
    const out = await joinCostWithFeature({
      strategy: 'time',
      window: { hours: 2 },
      usage: [usage({ endedAt: '2026-01-01T10:30:00.000Z', totalTokens: 100 })],
      diffs: [
        diff({ committedAt: '2026-01-01T11:00:00.000Z', additions: 1, deletions: 0 }), // nearest after
        diff({ committedAt: '2026-01-01T12:00:00.000Z', additions: 9, deletions: 0 }), // also in window, but later
      ],
    });
    const totalTokens = out.pairs.reduce((s, p) => s + p.cost.tokens, 0);
    assert.equal(totalTokens, 100);
    assert.equal(out.pairs.length, 1);
    assert.equal(out.pairs[0].feature, 1); // attributed to the 11:00 commit
    assert.equal(out.unjoined.diffs.length, 1); // the 12:00 commit got nothing
  });

  it('requires a positive window', async () => {
    await assert.rejects(
      () => joinCostWithFeature({ strategy: 'time', usage: [], diffs: [] }),
      /requires a positive `window`/,
    );
  });
});

describe('joinCostWithFeature — full custom join', () => {
  it('bypasses strategies and returns the caller pairs', async () => {
    const out = await joinCostWithFeature({
      usage: [usage({ totalTokens: 1 })],
      diffs: [diff({ additions: 2 })],
      join: (u, d) => [{ feature: d.length, cost: { tokens: u.length, turns: u.length } }],
    });
    assert.deepEqual(out, {
      pairs: [{ feature: 1, cost: { tokens: 1, turns: 1 } }],
      unjoined: { usage: [], diffs: [] },
    });
  });

  it('validates the returned pair shape (numeric feature)', async () => {
    await assert.rejects(
      () => joinCostWithFeature({ usage: [], diffs: [], join: () => [{ feature: 'big', cost: { tokens: 1, turns: 1 } }] }),
      /feature must be a finite number/,
    );
  });

  it('validates the returned cost shape (numeric tokens/turns)', async () => {
    await assert.rejects(
      () => joinCostWithFeature({ usage: [], diffs: [], join: () => [{ feature: 1, cost: { tokens: 1 } }] }),
      /cost\.turns must be a finite number/,
    );
    await assert.rejects(
      () => joinCostWithFeature({ usage: [], diffs: [], join: () => [{ feature: 1 }] }),
      /cost must be an object/,
    );
  });

  it('rejects a join that does not return an array', async () => {
    await assert.rejects(
      () => joinCostWithFeature({ usage: [], diffs: [], join: () => ({}) }),
      /must return an array/,
    );
  });
});

describe('joinCostWithFeature — registry & validation', () => {
  it('exposes the built-in strategy names', () => {
    assert.deepEqual([...BUILTIN_JOIN_STRATEGIES], ['issue-key', 'worktree', 'time']);
  });

  it('throws on an unknown strategy', async () => {
    await assert.rejects(
      () => joinCostWithFeature({ strategy: 'nope', usage: [], diffs: [] }),
      /unknown join strategy/,
    );
  });

  it('produces correlate-ready pairs (numeric feature, cost.tokens, cost.turns)', async () => {
    const out = await joinCostWithFeature({
      usage: [usage({ issueIdentifier: 'C-1', totalTokens: 42 })],
      diffs: [diff({ key: 'C-1', additions: 5, deletions: 5 })],
    });
    for (const pair of out.pairs) {
      assert.equal(typeof pair.feature, 'number');
      assert.equal(typeof pair.cost.tokens, 'number');
      assert.equal(typeof pair.cost.turns, 'number');
    }
  });
});
