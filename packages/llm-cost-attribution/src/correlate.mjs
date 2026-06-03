/**
 * Correlate per-issue cost with feature vectors.
 *
 * Planned implementation: GRV-14 (correlate core).
 */

/**
 * Compute correlations between cost metrics and feature dimensions for a set
 * of usage records.
 *
 * @param {Iterable<object> | AsyncIterable<object>} usageSource
 *   Usage records (as produced by `readUsageRecords` or `rollupUsageRecords`).
 * @param {object} [options]
 * @param {string[]} [options.features]
 *   Feature dimension names to correlate against (e.g. `['size', 'model']`).
 *   Defaults to all numeric columns in the records.
 * @returns {Promise<object>}
 *   Correlation result map keyed by feature name.
 */
export async function correlateCostWithFeature(usageSource, options = {}) {
  void usageSource;
  void options;
  throw new Error('not implemented');
}
