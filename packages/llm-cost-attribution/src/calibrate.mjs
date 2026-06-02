/**
 * Coverage backtest for the empirical quantile forecaster (GRV-3).
 *
 * "P80" only earns its name if, on held-out issues, the actual cost lands at or
 * below the predicted P80 about 80% of the time. `calibrateCoverage` measures
 * exactly that: it groups an estimate-tagged usage dataset into `{ size, model }`
 * cells, deterministically holds out a fraction of each cell's issues, fits the
 * forecaster on the rest, and reports — per cell and overall — the empirical
 * fraction of held-out actuals at or below the predicted P80. Cells whose
 * coverage drifts from the target by more than `deviationThreshold` are flagged.
 *
 * The function is pure and I/O-free: callers stream records in (e.g. from
 * `readUsageRecords(path)`) and render the returned report however they like.
 * The held-out split is fully determined by `seed`, so a run is reproducible.
 */
import { featureCellOf, forecastIssueCost, issueIdentifierFor, totalTokensFor } from './forecast.mjs';
import { mulberry32 } from './synthetic.mjs';

/** Quantile band the backtest checks by default (the "P80" in the user story). */
export const DEFAULT_CALIBRATION_QUANTILE = 0.8;
/** Fraction of each cell's issues held out for backtesting by default. */
export const DEFAULT_HOLDOUT_FRACTION = 0.2;
/** Flag a cell when |coverage − quantile| exceeds this (10 percentage points). */
export const DEFAULT_DEVIATION_THRESHOLD = 0.1;
/** Minimum held-out issues in a cell before its coverage is trusted enough to flag. */
export const DEFAULT_MIN_HOLDOUT = 5;
/** Minimum training issues in a cell before its forecast is trusted enough to flag. */
export const DEFAULT_MIN_TRAIN = 5;

/**
 * Run the held-out coverage backtest.
 *
 * @param {Iterable<object> | AsyncIterable<object>} records  Estimate-tagged usage records.
 * @param {object} [options]
 * @param {number} [options.seed=1]                Seed for the deterministic per-cell split.
 * @param {number} [options.holdoutFraction=0.2]   Fraction of each cell's issues to hold out.
 * @param {number} [options.quantile=0.8]          Quantile band to test.
 * @param {number} [options.deviationThreshold=0.1] Flag threshold, in coverage fraction.
 * @param {number} [options.minHoldout=5]          Min held-out issues before a cell is flaggable.
 * @param {number} [options.minTrain=5]            Min training issues before a cell is flaggable.
 * @returns {Promise<CalibrationReport>}
 */
export async function calibrateCoverage(records, options = {}) {
  const seed = normalizeSeed(options.seed);
  const holdoutFraction = normalizeFraction(options.holdoutFraction, DEFAULT_HOLDOUT_FRACTION, 'holdoutFraction');
  const quantile = normalizeFraction(options.quantile, DEFAULT_CALIBRATION_QUANTILE, 'quantile', { exclusive: true });
  const deviationThreshold = normalizeFraction(options.deviationThreshold, DEFAULT_DEVIATION_THRESHOLD, 'deviationThreshold');
  const minHoldout = normalizePositiveInt(options.minHoldout, DEFAULT_MIN_HOLDOUT, 'minHoldout');
  const minTrain = normalizePositiveInt(options.minTrain, DEFAULT_MIN_TRAIN, 'minTrain');

  const { cells, skippedRecords, totalRecords } = await groupIntoCells(records);

  const cellReports = [];
  let overallHoldout = 0;
  let overallCovered = 0;

  // Sort cells for stable output (size, then model).
  const cellKeys = [...cells.keys()].sort();
  for (const key of cellKeys) {
    const cell = cells.get(key);
    const cellReport = await backtestCell(cell, {
      seed, holdoutFraction, quantile, deviationThreshold, minHoldout, minTrain,
    });
    cellReports.push(cellReport);
    overallHoldout += cellReport.holdoutN;
    overallCovered += cellReport.covered;
  }

  const overallCoverage = overallHoldout > 0 ? overallCovered / overallHoldout : null;
  const flaggedCells = cellReports.filter((c) => c.flagged).length;

  return {
    quantile,
    seed,
    holdoutFraction,
    deviationThreshold,
    cells: cellReports,
    overall: {
      recordsTotal: totalRecords,
      recordsSkipped: skippedRecords,
      issuesTotal: cellReports.reduce((sum, c) => sum + c.trainN + c.holdoutN, 0),
      cellsTotal: cellReports.length,
      holdoutN: overallHoldout,
      covered: overallCovered,
      coverage: overallCoverage,
      flaggedCells,
      flagged: overallCoverage !== null
        && overallHoldout >= minHoldout
        && Math.abs(overallCoverage - quantile) > deviationThreshold,
    },
  };
}

