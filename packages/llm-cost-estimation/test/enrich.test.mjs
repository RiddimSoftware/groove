import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { enrichUsageWithEstimate, isValidEstimate } from '../src/enrich.mjs';

/**
 * A fake `LinearEstimateSource` (no network — see AC "no live Linear calls in
 * tests"). Built from a plain `{ identifier: estimate|null }` map. Records the
 * argument lists it was called with so tests can assert de-duplication and that
 * the source is queried at most once.
 */
function fakeEstimateSource(estimatesById) {
  const calls = [];
  return {
    calls,
    async resolveEstimates(ids) {
      calls.push([...ids]);
      const out = new Map();
      for (const id of ids) {
        out.set(id, Object.prototype.hasOwnProperty.call(estimatesById, id) ? estimatesById[id] : null);
      }
      return out;
    },
  };
}

/** A minimal spec-valid (§5.1) usage record, estimate-free. */
const usageRecord = (overrides = {}) => ({
  schemaVersion: 1,
  recordedAt: '2026-05-01T00:00:00Z',
  runID: '0ed83fa7-7a8a-4e3a-8c6a-7d35f8c9b3a3',
  turn: 1,
  issueIdentifier: 'EPAC-1999',
  provider: 'claude',
  model: 'claude-sonnet-4-6',
  botRole: 'developer',
  inputTokens: 100,
  outputTokens: 50,
  totalTokens: 150,
  usageSource: 'provider_reported',
  startedAt: '2026-05-01T00:00:00Z',
  endedAt: '2026-05-01T00:00:05Z',
  ...overrides,
});

/**
 * Spec §5.1 required-field check plus the §5.2 `estimate` constraint
 * (non-negative integer when present). Self-contained so the estimation
 * package stays dependency-free (CI runs `node --test` with no install).
 */
function recordSchemaError(rec) {
  if (rec === null || typeof rec !== 'object' || Array.isArray(rec)) return 'not a JSON object';
  if (!Number.isInteger(rec.schemaVersion) || rec.schemaVersion < 1) return 'schemaVersion';
  if (typeof rec.issueIdentifier !== 'string' || rec.issueIdentifier === '') return 'issueIdentifier';
  if (typeof rec.model !== 'string') return 'model';
  if (rec.botRole !== 'developer' && rec.botRole !== 'reviewer') return 'botRole';
  if ('estimate' in rec && !isValidEstimate(rec.estimate)) return 'estimate must be a non-negative integer';
  return null;
}

