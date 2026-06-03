/**
 * Correlate a numeric feature series with a numeric cost series over already
 * joined `{ feature, cost }` pairs.
 *
 * Cost data is monotonic-but-heavy-tailed: linear Pearson on raw values is
 * easily dominated by a few outlier issues, while Spearman captures rank
 * monotonicity that the linear view misses. This module therefore reports
 * **both** rank and linear correlation (and a log-log Pearson view, which is
 * the right linear view when both axes span orders of magnitude), so the
 * caller can judge the relationship without being fooled by axis choice.
 *
 * Key-free and pure: it never reads git, Linear, the filesystem, or the
 * network. Joining cost to features (e.g. diff size → tokens) belongs in
 * `joinCostWithFeature`; this module only consumes the joined pairs.
 *
 * @typedef {{ feature: number, cost: number }} FeatureCostPair
 *
 * @typedef {{
 *   n: number,
 *   featureRange: { min: number, max: number },
 *   medianCost: number,
 * }} DecileBucket
 *
 * @typedef {{
 *   n: number,
 *   spearman: number | null,
 *   pearsonLinear: number | null,
 *   pearsonLogLog: number | null,
 *   pearsonLogLogDropped: number,
 *   deciles: DecileBucket[],
 * }} CorrelationResult
 */

/**
 * Compute Spearman, linear Pearson, log-log Pearson, and per-decile cost
 * summaries over `{ feature, cost }` pairs.
 *
 * @param {Iterable<FeatureCostPair>} pairs
 * @returns {CorrelationResult}
 */
export function correlateCostWithFeature(pairs) {
  const cleaned = [];
  for (const pair of pairs ?? []) {
    if (pair === null || typeof pair !== 'object') continue;
    const feature = pair.feature;
    const cost = pair.cost;
    if (typeof feature !== 'number' || !Number.isFinite(feature)) continue;
    if (typeof cost !== 'number' || !Number.isFinite(cost)) continue;
    cleaned.push({ feature, cost });
  }

  const n = cleaned.length;

  if (n < 2) {
    return {
      n,
      spearman: null,
      pearsonLinear: null,
      pearsonLogLog: null,
      pearsonLogLogDropped: 0,
      deciles: [],
    };
  }

  const featureRanks = averageRanks(cleaned.map((p) => p.feature));
  const costRanks = averageRanks(cleaned.map((p) => p.cost));
  const spearman = pearson(featureRanks, costRanks);

  const features = cleaned.map((p) => p.feature);
  const costs = cleaned.map((p) => p.cost);
  const pearsonLinear = pearson(features, costs);

  let pearsonLogLog = null;
  let pearsonLogLogDropped = 0;
  const logFeatures = [];
  const logCosts = [];
  for (const { feature, cost } of cleaned) {
    if (feature > 0 && cost > 0) {
      logFeatures.push(Math.log10(feature));
      logCosts.push(Math.log10(cost));
    } else {
      pearsonLogLogDropped += 1;
    }
  }
  if (logFeatures.length >= 2) {
    pearsonLogLog = pearson(logFeatures, logCosts);
  }

  const deciles = buildDeciles(cleaned);

  return {
    n,
    spearman,
    pearsonLinear,
    pearsonLogLog,
    pearsonLogLogDropped,
    deciles,
  };
}

/**
 * Average-rank tie handling: tied values receive the mean of the ranks they
 * would occupy if broken arbitrarily. Ranks start at 1.
 *
 * @param {number[]} values
 * @returns {number[]}  Ranks in the original input order.
 */
function averageRanks(values) {
  const indexed = values.map((value, index) => ({ value, index }));
  indexed.sort((a, b) => a.value - b.value);

  const ranks = new Array(values.length);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j + 1 < indexed.length && indexed[j + 1].value === indexed[i].value) j += 1;
    const averageRank = (i + j + 2) / 2;
    for (let k = i; k <= j; k += 1) ranks[indexed[k].index] = averageRank;
    i = j + 1;
  }
  return ranks;
}

/**
 * Pearson correlation coefficient. Returns `null` when either series has zero
 * variance (constant series), since the coefficient is undefined.
 *
 * @param {number[]} xs
 * @param {number[]} ys
 * @returns {number | null}
 */
function pearson(xs, ys) {
  const n = xs.length;
  if (n < 2) return null;

  let meanX = 0;
  let meanY = 0;
  for (let i = 0; i < n; i += 1) {
    meanX += xs[i];
    meanY += ys[i];
  }
  meanX /= n;
  meanY /= n;

  let cov = 0;
  let varX = 0;
  let varY = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    cov += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }

  if (varX === 0 || varY === 0) return null;
  return cov / Math.sqrt(varX * varY);
}

/**
 * Split the pairs into 10 buckets ordered by feature, each with `n`, the
 * feature range it covers, and the median cost inside it. Pairs are
 * distributed by sorted position so bucket sizes differ by at most one.
 *
 * @param {FeatureCostPair[]} cleaned
 * @returns {DecileBucket[]}
 */
function buildDeciles(cleaned) {
  if (cleaned.length === 0) return [];

  const sorted = [...cleaned].sort((a, b) => a.feature - b.feature);
  const total = sorted.length;
  const buckets = [];
  for (let bucketIndex = 0; bucketIndex < 10; bucketIndex += 1) {
    const start = Math.floor((bucketIndex * total) / 10);
    const end = Math.floor(((bucketIndex + 1) * total) / 10);
    if (end <= start) continue;
    const slice = sorted.slice(start, end);
    buckets.push({
      n: slice.length,
      featureRange: {
        min: slice[0].feature,
        max: slice[slice.length - 1].feature,
      },
      medianCost: median(slice.map((p) => p.cost)),
    });
  }
  return buckets;
}

/**
 * Sorted-sample median. Uses the average of the two middle values for an
 * even-sized sample.
 *
 * @param {number[]} values
 * @returns {number}
 */
function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}
