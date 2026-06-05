# llm-cost-estimation

Forecast LLM cost for a future issue from historical usage telemetry and issue-size estimates.

`llm-cost-estimation` is the pre-work sibling to [`llm-cost-attribution`](../llm-cost-attribution).
Attribution reports what was spent after work completes.
This package forecasts what is likely to be spent before work starts.

## What it does

It looks at what past issues of a given size *actually* cost and forecasts the same for a new one. Concretely:

- Reads **usage records** — one row of cost data per agent **turn** (a turn is one agent request → response) — that follow the [Symphony Cost Telemetry Extension](../specs/symphony-cost-telemetry-extension/SPEC.md).
- Groups that history into **cells**: buckets of past issues that share the same size and model, written `{ size, model }`. A forecast for an `L` issue on `claude-sonnet-4-6` is read off the `{ L, claude-sonnet-4-6 }` cell.
- Forecasts a **range**, not a single number: the **P50** (median — half of the cell's past issues cost at or below it) and the **P80** (80th percentile — 4 out of 5 did), for **tokens**, **turns**, **dollars**, and Codex **quota** (the fraction of your plan's rate-limit window the issue is predicted to use).
- Always reports **`n`** — how many past issues the forecast is based on — and flags a cell **low-confidence** when `n` is small. A forecast from 3 issues is barely a forecast.

It only *reads* telemetry and prints a forecast; it never modifies your usage records.

## How good are the forecasts?

Be skeptical: a forecast is only as trustworthy as the history behind its `{ size, model }` cell, and in practice that history is thin — especially early on.

- **Most records carry no estimate.** Cost telemetry captures what an issue *spent*, but not its size; story-point estimates live in your tracker. Until they're joined onto the telemetry (`enrichUsageWithEstimate`) or stamped on when the work is dispatched, records have no `estimate` and can't be placed in any cell. A large telemetry file can still yield only a handful of usable issues.
- **Splitting by size *and* model fragments** what little estimate-tagged history you have across many small cells.

So expect small `n` and wide P50→P80 bands. **Treat the output as directional, not a budget** — useful for comparing relative cost between sizes or catching order-of-magnitude surprises, not for billing. Always read the printed `n` and `lowConfidence`; a single-digit `n` is a hint, not a number to plan against. The only thing that improves accuracy is more completed issues carrying estimates — no statistical trick manufactures signal the data doesn't have.

## Install

```bash
# One-shot via npx
npx llm-cost-estimate --size L --model claude-sonnet-4-6 --from-usage ./usage.jsonl

# Install globally
npm install -g llm-cost-estimation
llm-cost-estimate --size M --model gpt-5-codex --from-usage ./usage.jsonl
```

## CLI

```bash
llm-cost-estimate --size <SIZE> --model <MODEL> [--from-usage <usage.jsonl-or-dir>] [--json]
llm-cost-estimate --issue <ID> --model <MODEL> [--from-usage <usage.jsonl-or-dir>] [--json]
llm-cost-estimate --help
```

- `--size` takes the issue's size directly — a **story point** (the number, like 1/2/3/5/8, your tracker assigns to rate an issue's effort) or a **T-shirt size** (S/M/L/XL) — so it needs no tracker access.
- `--issue` resolves the estimate from your tracker through `createLinearEstimateSource` (requires `LINEAR_API_TOKEN`).
- `--from-usage` accepts a `usage.jsonl` file or a directory of `usage*.jsonl` files (same convention used by attribution backfill).
- `--json` prints machine-readable JSON.

### Example

```bash
llm-cost-estimate --size L --model claude-sonnet-4-6 --from-usage ./usage.jsonl
```

```text
════════════════════════════════════════════════════════════════════════════════
COST FORECAST  —  size L, model claude-sonnet-4-6
════════════════════════════════════════════════════════════════════════════════
Sample size:         n = 18   (low confidence)

Metric             P50           P80          n
────────────────────────────────────────────────────────────────────────
tokens             1.2M          1.8M         18
turns              42            58           18
dollars            $0.74         $1.01        18
quota (frac)       61.0%         68.5%        18
```

**Dollars** here are *API-equivalent* — what those tokens would cost at pay-as-you-go API rates, not what a subscription plan is billed (the same convention `llm-cost-attribution` uses); on a subscription, the **quota** row is the one that reflects real marginal cost. `n = 18 (low confidence)` means only 18 past issues fell in this cell — read the range loosely.

JSON output:

```bash
llm-cost-estimate --size 3 --model claude-sonnet-4-6 --from-usage ./usage.jsonl --json
```

