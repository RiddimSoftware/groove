# Use Case Catalog

### ForecastIssueCost
Actor: Operator
Goal: Forecast token and turn cost for one issue from historical issues with the same size and model.
Inputs: FeatureRecord `{ size, model, ... }`, estimate-tagged usage records.
Outputs: CostForecast for tokens and turns with P50, P80, `n`, plus low-confidence and empty-cell markers.
Entities / values: FeatureRecord, CostForecast, Cell.
Ports: EstimateTaggedUsageSource.
Primary adapters: `usage.jsonl` reader, synthetic record source in tests.
Current implementation: `packages/llm-cost-attribution/src/forecast.mjs`
