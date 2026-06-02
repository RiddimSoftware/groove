/**
 * Nearest-rank empirical quantile over observed sample values.
 *
 * This treats the sorted sample as an empirical distribution and returns the
 * first observed value whose cumulative probability is at least `p`.
 *
 * @param {Iterable<number>} values
 * @param {number} p
 * @returns {number | null}
 */
export function empiricalQuantile(values, p) {
  if (typeof p !== 'number' || !Number.isFinite(p) || p < 0 || p > 1) {
    throw new TypeError('empiricalQuantile: p must be a number in [0, 1]');
  }

  const sorted = [];
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) sorted.push(value);
  }
  sorted.sort((a, b) => a - b);

  if (sorted.length === 0) return null;
  if (p === 0) return sorted[0];

  const index = Math.ceil(p * sorted.length) - 1;
  return sorted[Math.min(sorted.length - 1, Math.max(0, index))];
}

/**
 * @param {Iterable<number>} values
 * @returns {{ p50: number | null, p80: number | null }}
 */
export function empiricalP50P80(values) {
  const sample = [...values];
  return {
    p50: empiricalQuantile(sample, 0.5),
    p80: empiricalQuantile(sample, 0.8),
  };
}
