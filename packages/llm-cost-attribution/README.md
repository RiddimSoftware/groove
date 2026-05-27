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

## Designed for Symphony-spec workflows

`llm-cost` works out of the box with any autonomous-developer setup that follows the [Symphony Telemetry Extension Specification](https://github.com/RiddimSoftware/groove/tree/main/specs/symphony-telemetry-extension) — i.e. one git worktree per issue at:

```
<repo>/.symphony/workspaces/<ISSUE-ID>
```

Symphony, Autopilot, and any other Symphony-spec-conformant orchestrator put each dispatch's working directory in that predictable place. The CLI agents (Claude Code, Codex CLI) record that working directory in every session they create, so the issue identifier travels with the transcript automatically — no joining against custom telemetry needed.

If your workflow uses a different cwd convention, pass `--cwd-pattern '<regex>'` with one capture group for the issue identifier — see "[The convention](#the-convention)" below.

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
llm-cost list
llm-cost --help

Options:
  --cwd-pattern <regex>   JS regex matching the cwd; one capture group is the issue ID.
                          Default: [.\-]symphony[/-]workspaces[/-]([A-Z]+-\d+)$
  --claude-dir <path>     Override ~/.claude/projects.
  --codex-dir <path>      Override ~/.codex/sessions.
  --json                  Emit JSON instead of a table.
  -h, --help              Print help.
```

## Library

```js
import { computeIssueCost, listKnownIssues } from 'llm-cost-attribution';

const rollup = await computeIssueCost('EPAC-1940');
console.log(rollup.combinedTokens);
console.log(rollup.providerTotals.codex.quotaSamples);

const allIssues = await listKnownIssues();
```

Pass `{ cwdPattern, claudeProjectsDir, codexSessionsDir }` to either function to override defaults.

## What it doesn't (and can't) do

- **Story-point estimate axis.** Estimates live in your issue tracker (Linear / Jira / GitHub Projects), not in the CLI transcripts. To get cost-vs-estimate rollups you'd need to join issue-tracker data — out of scope for this package.
- **Attempt counts.** The CLI doesn't record "this was attempt #N of M"; if you ran `claude` 5 times on the same issue, this package sees 5 sessions but can't tell you which one shipped.
- **PR-merge state, CI status, reviewer verdicts.** These come from GitHub or your orchestrator, not from the CLIs. A Symphony-conformant orchestrator records these in its own telemetry — but this package deliberately stops at the boundary of "what's in the CLI transcript."
- **Anything in the Claude Desktop app, claude.ai, ChatGPT, or direct API SDK calls.** Only Claude Code CLI and Codex CLI sessions are stored in the directories this package reads.
- **Cost in dollars.** Token counts only. Multiply by the pricing of your plan to get a dollar estimate — but if you're on Claude Max / Codex Pro, the marginal cost is your quota, not dollars, which is exactly what the Codex quota readout shows.

## License

MIT