```json
{
  "size": "3",
  "model": "claude-sonnet-4-6",
  "n": 18,
  "tokens": { "n": 18, "p50": 1215000, "p80": 1760000 },
  "turns": { "n": 18, "p50": 42, "p80": 58 },
  "dollars": { "n": 18, "p50": 0.74, "p80": 1.01 },
  "quota": { "n": 18, "p50": 0.61, "p80": 0.685 },
  "quotaReason": null,
  "lowConfidence": true,
  "empty": false
}
```

## Library API

```js
import {
  forecastIssueCost,
  forecastProjectCost,
  calibrateCoverage,
  enrichUsageWithEstimate,
  createLinearEstimateSource,
} from 'llm-cost-estimation';
```

### `forecastIssueCost(cell, records)`

Re-exported from [`llm-cost-attribution`](../llm-cost-attribution) for package consistency.

- `cell` is `{ size, model }`.
- `records` are estimate-tagged usage records (`{ estimate, model, ...tokens... }`).
- Returns a forecast object with P50/P80 + `n` for tokens, turns, dollars, and quota.

### `enrichUsageWithEstimate(records, source, options?)`

Core transform for adding estimates to usage telemetry.

- Requires `source` implementing `resolveEstimates(issueIdentifiers): Map|string->number|null`.
- Adds `estimate` only when the source returns a valid non-negative integer.
- Returns `{ records, unresolved, stats }`.
- Issues with no estimate are left untouched and listed in `unresolved`.

### `forecastProjectCost(issues, usageSource?, options?)`

Forecast a whole project's cost by Monte Carlo convolution over its planned
issues. Re-exported from [`llm-cost-attribution`](../llm-cost-attribution).

- `issues` is an array of `{ size, model }` plans — one per planned issue, the
  same cell model `forecastIssueCost` reads.
