/**
 * Public API for `llm-cost-estimation`.
 *
 * Every shipped export is implemented here or re-exported from
 * `llm-cost-attribution`, which owns the forecaster, project forecaster, and
 * coverage backtester. Import from this barrel — do not import from sub-modules
 * directly.
 */

/**
 * Stamp the Symphony Cost Telemetry Extension's optional `estimate` field onto
 * usage records by joining each record's issue to its Linear story-point
 * estimate via an injected `LinearEstimateSource` port. Pure transform — see
 * `enrich.mjs`.
 */
export { enrichUsageWithEstimate, isValidEstimate } from './enrich.mjs';

/**
 * Linear-backed `LinearEstimateSource` adapter for `enrichUsageWithEstimate`.
 * Reads the API token from an injected option or `LINEAR_API_TOKEN`.
 */
export { createLinearEstimateSource } from './linear-estimate-source.mjs';

/**
 * Forecast tokens / turns / dollars / quota P50–P80 for a `{ size, model }`
 * cell from a set of estimate-tagged usage records. Re-exported from
 * `llm-cost-attribution`, which owns the empirical-quantile forecaster and
 * its `PricingTable` / `QuotaModel` adapters.
 *
 * Signature: `forecastIssueCost(cell, records, options?)` where `cell` is
 * `{ size, model }` and `records` are estimate-tagged usage records.
 */
export { forecastIssueCost } from 'llm-cost-attribution';

/**
 * Forecast an entire project's aggregate cost by Monte Carlo convolution over
 * its planned issues. Re-exported from `llm-cost-attribution`, which owns the
 * project forecaster.
 *
 * Estimation-friendly signature:
 * `forecastProjectCost(issues, usageSource?, options?)` where `issues` is an
 * array of `{ size, model }` IssuePlans (the same cell model
 * `forecastIssueCost` reads) and `usageSource` is estimate-tagged usage
 * records. Forecasts tokens / turns / dollars only — project-level quota is a
 * per-issue windowed quantity that does not sum, and is not forecast here.
 */
export { forecastProjectCost } from 'llm-cost-attribution';

/**
 * Backtest the empirical forecaster: on held-out estimate-tagged usage records,
 * does the actual cost land at or below the predicted P80 about 80% of the
 * time? Re-exported from `llm-cost-attribution`, which owns the coverage
 * backtester. This is the supported calibration API and the replacement for the
 * never-shipped `calibrate` placeholder below.
 *
 * Signature: `calibrateCoverage(records, options?)`.
 */
export { calibrateCoverage } from 'llm-cost-attribution';

/**
 * @deprecated Never implemented. The shipped calibration API is
 * `calibrateCoverage` (re-exported above) — a held-out P80 coverage backtest
 * over estimate-tagged usage records. This shim is retained only so old imports
 * fail loudly with a pointer to the replacement instead of silently resolving
 * to `undefined`.
 *
 * @returns {never}
 */
export function calibrate() {
  throw new Error(
    'calibrate() was never implemented and is not part of the public API; ' +
      'use calibrateCoverage() instead.',
  );
}
