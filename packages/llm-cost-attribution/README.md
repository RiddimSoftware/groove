# llm-cost-attribution

Per-issue token, turn, and quota analytics for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) and [Codex CLI](https://github.com/openai/codex) sessions. Reads the CLIs' own session JSONLs — **no telemetry pipeline, no database, no API keys**.

```bash
npx llm-cost-attribution EPAC-1940
```

```
════════════════════════════════════════════════════════════════════════
LLM COST  —  EPAC-1940
════════════════════════════════════════════════════════════════════════
Sessions found:       5
Total turns:          414
Total tokens:         61,357,012

────────────────────────────────────────────────────────────────────────
CODEX  (4 sessions)
────────────────────────────────────────────────────────────────────────
  Models:             gpt-5-codex
  Turns:              340
  Tokens:
    input uncached         1,517,206
    cache read            51,024,768
    output (visible)          44,683
    output (reasoning)        18,649
    grand total           52,605,306
  Quota  (plan_type=pro, 345 samples):
    5h window  58% → 64% used  (peak 64%)
    7d window  56% → 57% used  (peak 57%)
```

## Designed for Symphony workflows

[OpenAI Symphony's specification](https://github.com/openai/symphony/blob/main/SPEC.md) requires that each issue gets its own filesystem workspace, and that the coding agent's `cwd` equals that workspace path:

- **§4.1.4 Workspace** — "Filesystem workspace assigned to one issue identifier."
- **Workspace path formula** — `<workspace.root>/<sanitized_issue_identifier>`.
- **Invariant 1** — "Run the coding agent only in the per-issue workspace path... validate: `cwd == workspace_path`."

Because of those requirements, the working directory of every Claude Code or Codex CLI session that Symphony (or any Symphony-spec-conformant orchestrator) launches always carries the issue identifier as its last path component. The CLI agents in turn record that `cwd` in every session JSONL they create. So the issue identifier is already in the transcript — no custom telemetry pipeline needed to join.

This package's default `--cwd-pattern` matches the two most common `workspace.root` configurations:

1. The Symphony spec default: `<system-temp>/symphony_workspaces/<ISSUE-ID>` (e.g. `/tmp/symphony_workspaces/EPAC-1940`).
2. A common in-repo override: `<repo>/.symphony/workspaces/<ISSUE-ID>` (used by Autopilot and the Riddim factory's Symphony config).

For any other `workspace.root` setting, pass `--cwd-pattern '<regex>'` with one capture group for the issue identifier — see "[The convention](#the-convention)" below.

## How it works

Both CLIs persist every session they run as JSONL:

- **Claude Code** writes `~/.claude/projects/<encoded-cwd>/<sessionId>.jsonl` for every interactive and non-interactive run (encoded-cwd is the absolute working directory with `/` and `.` replaced by `-`).
- **Codex CLI** writes `~/.codex/sessions/YYYY/MM/DD/rollout-<timestamp>-<id>.jsonl` for every run, with the working directory recorded in the first `session_meta` event.

Each file carries provider-reported token usage per turn — the same numbers your Anthropic / OpenAI account is billed against:

| Provider | Tokens captured |
|---|---|
| Claude | `input_tokens`, `cache_read_input_tokens`, `cache_creation.{ephemeral_5m,1h}_input_tokens`, `output_tokens` |
| Codex | `input_tokens`, `cached_input_tokens`, `output_tokens`, `reasoning_output_tokens` (deltaed from cumulative) |
| Codex (additionally) | `rate_limits.{primary,secondary}.used_percent` per turn |

This package walks both directories, filters sessions whose working directory matches an issue identifier you ask for, and aggregates.

## The convention

You map sessions to issues via the **working directory at session start**. By default this package matches the Symphony-spec convention:

```
<repo>/.symphony/workspaces/<ISSUE-ID>
```

A regex extracts `<ISSUE-ID>`. If your workflow uses a different layout, pass `--cwd-pattern '<regex>'` with one capture group:

```bash
# Your workflow uses ../repo-worktrees/<ID>
llm-cost FOO-12 --cwd-pattern '-([A-Z]+-\d+)$'

# Your workflow uses ~/issues/<id>/
llm-cost 1234 --cwd-pattern '/issues/(\d+)$'
```

If your workflow doesn't give each issue its own working directory (e.g. you switch branches in a single checkout), this package can't disambiguate sessions for you — see "[What it doesn't (and can't) do](#what-it-doesnt-and-cant-do)" below.

## Install

```bash
# One-shot via npx
npx llm-cost-attribution EPAC-1940

# Install globally
npm install -g llm-cost-attribution
llm-cost EPAC-1940
```

Requires Node 20+. Zero runtime dependencies.

## CLI

```
llm-cost <ISSUE-ID> [options]
llm-cost <ISSUE-ID> --from-usage <usage.jsonl-or-dir>
llm-cost list
llm-cost backfill --out <usage.jsonl-path>
llm-cost calibrate <usage.jsonl-or-dir> [--seed N] [--holdout F]
llm-cost --help

Options:
  --cwd-pattern <regex>   JS regex matching the cwd; one capture group is the issue ID.
                          Default matches both `<system-temp>/symphony_workspaces/<ID>`
                          and `<repo>/.symphony/workspaces/<ID>` (raw or Claude-encoded).
  --claude-dir <path>     Override ~/.claude/projects.
  --codex-dir <path>      Override ~/.codex/sessions.
  --from-usage <path>     Read from a usage.jsonl file or directory of `usage*.jsonl`
                          files instead of the CLI transcripts. See "Delete transcripts,
                          keep cost history" below.
  --out <path>            (backfill only) Destination usage.jsonl path. Appended.
  --seed <int>            (calibrate only) Seed for the deterministic held-out split. Default 1.
  --holdout <0..1>        (calibrate only) Fraction of each cell's issues held out. Default 0.2.
  --quantile <0..1>       (calibrate only) Quantile band to test. Default 0.8 (P80).
  --threshold <0..1>      (calibrate only) Flag a cell when coverage drifts from the
                          target by more than this. Default 0.1 (10 points).
  --json                  Emit JSON instead of a table.
  -h, --help              Print help.
```

## Delete transcripts, keep cost history (optional)

Transcripts are large — a few MB per session, growing to gigabytes across an active factory — and most of the bytes are conversation content the cost tool doesn't need. So `llm-cost` can **bake** every transcript into a small append-only JSONL file (~1 KB per turn, no prompt or response content), then read cost queries from that file instead. After the bake, transcripts are safe to delete.

```bash
# Bake every transcript on this machine into one file.
llm-cost backfill --out ~/llm-cost-history.jsonl

# Cost queries now run against the much smaller file:
llm-cost EPAC-1940 --from-usage ~/llm-cost-history.jsonl

# Once you've verified the numbers match, transcripts are safe to delete:
rm -rf ~/.claude/projects ~/.codex/sessions
```

Real-world numbers from a working factory:

| | Before backfill | After backfill |
|---|---:|---:|
| Disk footprint | 5.0 GB | 125 MB (40× smaller) |
| `llm-cost EPAC-1940` query time | ~3 min (full Codex scan) | ~0.3 s |

The backfill is lossless for everything the cost analysis cares about — including the Codex per-window quota readout, the Claude cache-tier split (5m vs 1h), and the Codex reasoning-vs-visible output split. Token grand totals, turn counts, models, timestamps, and workspace-path provenance are preserved exactly. The bake file can also be checked into a private repo, shipped to a billing host, or queried from CI without access to the machine that produced the agent sessions.

This whole flow is a built-in feature of the package — you don't need to know anything about the file format to use it. As a side benefit: the format follows the [Symphony Coding-Agent Cost Telemetry Extension spec](https://github.com/RiddimSoftware/groove/blob/main/specs/symphony-cost-telemetry-extension/SPEC.md), so any other tool that conforms can read or write the same file (e.g. a Symphony-spec-conformant orchestrator can emit `usage.jsonl` directly during runs, skipping the bake step entirely). That interop is purely optional; the package works exactly the same whether you care about the spec or not.

## Is the P80 actually a P80? (`calibrate`)

A forecast nobody checked is a horoscope. `forecastIssueCost` hands back a P80
band per `{ size, model }` cell — but "P80" only means something if, on issues
the forecaster *didn't* see, the actual cost lands at or below that band about
80% of the time. `llm-cost calibrate` measures exactly that on a local dataset:

```bash
# Backtest the forecaster's P80 against a local, estimate-tagged usage.jsonl
# (e.g. an enriched backfill). The input never leaves your machine.
llm-cost calibrate ~/backfill.out --seed 1 --holdout 0.2
```

It groups the dataset into `{ size, model }` cells, deterministically holds out
a fraction of each cell's issues (reproducible under `--seed`), fits the
forecaster on the rest, and reports — per cell and overall — the empirical
fraction of held-out actuals at or below the predicted P80. Cells whose coverage
drifts from 80% by more than `--threshold` (default 10 points) are flagged ⚠,
so an over- or under-confident band is impossible to miss:

```
Cell                   Train  Holdout   Pred P80  Coverage  Flag
────────────────────────────────────────────────────────────────────────
L / sonnet               240       60      12.0K       79%
M / opus                  40       10       1.0K      100%  ⚠ FLAG
────────────────────────────────────────────────────────────────────────
OVERALL                           110                  84%
```

**Privacy.** `calibrate` is a read-only, local command: the input is never
written back and never committed. Point it at a gitignored file such as
`backfill.out` (already in this repo's `.gitignore`); the leak-safety guard and
`.gitignore` keep real telemetry out of any commit. Pass `--json` for the raw
report. The committed tests use only synthetic fixtures drawn from a known
distribution — see `test/forecast-recovers-known-dist.test.mjs`, which proves
the forecaster recovers a distribution whose P50/P80 it was handed.

## Library

```js
import {
  computeIssueCost,
  computeIssueCostFromUsage,
  backfillUsageFromTranscripts,
  listKnownIssues,
} from 'llm-cost-attribution';

// Read from transcripts directly:
const rollup = await computeIssueCost('EPAC-1940');
console.log(rollup.combinedTokens);
console.log(rollup.providerTotals.codex.quotaSamples);

// Or read from a backfilled usage.jsonl:
const rollup2 = await computeIssueCostFromUsage('EPAC-1940', '~/llm-cost-history.jsonl');

// Backfill programmatically:
const result = await backfillUsageFromTranscripts({
  outFile: '/tmp/usage.jsonl',
  onProgress: ({ phase, processed, total }) => console.log(`${phase}: ${processed}/${total}`),
});
console.log(`Wrote ${result.recordsWritten} records`);
```

Pass `{ cwdPattern, claudeProjectsDir, codexSessionsDir }` to override defaults on any of the above.

## What it doesn't (and can't) do

- **Story-point estimate axis.** Estimates live in your issue tracker (Linear / Jira / GitHub Projects), not in the CLI transcripts. To get cost-vs-estimate rollups you'd need to join issue-tracker data — out of scope for this package.
- **Attempt counts.** The CLI doesn't record "this was attempt #N of M"; if you ran `claude` 5 times on the same issue, this package sees 5 sessions but can't tell you which one shipped.
- **PR-merge state, CI status, reviewer verdicts.** These come from GitHub, not from the CLIs — and the Symphony spec explicitly out-of-scopes them (§2.2 Non-Goals, §11.5): ticket mutations and PR outcomes are delegated to the coding agent's tooling, not recorded by the orchestrator. This package stops at the same boundary: "what's in the CLI transcript."
- **Anything in the Claude Desktop app, claude.ai, ChatGPT, or direct API SDK calls.** Only Claude Code CLI and Codex CLI sessions are stored in the directories this package reads.

## Pricing

`llm-cost` shows API-equivalent dollar cost per bucket alongside the raw token counts, using a built-in rate table sourced from [anthropic.com/pricing](https://www.anthropic.com/pricing) and [platform.openai.com/docs/pricing](https://platform.openai.com/docs/pricing):

```
API-equivalent pricing (gpt-5.5 @ rates verified 2026-05-22):
    input uncached        $7.59    (1.5M × $5.00/1M)
    cache read           $25.51    (51.0M × $0.500/1M)
    output (visible)      $1.34    (44.7K × $30.00/1M)
    output (reasoning)    $0.56    (18.6K × $30.00/1M)
    ───────────────────────────────────────────
    total API cost       $35.00    [hypothetical — your Codex Pro plan covers this]
```

**This is a counterfactual, not your actual spend.** If you're on a subscription plan (Claude Max, Codex Pro, etc.), the dollar number represents what the same token volume would have cost on pay-as-you-go API — useful for comparison, but the marginal cost of running it on your actual plan is captured by the Codex quota readout above (`5h primary 58% → 64% used`), not by the dollar total.

The CLI warns when the bundled rate table is more than 90 days old. Pass `--no-pricing` to suppress the block entirely.

## License

MIT
