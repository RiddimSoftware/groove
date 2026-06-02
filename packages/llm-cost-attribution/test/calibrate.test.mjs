/**
 * Tests for the held-out coverage backtest (`calibrateCoverage`).
 *
 * All fixtures are synthetic — generated at runtime from known distributions,
 * never real telemetry. The real-data run is a private, local-only command.
 */
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { calibrateCoverage } from '../src/calibrate.mjs';
import { syntheticRecord, syntheticUsageRecords } from '../src/synthetic.mjs';

/** Build a degenerate cell whose issues all cost exactly `value`. */
function identicalCostCell({ size, model, value, n, idPrefix }) {
  return Array.from({ length: n }, (_, i) =>
    syntheticRecord({ issueIdentifier: `${idPrefix}-${i + 1}`, size, model, totalTokens: value }));
}

describe('calibrateCoverage', () => {
  it('reports ~80% coverage for a well-calibrated cell and does not flag it', async () => {
    // 600 issues from a known log-normal: the predicted P80 from the training
    // split should cover close to 80% of held-out actuals, by construction.
    const records = syntheticUsageRecords({ p50: 5000, p80: 12000, n: 600, seed: 42, size: 'L', model: 'sonnet' });

    const report = await calibrateCoverage(records, { seed: 7, holdoutFraction: 0.3 });

    assert.equal(report.cells.length, 1);
    const cell = report.cells[0];
    assert.deepEqual(cell.cell, { size: 'L', model: 'sonnet' });
    assert.equal(cell.trainN + cell.holdoutN, 600);
    assert.ok(cell.holdoutN >= 5, 'cell should have enough held-out issues');
    assert.equal(cell.lowConfidence, false);
    // Coverage lands within the 10-point band around 0.80, so it is not flagged.
    assert.ok(Math.abs(cell.coverage - 0.8) <= 0.1, `coverage ${cell.coverage} should be within 0.10 of 0.80`);
    assert.equal(cell.flagged, false);
    assert.equal(report.overall.flagged, false);
    assert.equal(report.overall.flaggedCells, 0);
  });

  it('flags a cell whose P80 band over-covers (coverage far from 80%)', async () => {
    // Every issue costs the same, so the predicted P80 equals that value and
    // every held-out actual is ≤ it → 100% coverage, 20 points off target.
    const records = identicalCostCell({ size: 'M', model: 'opus', value: 1000, n: 60, idPrefix: 'IDENT' });

    const report = await calibrateCoverage(records, { seed: 1, holdoutFraction: 0.2 });

    const cell = report.cells[0];
    assert.equal(cell.coverage, 1);
    assert.equal(cell.lowConfidence, false);
    assert.equal(cell.flagged, true, 'a 100%-coverage cell must be flagged');
    assert.equal(report.overall.flaggedCells, 1);
  });

  it('does not flag thin cells even when coverage is extreme (low confidence)', async () => {
    // Only 4 issues → fewer than the default minimums for both train and
    // holdout, so the cell is reported but never flagged on noise.
    const records = identicalCostCell({ size: 'S', model: 'opus', value: 500, n: 4, idPrefix: 'THIN' });

    const report = await calibrateCoverage(records, { seed: 1 });

    const cell = report.cells[0];
    assert.equal(cell.lowConfidence, true);
    assert.equal(cell.flagged, false);
  });

  it('holds out nothing for a single-issue cell', async () => {
    const records = [syntheticRecord({ issueIdentifier: 'SOLO-1', size: 'XL', model: 'opus', totalTokens: 1234 })];

    const report = await calibrateCoverage(records, { seed: 1 });

    const cell = report.cells[0];
    assert.equal(cell.trainN, 1);
    assert.equal(cell.holdoutN, 0);
    assert.equal(cell.coverage, null);
    assert.equal(cell.lowConfidence, true);
    assert.equal(cell.flagged, false);
    assert.equal(report.overall.coverage, null);
  });

  it('separates issues into independent {size, model} cells', async () => {
    const records = [
      ...syntheticUsageRecords({ p50: 1000, p80: 2000, n: 40, seed: 5, size: 'S', model: 'sonnet', idPrefix: 'S' }),
      ...syntheticUsageRecords({ p50: 9000, p80: 20000, n: 40, seed: 6, size: 'L', model: 'sonnet', idPrefix: 'L' }),
    ];

    const report = await calibrateCoverage(records, { seed: 3 });

    assert.equal(report.cells.length, 2);
    assert.deepEqual(report.cells.map((c) => c.cell.size).sort(), ['L', 'S']);
    // Overall holdout is the sum of per-cell holdouts.
    assert.equal(
      report.overall.holdoutN,
      report.cells.reduce((sum, c) => sum + c.holdoutN, 0),
    );
    assert.equal(report.overall.cellsTotal, 2);
  });

  it('is deterministic under a fixed seed', async () => {
    const records = syntheticUsageRecords({ p50: 3000, p80: 8000, n: 200, seed: 11, size: 'L', model: 'sonnet' });

    const a = await calibrateCoverage(records, { seed: 5 });
    const b = await calibrateCoverage(records, { seed: 5 });

    assert.deepEqual(a, b, 'same seed must yield an identical report');
  });

  it('changes the split when the seed changes', async () => {
    const records = syntheticUsageRecords({ p50: 3000, p80: 8000, n: 200, seed: 11, size: 'L', model: 'sonnet' });

    const a = await calibrateCoverage(records, { seed: 1 });
    const b = await calibrateCoverage(records, { seed: 2 });

    // The split (hence coverage / predicted band) should generally differ.
    assert.notDeepEqual(a.cells[0], b.cells[0]);
  });

  it('skips records with no cell, no issue id, or unavailable tokens', async () => {
    const records = [
      ...syntheticUsageRecords({ p50: 1000, p80: 2000, n: 10, seed: 5, size: 'L', model: 'sonnet' }),
      { ...syntheticRecord({ issueIdentifier: 'X-1', size: 'L', model: 'sonnet', totalTokens: 0 }), usageSource: 'unavailable', inputTokens: null, outputTokens: null, totalTokens: null },
      syntheticRecord({ issueIdentifier: 'X-2', size: 'L', model: '', totalTokens: 100 }), // no model → no cell
      { schemaVersion: 1, size: 'L', model: 'sonnet', totalTokens: 100 }, // no issue id
    ];

    const report = await calibrateCoverage(records, { seed: 1 });

    assert.equal(report.overall.recordsTotal, 13);
    assert.equal(report.overall.recordsSkipped, 3);
    assert.equal(report.overall.issuesTotal, 10);
  });

  it('honors the estimate tag as the cell size axis', async () => {
    // Records carry `estimate` instead of `size`; the forecaster (and backtest)
    // use estimate as the size key, so these form one cell.
    const records = Array.from({ length: 20 }, (_, i) => {
      const rec = syntheticRecord({ issueIdentifier: `E-${i + 1}`, size: 'L', model: 'sonnet', totalTokens: 1000 + i });
      delete rec.size;
      return { ...rec, estimate: 8 };
    });

    const report = await calibrateCoverage(records, { seed: 1 });

    assert.equal(report.cells.length, 1);
    assert.deepEqual(report.cells[0].cell, { size: '8', model: 'sonnet' });
  });
});
