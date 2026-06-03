# llm-cost-attribution

Per-issue token, turn, and quota analytics for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) and [Codex CLI](https://github.com/openai/codex) sessions. Reads the CLIs' own session JSONLs — **no telemetry pipeline, no database, no API keys**.

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

Requires Node 20+. Zero runtime dependencies.

## How it works

Both CLIs persist every run as JSONL — Claude Code in `~/.claude/projects/<encoded-cwd>/<sessionId>.jsonl`, Codex in `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl` — and each file carries provider-reported token usage per turn (the same numbers your account is billed against), plus Codex `rate_limits.*.used_percent`. This package walks both directories, keeps sessions whose **working directory** matches the issue ID you ask for, and aggregates.

The issue↔session join is the `cwd`: under [Symphony's spec](https://github.com/openai/symphony/blob/main/SPEC.md) every agent runs in a per-issue workspace (`<workspace.root>/<ISSUE-ID>`), so the CLIs record the issue ID in each transcript automatically — no custom pipeline. The default `--cwd-pattern` matches both the spec default (`<tmp>/symphony_workspaces/<ID>`) and the common in-repo layout (`<repo>/.symphony/workspaces/<ID>`). For any other layout, pass your own regex with one capture group:

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

## Is the P80 actually a P80? (`calibrate`)

A forecast nobody checked is a horoscope. `calibrate` backtests `forecastIssueCost`'s P80 band against a local, estimate-tagged `usage.jsonl`: it groups into `{ size, model }` cells, holds out a reproducible fraction (`--seed`), fits on the rest, and reports the empirical fraction of held-out actuals at/below the predicted P80. Cells drifting from 80% by more than `--threshold` are flagged ⚠.

```bash
llm-cost calibrate ~/backfill.out --seed 1 --holdout 0.2
```

Read-only and local — the input is never written back or committed (point it at a gitignored file). Committed tests use only synthetic fixtures (`test/forecast-recovers-known-dist.test.mjs`).

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

## What it doesn't (and can't) do

- **Story-point estimates** — live in your tracker, not the transcripts (see the sibling `llm-cost-estimation`).
- **Attempt counts** — the CLI doesn't record "attempt #N"; 5 runs look like 5 sessions with no winner marked.
- **PR / CI / reviewer state** — comes from GitHub, not the CLIs; out of scope (matches Symphony §2.2/§11.5).
- **Claude Desktop, claude.ai, ChatGPT, raw API SDK** — only Claude Code CLI and Codex CLI sessions are read.

## Pricing

`llm-cost` shows API-equivalent dollar cost per bucket from a built-in rate table ([Anthropic](https://www.anthropic.com/pricing), [OpenAI](https://platform.openai.com/docs/pricing)). **This is a counterfactual, not your actual spend:** on a subscription plan (Claude Max, Codex Pro) it's what the same tokens would cost pay-as-you-go — your real marginal cost is the quota readout, not the dollar total. The CLI warns when the table is >90 days old; `--no-pricing` suppresses the block.

## License

MIT
