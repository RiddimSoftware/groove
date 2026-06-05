# llm-cost-attribution

Per-issue cost analytics for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) and [Codex CLI](https://github.com/openai/codex) sessions — how many **tokens** an issue burned, how many **turns** it took (one agent request → response is a turn), and how much of your Codex/Claude plan's rate-limit **quota** it ate. It reads the CLIs' own session logs (JSONL = one JSON record per line) — **no telemetry pipeline, no database, no API keys**.

```bash
npx llm-cost-attribution EPAC-1940
```

```
LLM COST — EPAC-1940
Sessions: 5   Turns: 414   Tokens: 61,357,012

CODEX  (4 sessions)   Models: gpt-5-codex   Turns: 340
  input uncached      1,517,206
  cache read         51,024,768
  output (visible)       44,683
  output (reasoning)     18,649
  grand total        52,605,306
  Quota (pro, 345 samples):  5h 58%→64% (peak 64%)   7d 56%→57% (peak 57%)
```

Reading that block: **cache read** is tokens the provider served from its prompt cache (cheap, and usually most of the total); **output (reasoning)** is the model's hidden thinking tokens, billed separately from the **visible** answer; **Quota** is how much of your Codex plan's two rolling rate-limit windows — a 5-hour and a 7-day one — these sessions used.

Requires Node 20+. Zero runtime dependencies.

## How it works

Both CLIs persist every run as JSONL — Claude Code in `~/.claude/projects/<encoded-cwd>/<sessionId>.jsonl` (`<encoded-cwd>` is just the run's working directory with `/` and `.` rewritten to `-`), Codex in `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl` — and each file records, per turn, the provider-reported token counts (the same numbers your account is billed against) plus, for Codex, its rate-limit usage. This package walks both directories, keeps the sessions whose **working directory** matches the issue ID you ask for, and adds them up.

How does a session get matched to an issue? By its **working directory** (`cwd`). Under [Symphony](https://github.com/openai/symphony/blob/main/SPEC.md)'s spec — Symphony being an orchestrator that runs coding agents one issue at a time — each agent runs in a directory dedicated to its issue (`<workspace.root>/<ISSUE-ID>`), so the issue ID is already baked into every transcript's path; no custom pipeline needed. The default `--cwd-pattern` (the regex that pulls the issue ID out of that path) matches both the spec default (`<tmp>/symphony_workspaces/<ID>`) and the common in-repo layout (`<repo>/.symphony/workspaces/<ID>`). For any other layout, pass your own regex with one capture group around the ID:

```bash
llm-cost FOO-12 --cwd-pattern '-([A-Z]+-\d+)$'   # ../repo-worktrees/<ID>
llm-cost 1234   --cwd-pattern '/issues/(\d+)$'    # ~/issues/<id>/
```

If your workflow doesn't give each issue its own directory, this package can't disambiguate sessions — see "What it doesn't do."

## Install

```bash
npx llm-cost-attribution EPAC-1940     # one-shot
npm install -g llm-cost-attribution    # then: llm-cost EPAC-1940
```

## CLI

```
llm-cost <ISSUE-ID> [options]
llm-cost <ISSUE-ID> --from-usage <usage.jsonl-or-dir>
llm-cost list
llm-cost backfill --out <usage.jsonl-path>
llm-cost calibrate <usage.jsonl-or-dir> [--seed N] [--holdout F]
llm-cost --help

Options:
  --cwd-pattern <regex>  JS regex matching the cwd; one capture group = issue ID.
  --claude-dir <path>    Override ~/.claude/projects.
  --codex-dir <path>     Override ~/.codex/sessions.
  --from-usage <path>    Read a baked usage.jsonl file/dir instead of transcripts.
  --out <path>           (backfill) Destination usage.jsonl. Appended.
  --seed <int>           (calibrate) Held-out split seed. Default 1.
  --holdout <0..1>       (calibrate) Fraction held out per cell. Default 0.2.
  --quantile <0..1>      (calibrate) Band to test. Default 0.8.
  --threshold <0..1>     (calibrate) Flag coverage drift beyond this. Default 0.1.
  --json                 Emit JSON instead of a table.
  --no-pricing           Suppress the dollar block.
```

## Delete transcripts, keep cost history

Transcripts are large (MBs per session, GBs across a factory) and mostly conversation content the cost tool doesn't need. `backfill` bakes every transcript into a small append-only JSONL (~1 KB/turn, no prompt/response content); queries then read that file, and the transcripts are safe to delete:

```bash
llm-cost backfill --out ~/llm-cost-history.jsonl
llm-cost EPAC-1940 --from-usage ~/llm-cost-history.jsonl
rm -rf ~/.claude/projects ~/.codex/sessions   # once numbers verified
```

| | Before | After |
|---|---:|---:|
| Disk | 5.0 GB | 125 MB (40× smaller) |
| Query time | ~3 min | ~0.3 s |

The bake is lossless for everything the analysis uses (quota windows, Claude cache tiers, Codex reasoning/visible split, totals, models, timestamps, workspace provenance). The format follows the [Symphony Cost Telemetry Extension spec](https://github.com/RiddimSoftware/groove/blob/main/specs/symphony-cost-telemetry-extension/SPEC.md), so a conformant orchestrator can emit `usage.jsonl` directly and skip the bake — optional interop, not required.

## Is the forecast trustworthy? (`calibrate`)

A **P80** is the 80th-percentile cost — the number 80% of comparable issues come in at or below. Claiming "P80 = 12K tokens" is only honest if, on issues the forecaster never saw, the real cost actually lands under 12K about 80% of the time; otherwise it's a horoscope. `calibrate` checks exactly that against a local `usage.jsonl` whose records are **estimate-tagged** (each one carries the issue's size estimate). It sorts the records into **cells** — groups of past issues sharing the same `{ size, model }` — holds out a reproducible slice of each cell (`--seed` makes the split repeatable), forecasts from what's left, and measures how often the held-out actuals really fell at or below the predicted P80. Any cell whose hit-rate drifts from 80% by more than `--threshold` is flagged ⚠. On a small dataset the coverage figures are themselves noisy — a cell with only a few held-out issues can read 0% or 100% by luck — so treat per-cell flags as directional until cells are well-populated.

```bash
llm-cost calibrate ~/backfill.out --seed 1 --holdout 0.2
```

Read-only and local — the input is never written back or committed (point it at a gitignored file). Committed tests use only synthetic fixtures (`test/forecast-recovers-known-dist.test.mjs`).

## What drives your cost? (`cost-drivers`)

`cost-drivers` runs an end-to-end correlation analysis: it reads your LLM cost records, reads diff statistics from a local git repo, joins them by issue key, and prints Spearman rank correlation, linear Pearson, log-log Pearson, and a decile table. The goal is to understand which attributes of an issue predict how much it costs — using your own data, not anyone else's benchmarks.

**Minimal inputs:** a local git repo whose commit subjects include issue keys, and transcripts (or a `usage.jsonl`) for the same issues.

```bash
llm-cost cost-drivers --repo ~/code/my-project
llm-cost cost-drivers --repo ~/code/my-project --metric turns
llm-cost cost-drivers --repo ~/code/my-project --from-usage ~/llm-cost-history.jsonl
```

Example readout (synthetic numbers — for illustration only):

```
════════════════════════════════════════════════════════════════════════
COST DRIVERS  —  diff churn vs tokens
════════════════════════════════════════════════════════════════════════
Join strategy:  issue
Source:         ~/code/my-project
n = 42 pairs    unjoined: 3 usage, 5 diffs    unmatched commits: 11

Correlations:
  Spearman           0.34
  Pearson(linear)    0.21
  Pearson(log-log)   0.40

Decile table:
Decile   Feature range                n   Median cost
────────────────────────────────────────────────────────────────────────
1        14 – 87                      4        58.3K
2        91 – 210                     4        72.1K
3        215 – 380                    4        91.4K
4        384 – 510                    4       103.2K
5        512 – 740                    5       128.7K
6        744 – 1.1K                   4       145.3K
7        1.1K – 1.6K                  4       189.6K
8        1.6K – 2.4K                  4       224.1K
9        2.5K – 4.1K                  5       301.8K
10       4.2K – 9.3K                  4       512.4K
```

Reading that block: **Feature range** is diff churn (additions + deletions) in lines; **Median cost** is the median token count for issues in that churn decile. The three correlation coefficients tell the same story from different angles — see "Reading the output" below.

### Join model

`cost-drivers` needs to know which cost record belongs to which diff. The `--join-by` flag selects the strategy:

| Strategy | How it joins | When to use |
|---|---|---|
| `issue` (default) | Extracts issue keys (e.g. `ABC-123`) from commit subjects and from each cost record's `issueIdentifier` / workspace path | Works out of the box with Symphony's per-issue worktree convention and squash-merge commit messages |
| `worktree` | Joins on the cost record's workspace path vs. the diff record's key | Useful when your diff records carry workspace paths instead of issue keys |
| `time` | Attributes each cost record to the next commit within `--window` (e.g. `30m`, `2h`, `1d`) | Label-free fallback when commit subjects don't contain keys; inherently approximate |

```bash
# explicit strategies
llm-cost cost-drivers --repo ~/code/my-project --join-by issue    # default
llm-cost cost-drivers --repo ~/code/my-project --join-by worktree
llm-cost cost-drivers --repo ~/code/my-project --join-by time --window 2h

# override the key-extraction regex if your project uses a different format
llm-cost cost-drivers --repo ~/code/my-project --key-pattern 'TICKET-\d+'
```

The `keyOfUsage`, `keyOfDiff`, and `join` overrides are available via the library API (`joinCostWithFeature`) for cases the CLI flags don't cover — for example joining on a custom field, or implementing a fully custom reconciliation.

#### Escape hatch: join externally with `dump-* → correlate`

If none of the built-in strategies fit, emit the two streams and join them yourself:

```bash
# 1. dump the cost stream
llm-cost dump-usage > usage.jsonl

# 2. dump the diff stream
llm-cost dump-diffs --repo ~/code/my-project > diffs.jsonl

# 3. join them however you like, then feed back a { feature, cost } CSV
llm-cost correlate --pairs my-pairs.csv   # CSV: feature,cost[,key]
```

`correlate --pairs` accepts `.csv` (header `feature,cost`) or `.json` (array of `{feature, cost}` objects) and produces the same readout as `cost-drivers`.

### Reading the output

**Three correlation views, not one.** LLM cost is heavy-tailed — a handful of expensive issues can dominate a linear average. `cost-drivers` therefore reports:

- **Spearman** (rank correlation): captures monotonic relationships without being skewed by outliers. If big issues generally cost more than small ones, Spearman will pick that up even when the raw values vary wildly.
- **Pearson (linear)**: the standard linear correlation on raw values. On heavy-tailed data it can read near zero even when Spearman is meaningful; it is sensitive to a few extreme issues.
- **Pearson (log-log)**: Pearson on log₁₀-transformed values, the right view when both axes span orders of magnitude. If cost and diff size both grow geometrically, this is the coefficient that captures it.

A large gap between Spearman and linear Pearson is a signal that the relationship is real but nonlinear or that a few outliers are suppressing the linear view — not that the relationship is absent.

**Always check `n`.** With a small sample (say n < 20) the coefficients are unreliable and the decile table will have very few rows per bucket. Treat the output as directional until you have more history.

**Diff size is output, not effort.** A feature that happens to touch many files will show high churn whether or not it was the most complex work. Churn is the most readily available proxy; other features (issue estimate, turn count) may or may not track cost better on your workload.

**Local-git limits.** `readGitDiffs` only sees commits already in your local checkout — run `git fetch` or `git pull` first if you want remote-only commits. For the default `issue` strategy, commits must also carry issue keys in their subjects (the default pattern matches `ABC-123`-style keys; override with `--key-pattern`).

## Library

```js
import {
  computeIssueCost,
  computeIssueCostFromUsage,
  backfillUsageFromTranscripts,
  listKnownIssues,
} from 'llm-cost-attribution';

const rollup  = await computeIssueCost('EPAC-1940');
const rollup2 = await computeIssueCostFromUsage('EPAC-1940', '~/llm-cost-history.jsonl');
const result  = await backfillUsageFromTranscripts({ outFile: '/tmp/usage.jsonl' });
```

Pass `{ cwdPattern, claudeProjectsDir, codexSessionsDir }` to override defaults.

### Bring your own sources and sinks

The wrappers above read local Claude/Codex transcripts. If your sessions or usage
records live somewhere else (a database, an HTTP API, a test fixture), wire your
own ports into `createAttributionWorkflow` instead — the same core workflows, with
no filesystem assumptions:

```js
import { createAttributionWorkflow } from 'llm-cost-attribution';

const attribution = createAttributionWorkflow({
  sessionSource:     { async *listSessions() { /* yield ParsedSession objects */ } },
  issueMatcher:      { issueIdentifierForSession: (s) => /* 'EPAC-1940' | null */,
                       worktreePathForSession:    (s) => s.cwd },
  usageRecordSource: { async *readUsageRecords() { /* yield usage.jsonl records */ } },
  usageRecordSink:   { async writeUsageRecords(records) { /* persist them */ } },
});

await attribution.computeIssueCost('EPAC-1940');          // from sessions
await attribution.computeWorktreeCost('/path/to/worktree');
await attribution.computeIssueCostFromUsage('EPAC-1940'); // from usage records
await attribution.backfillUsage();                        // sessions → sink
```

The four ports are `SessionSource`, `IssueMatcher`, `UsageRecordSource`, and
`UsageRecordSink` (see `src/attribution-ports.mjs`). The real transcript/usage
adapters are also exported (`transcriptSessionSource`, `cwdIssueMatcher`,
`usageJsonlRecordSource`, `appendingUsageRecordSink`) if you want the built-in
sources with a custom workflow. Only supply the ports a given call needs.

### Diff-size feature records

`readGitDiffs(repoPath, { revRange, keyPattern })` reads local `git log --numstat`
output and yields one aggregated record per issue key found in commit subjects:

```js
for await (const diff of readGitDiffs('/path/to/repo')) {
  console.log(diff.key, diff.additions + diff.deletions, diff.changedFiles);
}
```

It is local-first: no GitHub token, network, or API calls. The tradeoff is that it
sees only history already present in the checkout, and commits must carry issue
keys in their subjects, as with squash-merge subjects like `[ABC-12]: add widget`.

### Use cases and extension ports

Beyond the rollup workflows above, the package surfaces a second tier of named application-layer use cases for forecasting and correlation. Each one declares its own ports so callers can inject custom data, alternate pricing, or their own quota model without touching the core. The full per-use-case contract — including the rollup-style `ComputeIssueCost` / `BackfillUsage` / `CreateAttributionWorkflow` group already covered above — lives in [`docs/architecture/use-case-catalog.md`](../../docs/architecture/use-case-catalog.md).

| Use case | What it does for callers | Extension ports |
|---|---|---|
| `ForecastIssueCost` | Forecast tokens / turns / dollars / Codex quota P50–P80 for a `{ size, model }` cell from past records, before work starts. | `EstimateTaggedUsageSource`, `PricingTable`, `QuotaModel` |
| `ForecastProjectCost` | Forecast a project total by Monte Carlo convolution over per-issue cells, so summed quantiles don't over-state tail risk. Tokens / turns / dollars only — quota and wall-clock don't sum. | per-cell sampler (`collectCellSamples`), `PricingTable` |
| `JoinCostWithFeature` | Tie a chunk of cost to a chunk of code change without hard-wiring any one org's workflow. Produces `{ feature, cost }` pairs ready for `correlateCostWithFeature`. | `CostFeatureJoiner` (`issue-key`, `worktree`, `time`, or a caller `keyOfUsage`/`keyOfDiff`/full `join`), `DiffSource` |
| `ReadGitDiffs` | Read per-issue diff sizes from local git history without GitHub access; implements the `DiffSource` port for `JoinCostWithFeature`. | adapter only — no inward ports |
| `CorrelateCostWithFeature` | Judge how strongly a feature (diff churn, file count, …) predicts cost via Spearman, linear Pearson, log-log Pearson, and a decile table. | none — pure function over `{ feature, cost }` pairs |

### Inject a custom usage source

`forecastIssueCost`, `forecastProjectCost`, and the join helpers all accept any iterable, async iterable, or object exposing `records()` / `iterate()` for their cost input. That lets you forecast straight from an in-memory array, a database stream, or a synthetic generator — no `~/.claude/projects` / `~/.codex/sessions` reads, no API tokens.

```js
import { forecastIssueCost, syntheticUsageRecords } from 'llm-cost-attribution';

// 50 spec-shaped records with a known log-normal P50/P80 distribution.
const records = syntheticUsageRecords({
  p50: 1_000_000, p80: 1_800_000,
  n: 50, seed: 1,
  size: 'L', model: 'claude-sonnet-4-6',
});

const forecast = await forecastIssueCost(
  { size: 'L', model: 'claude-sonnet-4-6' },
  records,
);
// → { tokens: { p50, p80, n: 50 }, turns, dollars, quota, lowConfidence, empty }
```

Any object exposing `records()` works too — useful when wrapping a query, a stream, or a fixture loader:

```js
const inMemorySource = {
  async *records() {
    for (const record of myDataset) yield record;
  },
};
await forecastIssueCost({ size: 'M', model: 'claude-sonnet-4-6' }, inMemorySource);
```

The same `inMemorySource` shape is what `joinCostWithFeature({ usage, diffs })` consumes for its `usage` argument, so a single custom source feeds both the forecaster and the correlator.

### Inject a custom pricing or quota model

The `PricingTable` and `QuotaModel` ports are injected through `forecastIssueCost`'s options. The library defaults (`DEFAULT_PRICING_TABLE`, `DEFAULT_QUOTA_MODEL`) wrap `pricing.mjs` and `quota.mjs`; substitute your own for an alternate provider, an enterprise rate card, or a synthetic test.

```js
import { forecastIssueCost } from 'llm-cost-attribution';

// Flat-rate $2 per million tokens, regardless of bucket split.
// `buckets` is the spec §5.2.3 TokenBuckets shape:
// { inputUncached, inputCached, cacheCreate5m, cacheCreate1h, outputVisible, outputReasoning }.
const flatRatePricing = {
  priceFor(_model, buckets) {
    const total =
      buckets.inputUncached + buckets.inputCached +
      buckets.cacheCreate5m + buckets.cacheCreate1h +
      buckets.outputVisible + buckets.outputReasoning;
    return total * 0.000_002;
  },
};

// Treat each issue's wall-clock as a fraction of a 5-minute SLO budget.
const sloQuotaModel = {
  quotaFractionFor(record) {
    const elapsedMs = Date.parse(record.endedAt) - Date.parse(record.startedAt);
    return elapsedMs / (5 * 60 * 1000);
  },
};

await forecastIssueCost(
  { size: 'L', model: 'flat-rate-1' },
  records,
  { pricingTable: flatRatePricing, quotaModel: sloQuotaModel },
);
```

`forecastProjectCost` takes the same `PricingTable` so a project rollup quotes dollars off whichever rate card you injected per-issue.

### Compose `JoinCostWithFeature` with `correlateCostWithFeature`

The pluggable join produces `{ key, feature, cost: { tokens, turns } }` pairs; the correlator consumes `{ feature, cost }` after picking a single metric:

```js
import {
  joinCostWithFeature,
  correlateCostWithFeature,
  readUsageRecords,
  readGitDiffs,
} from 'llm-cost-attribution';

const usage = readUsageRecords('./usage.jsonl');
const diffs = readGitDiffs('./my-repo');

const { pairs, unjoined } = await joinCostWithFeature({
  usage,
  diffs,
  strategy: 'issue-key',          // or 'worktree' | 'time'
});

const tokenPairs = pairs.map((p) => ({ feature: p.feature, cost: p.cost.tokens }));
const result = correlateCostWithFeature(tokenPairs);
// → { n, spearman, pearsonLinear, pearsonLogLog, pearsonLogLogDropped, deciles }
```

For workflows the built-in strategies don't cover, supply a caller-defined `keyOfUsage` / `keyOfDiff` (custom-key join) or a full `join(usage, diffs) → pairs` (escape hatch). Both replace the strategy entirely and are validated against the `{ feature, cost: { tokens, turns } }` contract.

### Ready vs. planned APIs

Every export named in the use-case table above is implemented and stable, as are the rollup workflows reached through `createAttributionWorkflow`. The package has no planned, unsupported, or deprecated public APIs in this release — story-point–aware enrichment lives in the sibling [`llm-cost-estimation`](../llm-cost-estimation) package, which re-exports `forecastIssueCost`, `forecastProjectCost`, and `calibrateCoverage` and feeds them through the same `EstimateTaggedUsageSource` / `PricingTable` / `QuotaModel` ports rather than reaching across package boundaries.

The convenience wrappers shipped with this package (`computeIssueCost`, `backfillUsageFromTranscripts`, `iterateUsageFromTranscripts`) still read `~/.claude/projects` / `~/.codex/sessions` locally and make no network call — no API tokens, no telemetry pipeline. Custom-port workflows are opt-in; the transcript and `usage.jsonl` paths stay key-free.

## What it doesn't (and can't) do

- **Story-point estimates** — live in your tracker, not the transcripts (see the sibling `llm-cost-estimation`).
- **Attempt counts** — the CLI doesn't record "attempt #N"; 5 runs look like 5 sessions with no winner marked.
- **PR / CI / reviewer state** — comes from GitHub, not the CLIs; out of scope (matches Symphony §2.2/§11.5).
- **Claude Desktop, claude.ai, ChatGPT, raw API SDK** — only Claude Code CLI and Codex CLI sessions are read.

## Pricing

`llm-cost` shows API-equivalent dollar cost per bucket from a built-in rate table ([Anthropic](https://www.anthropic.com/pricing), [OpenAI](https://platform.openai.com/docs/pricing)). **This is a counterfactual, not your actual spend:** on a subscription plan (Claude Max, Codex Pro) it's what the same tokens would cost pay-as-you-go — your real marginal cost is the quota readout, not the dollar total. The CLI warns when the table is >90 days old; `--no-pricing` suppresses the block.

## License

MIT
