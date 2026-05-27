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
llm-cost <ISSUE-ID> --from-usage <usage.jsonl-or-dir>
llm-cost list
llm-cost backfill --out <usage.jsonl-path>
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
  --json                  Emit JSON instead of a table.
  -h, --help              Print help.
```

## Delete transcripts, keep cost history

Transcripts are large — a few MB per session, growing to gigabytes across an active factory — and most of the bytes are conversation content the cost tool doesn't need. The [Symphony Coding-Agent Cost Telemetry Extension specification](https://github.com/RiddimSoftware/groove/blob/main/specs/symphony-cost-telemetry-extension/SPEC.md) defines a narrow append-only stream, `usage.jsonl`, that captures the cost-relevant projection of every turn (~1 KB per row, no prompt or response content) — designed so you can keep years of cost history in megabytes after deleting the transcripts the records were derived from.

This package both **reads** the spec format and can **backfill** it from existing transcripts:

```bash
# Bake every transcript on this machine into one usage.jsonl file.
llm-cost backfill --out ~/llm-cost-history.jsonl

# Cost queries now run against the much smaller file:
llm-cost EPAC-1940 --from-usage ~/llm-cost-history.jsonl

# Once you've verified the numbers match, transcripts are safe to delete:
rm -rf ~/.claude/projects ~/.codex/sessions
```

Real-world numbers from a working factory:

| | Before backfill | After backfill |
|---|---:|---:|
| Disk footprint | 5.0 GB | 83 MB (60× smaller) |
| `llm-cost EPAC-1940` query time | ~3 min (full Codex scan) | ~0.3 s |

A `usage.jsonl` file can also be checked into a private repo, shipped to a billing host, or queried from CI without access to the machine that produced the agent sessions. The cost data outlives the transcripts.

### Fidelity tradeoff

The spec deliberately keeps only the cost-relevant fields. After backfilling, you lose three things the raw transcripts could tell you:

- The Claude cache-tier split (5m vs 1h cache creation tokens)
- The Codex reasoning-vs-visible output split
- Codex per-window quota samples (`rate_limits.{primary,secondary}.used_percent`)

Token grand totals, per-turn ordinal, model, timestamps, run/session IDs, and workspace-path provenance are all preserved exactly. If you need any of the dropped signals for a specific issue, keep the transcripts for those issues.

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
- **PR-merge state, CI status, reviewer verdicts.** These come from GitHub or your orchestrator, not from the CLIs. A Symphony-conformant orchestrator records these in its own telemetry — but this package deliberately stops at the boundary of "what's in the CLI transcript."
- **Anything in the Claude Desktop app, claude.ai, ChatGPT, or direct API SDK calls.** Only Claude Code CLI and Codex CLI sessions are stored in the directories this package reads.
- **Cost in dollars.** Token counts only. Multiply by the pricing of your plan to get a dollar estimate — but if you're on Claude Max / Codex Pro, the marginal cost is your quota, not dollars, which is exactly what the Codex quota readout shows.

## License

MIT
