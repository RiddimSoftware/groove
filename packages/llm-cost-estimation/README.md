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
  calibrate,
} from 'llm-cost-estimation';
```

Each export currently throws `Error('not implemented')` — see the project issues for the implementation roadmap.

## CLI

```
llm-cost-estimate --help
```

## License

MIT
