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
| **Goal** | Forecast the expected LLM cost for a single issue before work begins, given its story-point estimate and a calibration dataset built from completed issues with known actual cost. |
| **Inputs** | `estimate: number` (story-point estimate); `calibration: CalibrationDataset` (from `calibrate()`). |
| **Outputs** | `IssueCostForecast` — empirical quantile distribution of expected cost (p50, p80, p95) and dollar API-equivalent. |
| **Entities / values** | `CalibrationDataset` — cost samples grouped by story-point estimate; `IssueCostForecast` — quantile estimates. |
| **Ports** | `EstimateTaggedUsageSource` — supplies completed-issue records with `estimate` already stamped, used at calibration time (see `calibrate()`). The `forecastIssueCost` call itself takes no port — it runs over an already-built `CalibrationDataset` value. |
| **Primary adapters** | `UsageJsonlEstimateTaggedSource` (planned) — reads enriched `usage.jsonl` files produced by `EnrichUsageWithEstimate`. |
| **Linear issues** | GRV-3, GRV-5 |
| **Status** | Planned — stub throws `Error('not implemented')`. |

**Boundary rule:** The empirical quantile forecaster is a pure function over the
calibration dataset. No Linear SDK, HTTP, or filesystem call occurs during
`forecastIssueCost`.

---

## ForecastProjectCost

| Field | Value |
|---|---|
| **Goal** | Forecast the aggregate LLM cost for an entire project by Monte Carlo convolution over the per-issue cost distributions for each issue's estimate. |
| **Inputs** | `issues: { identifier: string, estimate: number }[]` (project issues with story-point estimates); `calibration: CalibrationDataset`. |
| **Outputs** | `ProjectCostForecast` — aggregate quantile distribution (p50, p80, p95) and dollar API-equivalent for the project total. |
| **Entities / values** | `CalibrationDataset`; `ProjectCostForecast` — aggregate quantile estimates. |
| **Ports** | `EstimateTaggedUsageSource` — used at calibration time only (see `calibrate()`). The `forecastProjectCost` call itself takes no port. |
| **Primary adapters** | `UsageJsonlEstimateTaggedSource` (planned) — same adapter as `ForecastIssueCost`. |
| **Linear issue** | GRV-6 |
| **Status** | Planned — stub throws `Error('not implemented')`. |

**Boundary rule:** The Monte Carlo convolution is pure. No Linear SDK, HTTP, or
filesystem call occurs during `forecastProjectCost`.

---

## calibrate (support function, not a use case)

Builds a `CalibrationDataset` from completed issues whose actual cost is known.
Used as a preparation step before calling the forecast functions.

**Input:** `completedIssues: { identifier: string, estimate: number, actualCostUsd: number }[]`
**Output:** `CalibrationDataset` — cost samples grouped by story-point estimate.
**Ports used:** None (pure transform over caller-supplied data; I/O for fetching the
source records is the caller's responsibility, typically via `EstimateTaggedUsageSource`).
**Linear issue:** GRV-3
**Status:** Planned — stub throws `Error('not implemented')`.
