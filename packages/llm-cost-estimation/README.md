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
  enrichUsageWithEstimate,
  calibrate,
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

### `forecastProjectCost(projectId, issues, options?)`

Public API placeholder for project rollups.
Throws `Error('not implemented')` until the next sequencing issue lands.

### `calibrate(completedIssues, options?)`

Public API placeholder for empirical calibration from completed work.
Throws `Error('not implemented')` until the next sequencing issue lands.

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
