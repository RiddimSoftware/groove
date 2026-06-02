/**
 * Public API for `llm-cost-estimation`.
 *
 * Each export is a stub that throws until its implementing issue lands.
 * Import from this barrel — do not import from sub-modules directly.
 */

/**
 * Forecast the expected LLM cost for a single Linear issue, given its
 * story-point estimate and a calibration dataset.
 *
 * @param {string} issueIdentifier  e.g. "GRV-42"
 * @param {number} estimate         Story-point estimate (e.g. 1, 2, 3).
 * @param {object} [options]
 * @returns {Promise<object>}
 */
export async function forecastIssueCost(issueIdentifier, estimate, options = {}) {
  throw new Error('not implemented');
}

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
 * Attach a cost forecast to an existing usage record produced by
 * `llm-cost-attribution`, returning an enriched record that includes both
 * actual and forecasted cost.
 *
 * @param {object} usageRecord  A usage record from `llm-cost-attribution`.
 * @param {number} estimate     Story-point estimate for the issue.
 * @param {object} [options]
 * @returns {object}
 */
export function enrichUsageWithEstimate(usageRecord, estimate, options = {}) {
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
