# llm-cost-estimation

> Forecast LLM cost from Linear issue story-point estimates before work begins.

**Status: in progress** — `enrichUsageWithEstimate` and `forecastIssueCost`
(single-issue) ship today; `forecastProjectCost` and `calibrate` are still
stubs that throw `Error('not implemented')`.

This package is a sibling of [`llm-cost-attribution`](../llm-cost-attribution), which measures actual cost after work completes. `llm-cost-estimation` forecasts cost *before* work starts, using historical calibration data and story-point estimates.

## Architecture

See [docs/use-cases.md](docs/use-cases.md) for the use-case catalog — ports, adapters, and boundary rules for each behavior.

## API

```js
import {
  forecastIssueCost,
  forecastProjectCost,
  enrichUsageWithEstimate,
  createLinearEstimateSource,
  calibrate,
} from 'llm-cost-estimation';
```

`forecastIssueCost({ size, model }, records)` (re-exported from
[`llm-cost-attribution`](../llm-cost-attribution)) returns P50/P80 + n for
tokens, turns, dollars, and (for Codex cells with rate_limits samples) the
per-issue peak primary-window quota fraction. Records are matched on `size`
and `model`; `size` falls back to the spec's optional `estimate` field for
forward compatibility.

`forecastProjectCost` and `calibrate` are still stubs.

## Enriching usage with estimates

`enrichUsageWithEstimate` joins each cost-only `usage.jsonl` record to its
issue's Linear story-point estimate and stamps the spec's optional `estimate`
field onto it, so the forecaster can group cost by estimate.

```js
import { enrichUsageWithEstimate, createLinearEstimateSource } from 'llm-cost-estimation';

const source = createLinearEstimateSource(); // reads LINEAR_API_TOKEN
const { records, unresolved, stats } = await enrichUsageWithEstimate(usageRecords, source);
```

The enrichment core is a pure transform that depends only on a
`LinearEstimateSource` port (`{ resolveEstimates(ids) }`) — it imports no Linear
client, keeping the estimation core key-free and tracker-agnostic. Distinct
issue IDs are de-duplicated before the source is queried (≤1 lookup per issue).
Issues with no estimate or that no longer resolve are left **absent** (never
`0`, which is a real estimate) and reported in `unresolved`. `createLinearEstimateSource`
is the production adapter; tests inject a fake source and make no network calls.

## CLI

```
# Forecast at a fixed size — no Linear token required.
llm-cost-estimate --size L --model claude-sonnet-4-6 --from-usage ~/usage.jsonl

# Resolve an issue's size via Linear (requires LINEAR_API_TOKEN) and forecast
# at that size.
llm-cost-estimate --issue GRV-123 --model claude-sonnet-4-6 --from-usage ~/usage.jsonl

# Machine-readable output.
llm-cost-estimate --size L --model claude-sonnet-4-6 --from-usage ~/usage.jsonl --json

llm-cost-estimate --help
```

The CLI reads estimate-tagged usage records (Symphony Cost Telemetry
Extension spec §5; see `enrichUsageWithEstimate` to stamp `estimate` onto
records produced by `llm-cost-attribution`'s backfill) and prints
P50/P80 + n for tokens, turns, dollars, and the Codex primary-window quota
fraction (single-issue only — never summed across issues).

## License

MIT
