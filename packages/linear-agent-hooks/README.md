# linear-agent-hooks

Claude Code and Codex hooks that automatically post a provenance comment to every
Linear issue your agent creates — capturing which session created it, what you asked
for, and when.

## Install

```bash
npx linear-agent-hooks setup
```

That's it. The setup command:
1. Validates your Linear API key
2. Installs the hook scripts to `~/.groove/hooks/`
3. Patches `~/.claude/settings.json` to register the hooks
4. Optionally patches `~/.codex/hooks.json`

Hooks are active immediately in the next session — no restart needed.

## What you'll see

After any Claude Code or Codex session where your agent creates a Linear issue,
a comment appears on that issue:

```
🤖 claude · session abc123def · 2026-05-27 14:32:11 UTC

> add pagination to the search results API endpoint
```

The quoted line is the last thing you asked for before the issue was created.

## How it works

Two hooks run silently in every session:

**PostToolUse** — fires after any `save_issue`, `save_project`, or
`save_initiative` MCP call. Records the created item's ID to a per-session
file at `~/.groove/provenance/<session-id>.items.jsonl`.

**Stop** — fires when the session ends. Reads the items file and posts a
comment to each Linear issue via the Linear API.

Neither hook blocks the session or produces visible output.

> **Why does the Stop hook need its own API key?**
> The Stop hook is a standalone Node.js script that runs _after_ the Claude
> session ends — there is no active MCP connection at that point. It calls the
> Linear GraphQL API directly using `LINEAR_API_KEY`. This is the same key
> that powers the Linear MCP server; you don't need a separate credential.

## Requirements

- Node.js 18+
- A Linear API key — create one at linear.app → Settings → API

### Setting the API key

The key must be in your shell profile **before you start Claude or Codex**.
Hook scripts run as subprocesses that inherit the environment from when Claude
launched, so a key exported only in the current terminal won't reach them.

```bash
# Add to ~/.zshrc, ~/.bashrc, or equivalent
export LINEAR_API_KEY="lin_api_..."
```

Then open a new terminal (or `source ~/.zshrc`) before starting Claude.
This is the same key the Linear MCP server uses — no separate credential needed.

## Configuration

| Variable | Default | Description |
|---|---|---|
| `LINEAR_API_KEY` | — | **Required.** Your Linear API key |
| `GROOVE_STATE_DIR` | `~/.groove` | State directory for session files |
| `GROOVE_CONTEXT_TURNS` | `1` | User turns to include in provenance comment |
| `GROOVE_DISABLED` | — | Set to `1` to disable without uninstalling |

## Backfill

If the Stop hook couldn't post comments for a session — for example, because
`LINEAR_API_KEY` wasn't set in the environment when Claude launched — you can
backfill those sessions later:

```bash
export LINEAR_API_KEY="lin_api_..."
npx linear-agent-hooks backfill
```

The backfill command scans `~/.groove/provenance/` for sessions that created
Linear issues but didn't receive provenance comments, and posts them now.
Already-commented issues are tracked in per-session `.done` files and skipped
automatically, so it's safe to run multiple times.

## Uninstall

```bash
npx linear-agent-hooks remove
```

Removes the hook entries from your settings files. Hook scripts at
`~/.groove/hooks/` can be deleted manually.
