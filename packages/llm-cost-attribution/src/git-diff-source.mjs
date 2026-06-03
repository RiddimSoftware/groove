/**
 * Git-diff data source for cost-driver feature extraction.
 *
 * Planned implementation: GRV-15 (local-git diff source).
 */

/**
 * Read git diff statistics for the commits associated with a set of issue
 * identifiers, yielding feature records suitable for `joinCostWithFeature`.
 *
 * @param {string | string[]} issueIdentifiers
 *   One or more issue identifiers (e.g. `'GRV-13'` or `['GRV-13', 'GRV-14']`).
 * @param {object} [options]
 * @param {string} [options.repoPath]
 *   Absolute path to the git repository root. Defaults to `process.cwd()`.
 * @param {string} [options.refPattern]
 *   Glob pattern used to locate issue branches (e.g. `'symphony/*'`).
 * @returns {AsyncGenerator<object>}
 *   Async generator yielding one diff-feature record per commit range found.
 */
export async function* readGitDiffs(issueIdentifiers, options = {}) {
  void issueIdentifiers;
  void options;
  throw new Error('not implemented');
}