- `usageSource` is estimate-tagged usage records (the project's history).
- `options` accepts `{ iterations, seed, minSampleSize, pricingTable }`.
- Returns tokens / turns / (priced) dollars channels — each with P50, P80,
  `mean`, `variance` — plus `iterations`, `seed`, `issues`, `lowConfidence`, and
  `empty`.

Summing per-issue P80s over-estimates a project total because tail risks partly
diversify; the convolution corrects for that. Project-level **quota** is not
forecast — quota is a per-issue windowed quantity that doesn't sum.

### `calibrateCoverage(records, options?)`

Backtest the forecaster: on held-out issues, does the actual cost really land at
or below the predicted P80 about 80% of the time? Re-exported from
[`llm-cost-attribution`](../llm-cost-attribution).

- `records` are estimate-tagged usage records.
- `options` accepts `{ seed, holdoutFraction, quantile, deviationThreshold, minHoldout, minTrain }`.
- Returns a per-cell and overall coverage report; cells whose coverage drifts
  from the target band beyond `deviationThreshold` are flagged.

### `calibrate` — deprecated

`calibrate` was a never-implemented placeholder. It now throws an error naming
its replacement, `calibrateCoverage` (above). Do not use it.

### Use cases and extension ports

The package is structured around named application-layer use cases — each one with declared ports you can inject (a custom estimate source, a custom usage source, an alternate pricing or quota model). The estimation core stays key-free and tracker-agnostic; only the ports talk to Linear, your filesystem, or your pricing service. The full per-use-case contract lives in [`docs/use-cases.md`](docs/use-cases.md).

| Use case | What it does for callers | Extension ports |
|---|---|---|
| `EnrichUsageWithEstimate` | Stamp the spec's optional `estimate` field onto estimate-free usage records by joining each record's issue to its story-point estimate. Pure transform — no Linear SDK in the core. | `LinearEstimateSource` (`resolveEstimates(ids)` → `Map<id, number\|null>`) |
| `ForecastIssueCost` | Forecast tokens / turns / dollars / Codex quota P50–P80 for a `{ size, model }` cell from estimate-tagged usage records. Re-exported from [`llm-cost-attribution`](../llm-cost-attribution). | `EstimateTaggedUsageSource`, `PricingTable`, `QuotaModel` |
| `ForecastProjectCost` | Forecast a project total by Monte Carlo convolution over per-issue cells, so summed quantiles don't over-state tail risk. Re-exported from [`llm-cost-attribution`](../llm-cost-attribution). | `EstimateTaggedUsageSource`, `PricingTable` |
| `CalibrateCoverage` | Backtest the forecaster: on held-out issues, does actual cost really land at or below the predicted P80? Re-exported from [`llm-cost-attribution`](../llm-cost-attribution). | `EstimateTaggedUsageSource` |

### Inject a custom estimate source

`enrichUsageWithEstimate` depends only on the `LinearEstimateSource` port — not the bundled GraphQL adapter — so any implementation of `resolveEstimates(ids)` slots in. That makes tests, alternate trackers, and in-memory fixtures trivial without an `LINEAR_API_TOKEN`.

```js
import { enrichUsageWithEstimate } from 'llm-cost-estimation';

// A synthetic, fully in-memory estimate source — no network, no API key.
function inMemoryEstimateSource(estimatesById) {
  return {
    async resolveEstimates(ids) {
      const out = new Map();
      for (const id of ids) {
        out.set(id, Object.hasOwn(estimatesById, id) ? estimatesById[id] : null);
      }
      return out;
    },
  };
}

const records = [
  { schemaVersion: 1, issueIdentifier: 'EPAC-1999', provider: 'claude',
    model: 'claude-sonnet-4-6', /* … other spec §5.1 fields … */ },
  { schemaVersion: 1, issueIdentifier: 'EPAC-2000', provider: 'claude',
    model: 'claude-sonnet-4-6', /* … */ },
];

const source = inMemoryEstimateSource({ 'EPAC-1999': 4, 'EPAC-2000': null });

const { records: enriched, unresolved, stats } = await enrichUsageWithEstimate(records, source);
// enriched[0].estimate === 4
// estimate stays absent (never 0) on the unresolved record
// unresolved === ['EPAC-2000']
```

For the production path, `createLinearEstimateSource()` returns the same port shape backed by the Linear GraphQL API. It also accepts an injected `fetch` so contract tests can swap it out without touching the network.

### Inject a custom usage source

`forecastIssueCost`, `forecastProjectCost`, and `calibrateCoverage` are re-exported from `llm-cost-attribution`, so they all accept the same usage-source port: any iterable, async iterable, or object exposing `records()`/`iterate()`. That lets a forecast read from an in-memory array, a database stream, or a synthetic generator — no `usage.jsonl` on disk required.

```js
import { forecastIssueCost } from 'llm-cost-estimation';
import { syntheticUsageRecords } from 'llm-cost-attribution';

// 50 estimate-tagged records with a known log-normal distribution.
const records = syntheticUsageRecords({
  p50: 1_000_000, p80: 1_800_000,
  n: 50, seed: 1,
  size: 'L', model: 'claude-sonnet-4-6',
});

const forecast = await forecastIssueCost(
  { size: 'L', model: 'claude-sonnet-4-6' },
  records,
);
```

The same source object can be enriched first and forecast second, with no filesystem in between:

```js
const { records: enriched } = await enrichUsageWithEstimate(rawRecords, source);
await forecastIssueCost({ size: 'L', model: 'claude-sonnet-4-6' }, enriched);
```

### Inject a custom pricing or quota model

The `PricingTable` and `QuotaModel` ports come from `llm-cost-attribution`'s forecaster; pass them through `forecastIssueCost`'s options for an alternate provider or a flat-rate analysis:

```js
import { forecastIssueCost } from 'llm-cost-estimation';

// `buckets` is the spec §5.2.3 TokenBuckets shape; sum them and apply a flat rate.
const flatRatePricing = {
  priceFor(_model, buckets) {
    const total =
      buckets.inputUncached + buckets.inputCached +
      buckets.cacheCreate5m + buckets.cacheCreate1h +
      buckets.outputVisible + buckets.outputReasoning;
    return total * 0.000_002;
  },
};

await forecastIssueCost(
  { size: 'L', model: 'flat-rate-1' },
  enriched,
  { pricingTable: flatRatePricing },
);
```

`forecastProjectCost` reads the same `PricingTable` through its `options.pricingTable`.

### Ready vs. planned APIs

| Status | Surface |
|---|---|
| Ready | `enrichUsageWithEstimate`, `isValidEstimate`, `createLinearEstimateSource`, `forecastIssueCost` (re-export), `forecastProjectCost` (re-export), `calibrateCoverage` (re-export) |
| Deprecated | `calibrate` — never implemented; throws naming `calibrateCoverage` as its replacement. Not imported in any of the ready examples above. |

The package has no planned-but-unimplemented public surface today; every export listed as Ready is wired through and tested.

## What it doesn't do

- It does **not** infer estimates from issue titles, paths, or code signals.
  Add estimates in your tracker, then use `enrichUsageWithEstimate` to stamp them onto telemetry.
- It does **not** predict project-wide quota or wall-clock time.
- It does **not** promise accuracy from very thin cells.
  A real forecast needs sufficient historical coverage in the exact `{ size, model }` cell;
  low coverage is surfaced via `lowConfidence` and `n`.
- It does **not** merge multiple runs of the same issue for delivery quality.

The **quota** forecast is per-issue only — the peak fraction of Codex's primary rate-limit window a single issue is expected to hit. It does not add up across issues into a project-level quota.

## License

MIT
