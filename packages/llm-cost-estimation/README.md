# llm-cost-estimation

> Forecast LLM cost from Linear issue story-point estimates before work begins.

**Status: skeleton — implementation in progress.**

This package is a sibling of [`llm-cost-attribution`](../llm-cost-attribution), which measures actual cost after work completes. `llm-cost-estimation` forecasts cost *before* work starts, using historical calibration data and story-point estimates.

## Architecture

See [docs/use-cases.md](docs/use-cases.md) for the use-case catalog — ports, adapters, and boundary rules for each behavior.

## Planned API

```js
import {
  forecastIssueCost,
  forecastProjectCost,
  enrichUsageWithEstimate,
  createLinearEstimateSource,
  calibrate,
} from 'llm-cost-estimation';
```

`forecastIssueCost`, `forecastProjectCost`, and `calibrate` currently throw
`Error('not implemented')` — see the project issues for the implementation
roadmap.

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
llm-cost-estimate --help
```

## License

MIT