describe('enrichUsageWithEstimate', () => {
  it('stamps the estimate onto every matching record, leaving other fields unchanged', async () => {
    const records = [
      usageRecord({ turn: 1 }),
      usageRecord({ turn: 2 }),
    ];
    const source = fakeEstimateSource({ 'EPAC-1999': 4 });

    const { records: out } = await enrichUsageWithEstimate(records, source);

    assert.equal(out.length, 2);
    for (const [i, rec] of out.entries()) {
      assert.equal(rec.estimate, 4);
      // Every other field is preserved exactly.
      assert.deepEqual({ ...rec, estimate: undefined }, { ...records[i], estimate: undefined });
    }
  });

  it('leaves estimate absent (never 0) and reports the issue when it has no estimate', async () => {
    const records = [usageRecord({ issueIdentifier: 'EPAC-2000' })];
    const source = fakeEstimateSource({ 'EPAC-2000': null });

    const { records: out, unresolved, stats } = await enrichUsageWithEstimate(records, source);

    assert.ok(!('estimate' in out[0]), 'estimate must be absent, not 0');
    assert.deepEqual(unresolved, ['EPAC-2000']);
    assert.equal(stats.issuesUnresolved, 1);
    assert.equal(stats.recordsEnriched, 0);
  });

  it('treats an issue that no longer resolves (absent from source) as unresolved', async () => {
    const records = [usageRecord({ issueIdentifier: 'GONE-1' })];
    const source = fakeEstimateSource({}); // source returns null for unknown ids

    const { records: out, unresolved } = await enrichUsageWithEstimate(records, source);

    assert.ok(!('estimate' in out[0]));
    assert.deepEqual(unresolved, ['GONE-1']);
  });

  it('stamps estimate 0 — a real estimate value, not a missing one', async () => {
    const records = [usageRecord({ issueIdentifier: 'ZERO-1' })];
    const source = fakeEstimateSource({ 'ZERO-1': 0 });

    const { records: out, unresolved, stats } = await enrichUsageWithEstimate(records, source);

    assert.equal(out[0].estimate, 0);
    assert.deepEqual(unresolved, []);
    assert.equal(stats.recordsEnriched, 1);
  });

  it('de-duplicates distinct issue IDs before querying (≤1 lookup per issue)', async () => {
    const records = [
      usageRecord({ issueIdentifier: 'EPAC-1999', turn: 1 }),
      usageRecord({ issueIdentifier: 'EPAC-1999', turn: 2 }),
      usageRecord({ issueIdentifier: 'EPAC-2000', turn: 1 }),
      usageRecord({ issueIdentifier: 'EPAC-1999', turn: 3 }),
    ];
    const source = fakeEstimateSource({ 'EPAC-1999': 4, 'EPAC-2000': 2 });

    const { records: out, stats } = await enrichUsageWithEstimate(records, source);

    // The source is called exactly once, with the distinct identifiers only.
    assert.equal(source.calls.length, 1);
    assert.deepEqual([...source.calls[0]].sort(), ['EPAC-1999', 'EPAC-2000']);
    assert.equal(stats.issuesQueried, 2);

    // But every record — including the three EPAC-1999 turns — is stamped.
    assert.deepEqual(out.map((r) => r.estimate), [4, 4, 2, 4]);
    assert.equal(stats.recordsEnriched, 4);
  });

  it('handles a mix of resolved and unresolved issues', async () => {
    const records = [
      usageRecord({ issueIdentifier: 'A-1' }),
      usageRecord({ issueIdentifier: 'B-2' }),
      usageRecord({ issueIdentifier: 'C-3' }),
    ];
    const source = fakeEstimateSource({ 'A-1': 1, 'B-2': null });

    const { records: out, unresolved, stats } = await enrichUsageWithEstimate(records, source);

    assert.equal(out[0].estimate, 1);
    assert.ok(!('estimate' in out[1]));
    assert.ok(!('estimate' in out[2]));
    assert.deepEqual(unresolved, ['B-2', 'C-3']);
    assert.deepEqual(stats, {
      recordsTotal: 3,
      recordsEnriched: 1,
      issuesQueried: 3,
      issuesResolved: 1,
      issuesUnresolved: 2,
    });
  });

  it('does not stamp a non-integer or negative estimate (defensive against bad data)', async () => {
    const records = [
      usageRecord({ issueIdentifier: 'FLOAT-1' }),
      usageRecord({ issueIdentifier: 'NEG-1' }),
    ];
    const source = fakeEstimateSource({ 'FLOAT-1': 2.5, 'NEG-1': -3 });

    const { records: out, unresolved } = await enrichUsageWithEstimate(records, source);

    assert.ok(!('estimate' in out[0]));
    assert.ok(!('estimate' in out[1]));
    assert.deepEqual(unresolved, ['FLOAT-1', 'NEG-1']);
  });

  it('produces records that validate against the Cost Telemetry Extension schema', async () => {
    const records = [
      usageRecord({ issueIdentifier: 'EPAC-1999' }),
      usageRecord({ issueIdentifier: 'EPAC-2000' }),
    ];
    const source = fakeEstimateSource({ 'EPAC-1999': 4, 'EPAC-2000': null });

    const { records: out } = await enrichUsageWithEstimate(records, source);

    for (const rec of out) {
      assert.equal(recordSchemaError(rec), null);
    }
  });

  it('does not mutate the input records (pure transform)', async () => {
    const input = [usageRecord({ issueIdentifier: 'EPAC-1999' })];
    const snapshot = JSON.parse(JSON.stringify(input));
    const source = fakeEstimateSource({ 'EPAC-1999': 4 });

    await enrichUsageWithEstimate(input, source);

    assert.deepEqual(input, snapshot);
    assert.ok(!('estimate' in input[0]));
  });

  it('does not query the source when there are no records', async () => {
    const source = fakeEstimateSource({ 'EPAC-1999': 4 });
    const { records: out, unresolved, stats } = await enrichUsageWithEstimate([], source);
    assert.deepEqual(out, []);
    assert.deepEqual(unresolved, []);
    assert.equal(source.calls.length, 0);
    assert.equal(stats.issuesQueried, 0);
  });

  it('throws when the source does not implement the port', async () => {
    await assert.rejects(
      () => enrichUsageWithEstimate([usageRecord()], {}),
      /resolveEstimates/,
    );
  });
});

describe('isValidEstimate', () => {
  it('accepts non-negative integers including 0', () => {
    assert.equal(isValidEstimate(0), true);
    assert.equal(isValidEstimate(4), true);
  });

  it('rejects null, fractional, negative, and non-numbers', () => {
    assert.equal(isValidEstimate(null), false);
    assert.equal(isValidEstimate(undefined), false);
    assert.equal(isValidEstimate(2.5), false);
    assert.equal(isValidEstimate(-1), false);
    assert.equal(isValidEstimate('4'), false);
  });
});
