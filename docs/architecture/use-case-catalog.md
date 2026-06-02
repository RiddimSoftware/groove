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