/**
 * Backtest a single cell: split its issues, fit the forecaster on the training
 * half via `forecastIssueCost`, and score the held-out half against the
 * predicted P80.
 */
async function backtestCell(cell, opts) {
  const { seed, holdoutFraction, quantile, deviationThreshold, minHoldout, minTrain } = opts;

  // Deterministic per-cell split: stable issue order, seeded shuffle, hold out a
  // suffix. The per-cell seed is derived from the global seed + cell key so cells
  // shuffle independently yet reproducibly.
  const issues = [...cell.issues.values()].sort((a, b) => (a.issueIdentifier < b.issueIdentifier ? -1 : a.issueIdentifier > b.issueIdentifier ? 1 : 0));
  const order = seededShuffle(issues.length, hashStringToSeed(cell.key, seed));
  const holdoutCount = holdoutSize(issues.length, holdoutFraction);

  const trainIssues = [];
  const holdoutIssues = [];
  for (let i = 0; i < order.length; i++) {
    (i < issues.length - holdoutCount ? trainIssues : holdoutIssues).push(issues[order[i]]);
  }

  // Fit on training records using the real forecaster (consume GRV-3).
  const trainRecords = trainIssues.flatMap((iss) => iss.records);
  const forecast = await forecastIssueCost(
    { size: cell.size, model: cell.model },
    trainRecords,
    { minSampleSize: minTrain },
  );
  const predicted = quantile === DEFAULT_CALIBRATION_QUANTILE
    ? forecast.tokens.p80
    : forecastQuantile(trainIssues, quantile);

  // Score held-out actuals against the predicted band.
  let covered = 0;
  for (const iss of holdoutIssues) {
    if (predicted !== null && iss.total <= predicted) covered += 1;
  }
  const coverage = holdoutIssues.length > 0 ? covered / holdoutIssues.length : null;

  const lowConfidence = trainIssues.length < minTrain || holdoutIssues.length < minHoldout;
  const flagged = coverage !== null
    && !lowConfidence
    && predicted !== null
    && Math.abs(coverage - quantile) > deviationThreshold;

  return {
    cell: { size: cell.size, model: cell.model },
    key: cell.key,
    trainN: trainIssues.length,
    holdoutN: holdoutIssues.length,
    predictedP80: predicted,
    covered,
    coverage,
    lowConfidence,
    flagged,
  };
}

/**
 * Empirical nearest-rank quantile over training issues' per-cell totals. Only
 * used when the caller asks for a band other than the forecaster's native P80;
 * for P80 we read it straight off `forecastIssueCost` so the backtest scores the
 * exact value the forecaster would ship.
 */
function forecastQuantile(trainIssues, quantile) {
  const sorted = trainIssues.map((iss) => iss.total).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const index = Math.ceil(quantile * sorted.length) - 1;
  return sorted[Math.min(sorted.length - 1, Math.max(0, index))];
}

/**
 * Stream records into `{ size, model }` cells, each carrying per-issue totals
 * and the raw records the forecaster needs. A record is skipped when it has no
 * resolvable cell ({size|estimate, model}), no issue identifier, or no usable
 * token count (e.g. `usageSource: "unavailable"`).
 */
