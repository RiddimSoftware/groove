# Use Case Catalog

### ForecastIssueCost
Actor: Operator
Goal: Forecast token, turn, $ API-equivalent, and Codex quota cost for one issue from historical issues with the same size and model.
Inputs: FeatureRecord `{ size, model, ... }`, estimate-tagged usage records.
Outputs: CostForecast for tokens, turns, and dollars with P50, P80, `n`, plus an optional Codex quota-fraction P50/P80 (single-issue only — never aggregated to project), low-confidence, and empty-cell markers.
Entities / values: FeatureRecord, CostForecast, Cell.
Ports: EstimateTaggedUsageSource, PricingTable, QuotaModel.
Primary adapters: `usage.jsonl` reader, synthetic record source in tests, `pricing.mjs` (PricingTable), `quota.mjs` (QuotaModel).
Current implementation: `packages/llm-cost-attribution/src/forecast.mjs`

### ForecastProjectCost
Actor: Operator
Goal: Forecast a whole project's cost by Monte Carlo convolution over its planned issues, so summed quantiles don't over-estimate (tail risks partly diversify).
Inputs: a list of IssuePlan `{ size, model }` (one per planned issue), estimate-tagged usage records, and options `{ iterations, seed, minSampleSize, pricingTable }`.
Outputs: ProjectForecast with tokens, turns, and (when priced) dollars channels — each carrying P50, P80, mean, variance — plus `iterations`, `seed`, low-confidence and empty markers.
Entities / values: IssuePlan, ProjectForecast, ProjectChannelForecast.
Ports: ForecastIssueCost's per-cell sampler (`collectCellSamples`); the shared `PricingTable` port (`priceFor(model, buckets)`); seeded RNG.
Primary adapters: seeded RNG (mulberry32, in-module); `pricing.mjs` (PricingTable).
Notes: tokens, turns, and dollars only — quota and wall-clock are excluded because they are windowed / scheduling quantities that don't sum. v0 assumes inter-issue independence (a documented simplification: correlated issues diversify less).
Current implementation: `packages/llm-cost-attribution/src/project-forecast.mjs`

### ReadGitDiffs
Actor: Operator
Goal: Read per-issue code-change sizes from local git history so cost can later be correlated with diff size without GitHub access.
Inputs: local repository path, optional rev range, optional issue-key pattern.
Outputs: DiffRecord `{ key, additions, deletions, changedFiles, shas }` plus unmatched/error summary.
Entities / values: DiffRecord.
Ports: DiffSource.
Primary adapters: LocalGitDiffSource (`git log --numstat` via local `git`).
Notes: adapter-only; it sees only locally-pulled history and depends on issue keys in commit subjects.
Current implementation: `packages/llm-cost-attribution/src/git-diff-source.mjs`

### CorrelateCostWithFeature
Actor: Operator
Goal: Given joined `{ feature, cost }` pairs, judge how strongly a feature (e.g. diff size, file count) predicts cost — reporting both rank and linear views so heavy-tailed cost data isn't misread under a single lens.
Inputs: an iterable of FeatureCostPair `{ feature: number, cost: number }` (already joined upstream by JoinCostWithFeature — this module does not join).
Outputs: CorrelationResult `{ n, spearman, pearsonLinear, pearsonLogLog, pearsonLogLogDropped, deciles }`. Spearman uses average-rank tie handling; log-log filters non-positive values and reports the dropped count. `deciles` is up to 10 buckets ordered by feature, each `{ n, featureRange, medianCost }`. Empty input, `n < 2`, and zero-variance series return explicit `null`s, never `NaN`.
Entities / values: FeatureCostPair, CorrelationResult, DecileBucket.
Ports: none — pure function over in-memory pairs.
Primary adapters: none. Joining (DiffSource → FeatureCostPair) lives in JoinCostWithFeature.
Current implementation: `packages/llm-cost-attribution/src/correlate.mjs`
