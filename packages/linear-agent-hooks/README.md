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

## Requirements

- Node.js 18+
- A Linear API key — create one at linear.app → Settings → API

Set the key in your shell profile:

```bash
export LINEAR_API_KEY="lin_api_..."
```

## Configuration

| Variable | Default | Description |
|---|---|---|
| `LINEAR_API_KEY` | — | **Required.** Your Linear API key |
| `GROOVE_STATE_DIR` | `~/.groove` | State directory for session files |
| `GROOVE_CONTEXT_TURNS` | `1` | User turns to include in provenance comment |
| `GROOVE_DISABLED` | — | Set to `1` to disable without uninstalling |

## Uninstall

```bash
npx linear-agent-hooks remove
```

Removes the hook entries from your settings files. Hook scripts at
`~/.groove/hooks/` can be deleted manually.