async function groupIntoCells(records) {
  const cells = new Map();
  let totalRecords = 0;
  let skippedRecords = 0;

  for await (const record of iterate(records)) {
    totalRecords += 1;
    const { size, model } = featureCellOf(record);
    const issueIdentifier = issueIdentifierFor(record);
    const tokens = totalTokensFor(record);
    if (size === null || model === null || issueIdentifier === null || tokens === null) {
      skippedRecords += 1;
      continue;
    }

    const key = `${size} ${model}`;
    let cell = cells.get(key);
    if (cell === undefined) {
      cell = { key, size, model, issues: new Map() };
      cells.set(key, cell);
    }
    let issue = cell.issues.get(issueIdentifier);
    if (issue === undefined) {
      issue = { issueIdentifier, total: 0, records: [] };
      cell.issues.set(issueIdentifier, issue);
    }
    issue.total += tokens;
    issue.records.push(record);
  }

  return { cells, skippedRecords, totalRecords };
}

async function *iterate(source) {
  if (source === null || source === undefined) return;
  yield* source;
}

/**
 * Held-out count for a cell: ⌈holdoutFraction · size⌉, but always leave at least
 * one training issue, and hold out at least one issue once the cell has two.
 * Cells with a single issue can't be both trained and tested, so they hold out
 * nothing.
 */
function holdoutSize(size, holdoutFraction) {
  if (size < 2) return 0;
  const raw = Math.max(1, Math.round(holdoutFraction * size));
  return Math.min(raw, size - 1);
}

/**
 * Seeded Fisher–Yates permutation of indices [0, n). Returns the shuffled index
 * order. Deterministic for a given `(n, seed)`.
 */
function seededShuffle(n, seed) {
  const rng = mulberry32(seed);
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = order[i];
    order[i] = order[j];
    order[j] = tmp;
  }
  return order;
}

/** FNV-1a-style hash of a string folded with a numeric seed → 32-bit PRNG seed. */
function hashStringToSeed(str, seed) {
  let h = (seed >>> 0) ^ 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function normalizeSeed(value) {
  if (value === undefined) return 1;
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new TypeError('calibrateCoverage: options.seed must be an integer');
  }
  return value >>> 0;
}

function normalizeFraction(value, fallback, name, { exclusive = false } = {}) {
  if (value === undefined) return fallback;
  const lowOk = exclusive ? value > 0 : value >= 0;
  const highOk = exclusive ? value < 1 : value <= 1;
  if (typeof value !== 'number' || !Number.isFinite(value) || !lowOk || !highOk) {
    throw new TypeError(`calibrateCoverage: options.${name} must be a number in ${exclusive ? '(0, 1)' : '[0, 1]'}`);
  }
  return value;
}

function normalizePositiveInt(value, fallback, name) {
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new TypeError(`calibrateCoverage: options.${name} must be a positive integer`);
  }
  return value;
}

/**
 * @typedef {object} CalibrationCellReport
 * @property {{ size: string, model: string }} cell
 * @property {string} key
 * @property {number} trainN              Training issues fitted on.
 * @property {number} holdoutN            Held-out issues scored.
 * @property {number | null} predictedP80 Predicted band from the training set.
 * @property {number} covered            Held-out actuals at or below the band.
 * @property {number | null} coverage    covered / holdoutN, or null when none held out.
 * @property {boolean} lowConfidence     Too few training/held-out issues to trust.
 * @property {boolean} flagged           Coverage deviates from the target beyond threshold.
 */

/**
 * @typedef {object} CalibrationReport
 * @property {number} quantile
 * @property {number} seed
 * @property {number} holdoutFraction
 * @property {number} deviationThreshold
 * @property {CalibrationCellReport[]} cells
 * @property {{
 *   recordsTotal: number, recordsSkipped: number, issuesTotal: number,
 *   cellsTotal: number, holdoutN: number, covered: number,
 *   coverage: number | null, flaggedCells: number, flagged: boolean,
 * }} overall
 */
