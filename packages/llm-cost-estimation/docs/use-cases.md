# Use-Case Catalog

This catalog enumerates every application-layer use case in `llm-cost-estimation`.
Each entry names the behavior, its entities/value objects, ports, adapters, and the
inward boundary rule it enforces.

**Convention:** every PR that adds or changes a use case updates this catalog in the
same PR.

---

## Package-Level Dependency Rule

The stats and forecaster core depends only on the `EstimateTaggedUsageSource` and
`LinearEstimateSource` ports. No Linear SDK, HTTP client, or filesystem import may
cross inward into the domain/application layer.

The forecast and calibration use cases below are re-exported from
`llm-cost-attribution`, which owns the empirical-quantile forecaster, the project
forecaster, and the coverage backtester. The estimation package surfaces them
through its public barrel so callers import one package; it does not re-implement
the math.

---

## EnrichUsageWithEstimate

| Field | Value |
|---|---|
| **Goal** | Stamp the Symphony Cost Telemetry Extension's optional `estimate` field onto cost-only usage records by joining each record's issue identifier to its Linear story-point estimate. |
| **Inputs** | `records: UsageRecord[]` (from `llm-cost-attribution`); a `LinearEstimateSource` implementation. |
| **Outputs** | `EnrichResult` — `enriched: UsageRecord[]` (each stamped with `estimate` where resolved) and `unresolved: string[]` (identifiers with no estimate or no longer resolvable). |
| **Entities / values** | `UsageRecord` (spec §5) — `issueIdentifier`, `sessionId`, `provider`, token counts; optional `estimate: number` (spec §5.2, non-negative integer — absent, never `0`, when unresolved). |
| **Ports** | `LinearEstimateSource` — `resolveEstimates(identifiers: string[]) → Map<string, number \| null>` (or a Promise thereof). De-duplication happens before the port is called: at most one lookup per distinct identifier. |
| **Primary adapters** | `LinearGraphQLEstimateSource` (`src/linear-estimate-source.mjs`) — resolves estimates via the Linear GraphQL API; reads the token from an injected option or `LINEAR_API_TOKEN`; never hardcodes or logs it. |
| **Linear issue** | GRV-2 |

**Boundary rule:** `enrich.mjs` imports no Linear client, HTTP library, or filesystem
module. Only the injected `LinearEstimateSource` port travels inward, keeping the
core key-free and tracker-agnostic.

**Idempotency:** Calling with the same records and the same source produces identical
output. Records whose issue has no estimate are returned untouched with `estimate`
absent.

---

## ForecastIssueCost

| Field | Value |
|---|---|
| **Goal** | Forecast the expected LLM cost for a single issue before work begins, from the historical cost of completed issues that share its `{ size, model }` cell. |
| **Inputs** | `cell: { size, model }`; `records` — estimate-tagged usage records (the cell's history), the same source shape the attribution forecaster accepts. |
| **Outputs** | `IssueCostForecast` — `tokens`, `turns`, and `dollars` channels each with P50/P80 and `n`; an optional Codex `quota`-fraction P50/P80 (single-issue only, never aggregated to a project) with `quotaReason`; plus `lowConfidence` and `empty` markers. |
| **Entities / values** | `Cell` / `FeatureRecord` (`{ size, model }`); `IssueCostForecast`. |
| **Ports** | `EstimateTaggedUsageSource` supplies the records; `PricingTable` (`priceFor(model, buckets)`) prices the dollars channel; `QuotaModel` (`quotaFractionFor(record)`) reads the Codex quota fraction. All three are injected — the forecaster imports none of their implementations. |
| **Primary adapters** | `usage.jsonl` reader (`EstimateTaggedUsageSource`), synthetic record source in tests, `pricing.mjs` (`PricingTable`), `quota.mjs` (`QuotaModel`) — all in `llm-cost-attribution`. |
| **Linear issues** | GRV-3, GRV-5 |
| **Current implementation** | Re-exported from `llm-cost-attribution` (`packages/llm-cost-attribution/src/forecast.mjs`). |

**Boundary rule:** The empirical quantile forecaster is a pure function over the
records and its injected ports. No Linear SDK, HTTP, or filesystem call occurs during
`forecastIssueCost`.

---

## ForecastProjectCost

| Field | Value |
|---|---|
| **Goal** | Forecast an entire project's aggregate cost by Monte Carlo convolution over its planned issues, so summed quantiles don't over-estimate the total (per-issue tail risks partly diversify). |
| **Inputs** | `issues: { size, model }[]` (one IssuePlan per planned issue); `usageSource` — estimate-tagged usage records; `options: { iterations, seed, minSampleSize, pricingTable }`. |
| **Outputs** | `ProjectCostForecast` — `tokens`, `turns`, and (when priced) `dollars` channels, each with P50/P80, `mean`, and `variance`; plus `iterations`, `seed`, `issues`, `lowConfidence`, and `empty`. |
| **Entities / values** | `IssuePlan` (`{ size, model }`); `ProjectCostForecast`; `ProjectChannelForecast`. |
| **Ports** | The per-issue forecaster's empirical cell sampler (`collectCellSamples`); the shared `PricingTable` (`priceFor(model, buckets)`); a seeded RNG. The call reads records through the sampler, not directly. |
| **Primary adapters** | Seeded RNG (mulberry32, in-module); `pricing.mjs` (`PricingTable`) — both in `llm-cost-attribution`. |
| **Linear issue** | GRV-6 |
| **Current implementation** | Re-exported from `llm-cost-attribution` (`packages/llm-cost-attribution/src/project-forecast.mjs`). |

**Scope:** tokens, turns, and dollars only. Project-level quota and wall-clock are
excluded by construction — they are windowed / scheduling quantities that do not sum
across issues.

**Boundary rule:** The Monte Carlo convolution is pure. No Linear SDK, HTTP, or
filesystem call occurs during `forecastProjectCost`.

---

## CalibrateCoverage

| Field | Value |
|---|---|
| **Goal** | Backtest the forecaster: hold out a deterministic fraction of each cell's issues, fit on the rest, and measure how often held-out actuals land at or below the predicted P80 — so a "P80" only keeps the name if it covers ~80% of held-out cost. |
| **Inputs** | `records` — estimate-tagged usage records; `options: { seed, holdoutFraction, quantile, deviationThreshold, minHoldout, minTrain }`. |
| **Outputs** | `CalibrationReport` — per-cell and overall coverage, with cells whose coverage drifts from the target band beyond `deviationThreshold` flagged. |
| **Entities / values** | `CalibrationReport`; `CalibrationCellReport`. |
| **Ports** | None beyond the per-issue forecaster it fits with (`forecastIssueCost`). Pure and I/O-free; callers stream records in. |
| **Primary adapters** | Seeded held-out split (mulberry32, in-module) — in `llm-cost-attribution`. |
| **Linear issue** | GRV-3 |
| **Current implementation** | Re-exported as `calibrateCoverage` from `llm-cost-attribution` (`packages/llm-cost-attribution/src/calibrate.mjs`). |

**Boundary rule:** The backtest is a pure function over the supplied records. No Linear
SDK, HTTP, or filesystem call occurs during `calibrateCoverage`.

---

## calibrate (deprecated)

The barrel exports a bare `calibrate` name only as a deprecated compatibility shim.
It was never implemented; calling it throws an error naming its replacement,
`calibrateCoverage` (above). It is omitted from the README's ready-to-use import
example and carries no supported behavior.
