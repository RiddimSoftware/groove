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
