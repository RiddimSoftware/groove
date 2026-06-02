/**
 * Public API for `llm-cost-estimation`.
 *
 * Implemented exports are re-exported from their sub-modules; the remaining
 * stubs throw until their implementing issue lands. Import from this barrel —
 * do not import from sub-modules directly.
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
 */
export { forecastIssueCost } from 'llm-cost-attribution';

/**
 * Forecast the aggregate LLM cost for an entire Linear project, given per-issue
 * estimates and a calibration dataset.
 *
 * @param {string}   projectId    Linear project identifier.
 * @param {object[]} issues       Array of `{ identifier, estimate }` objects.
 * @param {object}   [options]
 * @returns {Promise<object>}
 */
export async function forecastProjectCost(projectId, issues, options = {}) {
  throw new Error('not implemented');
}

/**
 * Build or update a calibration dataset from a set of completed issues whose
 * actual cost is known. Returns calibration parameters used by the forecast
 * functions.
 *
 * @param {object[]} completedIssues  Array of `{ identifier, estimate, actualCostUsd }`.
 * @param {object}   [options]
 * @returns {object}
 */
export function calibrate(completedIssues, options = {}) {
  throw new Error('not implemented');
}
