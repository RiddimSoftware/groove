# llm-cost-estimation

Forecast LLM cost for a future issue from historical usage telemetry and issue-size estimates.

`llm-cost-estimation` is the pre-work sibling to [`llm-cost-attribution`](../llm-cost-attribution).
Attribution reports what was spent after work completes.
This package forecasts what is likely to be spent before work starts.

## What it does

- Parse usage records that follow the [Symphony Cost Telemetry Extension](../specs/symphony-cost-telemetry-extension/SPEC.md).
- Forecast P50/P80 token, turn, dollar, and quota (Codex primary-window fraction) ranges for one estimate/model cell (`{ size, model }`).
- Return forecast points with `n`, and mark low-confidence cells explicitly.

For now, this package does not mutate usage records; it consumes telemetry and outputs a forecast.

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

- `--size` takes a story-point or T-shirt size directly and is tracker-free.
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

Quota output is only the per-issue single-cell Codex peak-primary fraction from telemetry.
It is not additive across issues.

## License

MIT
