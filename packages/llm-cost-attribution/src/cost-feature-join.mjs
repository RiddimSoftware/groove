/**
 * Join cost rollups with feature vectors from an arbitrary source.
 *
 * Planned implementation: GRV-16 (join port).
 */

/**
 * Inner-join per-issue cost rollups with feature records on `issueIdentifier`,
 * producing enriched records that carry both cost metrics and feature
 * dimensions.
 *
 * @param {Iterable<object> | AsyncIterable<object>} costSource
 *   Cost rollup records, each with an `issueIdentifier` field.
 * @param {Iterable<object> | AsyncIterable<object>} featureSource
 *   Feature records, each with an `issueIdentifier` field.
 * @param {object} [options]
 * @param {string} [options.joinKey]
 *   Field name to join on. Defaults to `'issueIdentifier'`.
 * @returns {AsyncGenerator<object>}
 *   Async generator yielding one joined record per matched pair.
 */
export async function* joinCostWithFeature(costSource, featureSource, options = {}) {
  void costSource;
  void featureSource;
  void options;
  throw new Error('not implemented');
}
