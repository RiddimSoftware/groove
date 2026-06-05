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

Reading that block: **cache read** is tokens served from the provider's prompt cache (cheap, usually most of the total); **output (reasoning)** is hidden thinking tokens, billed separately from the **visible** answer; **Quota** is how much of your Codex plan's two rolling rate-limit windows (5-hour and 7-day) these sessions used. Requires Node 20+, zero runtime dependencies.

## How it works

Both CLIs persist every run as JSONL — Claude Code under `~/.claude/projects/`, Codex under `~/.codex/sessions/` — recording per turn the provider-reported token counts (the same numbers you're billed against) plus, for Codex, rate-limit usage. This package walks both directories, keeps the sessions whose **working directory** matches the issue ID you ask for, and adds them up.

Sessions match an issue by their **working directory** (`cwd`). Under [Symphony](https://github.com/openai/symphony/blob/main/SPEC.md), each agent runs in a per-issue directory, so the issue ID is already baked into every transcript path. The default `--cwd-pattern` matches the Symphony spec default and the in-repo `.symphony/workspaces/<ID>` layout. For any other layout, pass your own regex with one capture group around the ID:

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

Typical result: ~5 GB → ~125 MB (40× smaller), ~3 min → ~0.3 s per query. The bake is lossless for everything the analysis uses (quota windows, cache tiers, reasoning/visible split, totals, models, timestamps, provenance) and follows the [Symphony Cost Telemetry Extension spec](https://github.com/RiddimSoftware/groove/blob/main/specs/symphony-cost-telemetry-extension/SPEC.md), so a conformant orchestrator can emit `usage.jsonl` directly and skip the bake.

## Is the forecast trustworthy? (`calibrate`)

A **P80** is only honest if, on issues the forecaster never saw, the real cost lands at or below it about 80% of the time. `calibrate` checks exactly that against a local estimate-tagged `usage.jsonl`: it groups past issues into `{ size, model }` **cells**, holds out a reproducible slice per cell (`--seed`), forecasts from the rest, and measures how often the held-out actuals fell under the predicted P80. Cells drifting from 80% by more than `--threshold` are flagged ⚠. On small datasets per-cell coverage is itself noisy, so treat flags as directional until cells fill in.

```bash
llm-cost calibrate ~/backfill.out --seed 1 --holdout 0.2
```

Read-only and local — the input is never written back (point it at a gitignored file).

## What drives your cost? (`cost-drivers`)

`cost-drivers` runs an end-to-end correlation analysis: it reads your LLM cost records, reads diff statistics from a local git repo, joins them by issue key, and prints Spearman, linear Pearson, and log-log Pearson correlations plus a decile table — so you can see which attributes of an issue predict its cost, using your own data.

**Minimal inputs:** a local git repo whose commit subjects include issue keys, and transcripts (or a `usage.jsonl`) for the same issues.

```bash
llm-cost cost-drivers --repo ~/code/my-project
llm-cost cost-drivers --repo ~/code/my-project --metric turns
llm-cost cost-drivers --repo ~/code/my-project --from-usage ~/llm-cost-history.jsonl
```

Example readout (synthetic numbers — for illustration only):

```
COST DRIVERS  —  diff churn vs tokens
n = 42 pairs    unjoined: 3 usage, 5 diffs    unmatched commits: 11

Correlations:  Spearman 0.34   Pearson(linear) 0.21   Pearson(log-log) 0.40

Decile table:
Decile   Feature range                n   Median cost
1        14 – 87                      4        58.3K
2        91 – 210                     4        72.1K
…
10       4.2K – 9.3K                  4       512.4K
```

Reading that block: **Feature range** is diff churn (additions + deletions) in lines; **Median cost** is the median token count for issues in that churn decile. See "Reading the output" below.

### Join model

`cost-drivers` needs to know which cost record belongs to which diff. The `--join-by` flag selects the strategy:

| Strategy | How it joins | When to use |
|---|---|---|
| `issue` (default) | Issue keys (e.g. `ABC-123`) from commit subjects vs. each record's `issueIdentifier` / workspace path | Symphony per-issue worktrees + squash-merge commits |
| `worktree` | Cost record's workspace path vs. the diff record's key | Diff records carry workspace paths, not keys |
| `time` | Each cost record to the next commit within `--window` (`30m`, `2h`, `1d`) | Label-free fallback; approximate |

```bash
llm-cost cost-drivers --repo ~/code/my-project --join-by worktree
llm-cost cost-drivers --repo ~/code/my-project --join-by time --window 2h
llm-cost cost-drivers --repo ~/code/my-project --key-pattern 'TICKET-\d+'   # custom key format
```

The `keyOfUsage` / `keyOfDiff` / `join` overrides are available via the library API (`joinCostWithFeature`) for cases the CLI flags don't cover.

#### Escape hatch: join externally with `dump-* → correlate`

If no built-in strategy fits, dump the two streams, join them yourself, and feed back a `{ feature, cost }` CSV/JSON:

```bash
llm-cost dump-usage > usage.jsonl
llm-cost dump-diffs --repo ~/code/my-project > diffs.jsonl
llm-cost correlate --pairs my-pairs.csv   # CSV: feature,cost[,key]  — same readout as cost-drivers
```

### Reading the output

**Three correlation views, not one.** LLM cost is heavy-tailed, so a handful of expensive issues can dominate a linear average. **Spearman** (rank) captures monotonic relationships without being skewed by outliers; **Pearson (linear)** is the raw-value correlation and can read near zero on heavy-tailed data even when Spearman is meaningful; **Pearson (log-log)** is the right view when both axes span orders of magnitude. A large Spearman/linear gap signals a real but nonlinear relationship, not an absent one.

**Always check `n`.** Below ~20 pairs the coefficients are unreliable and decile buckets are thin — treat the output as directional.

**Diff size is output, not effort**, and `readGitDiffs` only sees commits already in your local checkout (run `git fetch` first for remote-only commits); for the default `issue` strategy, commit subjects must carry issue keys (override the pattern with `--key-pattern`).

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

The wrappers above read local transcripts. If your sessions or usage records live elsewhere (a database, an HTTP API, a test fixture), wire your own ports into `createAttributionWorkflow` — same core workflows, no filesystem assumptions:

```js
import { createAttributionWorkflow } from 'llm-cost-attribution';

const attribution = createAttributionWorkflow({
  sessionSource:     { async *listSessions() { /* yield ParsedSession objects */ } },
  issueMatcher:      { issueIdentifierForSession: (s) => /* id | null */, worktreePathForSession: (s) => s.cwd },
  usageRecordSource: { async *readUsageRecords() { /* yield usage.jsonl records */ } },
  usageRecordSink:   { async writeUsageRecords(records) { /* persist them */ } },
});

await attribution.computeIssueCost('EPAC-1940');          // from sessions
await attribution.backfillUsage();                        // sessions → sink
```

The four ports — `SessionSource`, `IssueMatcher`, `UsageRecordSource`, `UsageRecordSink` (see `src/attribution-ports.mjs`) — each have a built-in adapter you can also import (`transcriptSessionSource`, `cwdIssueMatcher`, `usageJsonlRecordSource`, `appendingUsageRecordSink`). Only supply the ports a given call needs.

### Diff-size feature records

`readGitDiffs(repoPath, { revRange, keyPattern })` reads local `git log --numstat` and yields one aggregated record per issue key found in commit subjects (`diff.key`, `diff.additions`, `diff.deletions`, `diff.changedFiles`). Local-first — no GitHub token or network — so it sees only history in the checkout, and commits must carry issue keys (e.g. squash subjects like `[ABC-12]: add widget`).

### Use cases and extension ports

Beyond the rollup workflows above, the package surfaces a second tier of named application-layer use cases for forecasting and correlation, each declaring its own injectable ports. The full per-use-case contract lives in [`docs/architecture/use-case-catalog.md`](../../docs/architecture/use-case-catalog.md).

| Use case | What it does for callers | Extension ports |
|---|---|---|
| `ForecastIssueCost` | Forecast tokens / turns / dollars / Codex quota P50–P80 for a `{ size, model }` cell from past records, before work starts. | `EstimateTaggedUsageSource`, `PricingTable`, `QuotaModel` |
| `ForecastProjectCost` | Forecast a project total by Monte Carlo convolution over per-issue cells, so summed quantiles don't over-state tail risk. Tokens / turns / dollars only — quota and wall-clock don't sum. | per-cell sampler (`collectCellSamples`), `PricingTable` |
| `JoinCostWithFeature` | Tie a chunk of cost to a chunk of code change without hard-wiring any one org's workflow. Produces `{ feature, cost }` pairs ready for `correlateCostWithFeature`. | `CostFeatureJoiner` (`issue-key`, `worktree`, `time`, or a caller `keyOfUsage`/`keyOfDiff`/full `join`), `DiffSource` |
| `ReadGitDiffs` | Read per-issue diff sizes from local git history without GitHub access; implements the `DiffSource` port for `JoinCostWithFeature`. | adapter only — no inward ports |
| `CorrelateCostWithFeature` | Judge how strongly a feature (diff churn, file count, …) predicts cost via Spearman, linear Pearson, log-log Pearson, and a decile table. | none — pure function over `{ feature, cost }` pairs |

### Inject a custom usage source

`forecastIssueCost`, `forecastProjectCost`, and the join helpers accept any iterable, async iterable, or object exposing `records()` / `iterate()` for their cost input — an in-memory array, a database stream, or a synthetic generator, with no transcript reads or API tokens:

```js
import { forecastIssueCost, syntheticUsageRecords } from 'llm-cost-attribution';

// 50 spec-shaped records with a known log-normal P50/P80 distribution.
const records = syntheticUsageRecords({ p50: 1_000_000, p80: 1_800_000, n: 50, seed: 1, size: 'L', model: 'claude-sonnet-4-6' });

const forecast = await forecastIssueCost({ size: 'L', model: 'claude-sonnet-4-6' }, records);
// → { tokens: { p50, p80, n: 50 }, turns, dollars, quota, lowConfidence, empty }
```

The same shape (an object with `records()`) is what `joinCostWithFeature({ usage, diffs })` consumes for `usage`, so one custom source feeds both the forecaster and the correlator.

### Inject a custom pricing or quota model

The `PricingTable` (`priceFor(model, buckets)`) and `QuotaModel` (`quotaFractionFor(record)`) ports are injected through `forecastIssueCost`'s options. The library defaults (`DEFAULT_PRICING_TABLE`, `DEFAULT_QUOTA_MODEL`) wrap `pricing.mjs` and `quota.mjs`; substitute your own for an alternate provider, an enterprise rate card, or a synthetic test:

```js
import { forecastIssueCost } from 'llm-cost-attribution';

// Flat-rate $2 per million tokens. `buckets` is the spec §5.2.3 TokenBuckets shape.
const flatRatePricing = { priceFor: (_model, b) => Object.values(b).reduce((a, n) => a + n, 0) * 0.000_002 };

await forecastIssueCost({ size: 'L', model: 'flat-rate-1' }, records, { pricingTable: flatRatePricing });
```

`forecastProjectCost` takes the same `PricingTable`, so a project rollup quotes dollars off whichever rate card you injected per-issue.

### Compose `JoinCostWithFeature` with `correlateCostWithFeature`

The pluggable join produces `{ key, feature, cost: { tokens, turns } }` pairs; the correlator consumes `{ feature, cost }` after picking a single metric:

```js
import { joinCostWithFeature, correlateCostWithFeature, readUsageRecords, readGitDiffs } from 'llm-cost-attribution';

const { pairs } = await joinCostWithFeature({
  usage: readUsageRecords('./usage.jsonl'),
  diffs: readGitDiffs('./my-repo'),
  strategy: 'issue-key',          // or 'worktree' | 'time'
});

const result = correlateCostWithFeature(pairs.map((p) => ({ feature: p.feature, cost: p.cost.tokens })));
// → { n, spearman, pearsonLinear, pearsonLogLog, pearsonLogLogDropped, deciles }
```

For cases the built-in strategies don't cover, supply a caller-defined `keyOfUsage` / `keyOfDiff` or a full `join(usage, diffs) → pairs`; both replace the strategy and are validated against the `{ feature, cost: { tokens, turns } }` contract.

### Ready vs. planned APIs

Every export in the use-case table above is implemented and stable, as are the rollup workflows reached through `createAttributionWorkflow`; the package has no planned, unsupported, or deprecated public APIs in this release. Story-point–aware enrichment lives in the sibling [`llm-cost-estimation`](../llm-cost-estimation) package, which re-exports `forecastIssueCost`, `forecastProjectCost`, and `calibrateCoverage` through the same ports. The convenience wrappers (`computeIssueCost`, `backfillUsageFromTranscripts`, `iterateUsageFromTranscripts`) read transcripts locally with no network call; custom-port workflows are opt-in and the transcript / `usage.jsonl` paths stay key-free.

## What it doesn't (and can't) do

- **Story-point estimates** — live in your tracker, not the transcripts (see the sibling `llm-cost-estimation`).
- **Attempt counts** — the CLI doesn't record "attempt #N"; 5 runs look like 5 sessions with no winner marked.
- **PR / CI / reviewer state** — comes from GitHub, not the CLIs; out of scope (matches Symphony §2.2/§11.5).
- **Claude Desktop, claude.ai, ChatGPT, raw API SDK** — only Claude Code CLI and Codex CLI sessions are read.

## Pricing

`llm-cost` shows API-equivalent dollar cost per bucket from a built-in rate table ([Anthropic](https://www.anthropic.com/pricing), [OpenAI](https://platform.openai.com/docs/pricing)). **This is a counterfactual, not your actual spend:** on a subscription plan it's what the same tokens would cost pay-as-you-go — your real marginal cost is the quota readout. The CLI warns when the table is >90 days old; `--no-pricing` suppresses the block.

## License

MIT
