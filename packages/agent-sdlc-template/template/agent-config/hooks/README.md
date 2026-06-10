# Factory Provenance Hooks

Runtime hooks for the Transcript-Provenance Ingest pilot. These scripts fire on Claude Code (and eventually Codex) lifecycle events to deterministically capture which Linear items were created during a session, then attach provenance metadata to those items at session end.

## Scripts

### `post-tool-use-record-linear-creations.mjs`

**Hook type:** `PostToolUse`
**Trigger:** Fires after every tool call in a session.

Filters on Linear MCP creation tools:
- `mcp__<namespace>__save_issue`
- `mcp__<namespace>__save_project`
- `mcp__<namespace>__save_initiative`

The `<namespace>` segment is a UUID injected by the MCP runtime and varies per installation (e.g. `mcp__852c51d3-c3ae-4813-8f86-6e0893d9ef71__save_issue`). The regex `/^mcp__[^_].*__save_(issue|project|initiative)$/` matches any prefix.

For matching tool calls, appends one JSON line to the per-session items file:

```json
{"linearId": "FAC-101", "kind": "issue", "toolName": "mcp__...__save_issue", "createdAt": "2026-05-15T04:00:00.000Z"}
```

### `post-tool-use-record-linear-creations.codex.mjs`

**Hook type:** `PostToolUse`
**Trigger:** Fires after every tool call in a Codex session.
**Target:** Codex equivalent of the Claude Code `post-tool-use-record-linear-creations.mjs` hook.

Filters on Linear MCP creation tools:
- `mcp__linear__save_issue`
- `mcp__linear__save_project`
- `mcp__linear__save_initiative`
- `mcp__codex_apps__save_issue` (Apps layer)
- `mcp__codex_apps__save_project` (Apps layer)
- `mcp__codex_apps__save_initiative` (Apps layer)

Unlike the Claude Code version (which matches a UUID-prefixed namespace), Codex's MCP tool names use the stable format `mcp__<server>__<tool>`, allowing precise matching of both the raw Linear MCP server and the Apps connector layer.

For matching tool calls, appends one JSON line to the per-session items file (identical schema to the Claude version):

```json
{"linearId": "FAC-101", "kind": "issue", "toolName": "mcp__...__save_issue", "createdAt": "2026-05-15T04:00:00.000Z"}
```

### `stop-flush-provenance.mjs`

**Hook type:** `Stop`
**Trigger:** Fires when the session ends (normal exit or user interrupt).

Reads the per-session items file. If it is absent or empty (the common case — most sessions create no Linear items), exits silently. If items exist, invokes:

```bash
cd /YOUR/WORKSPACE/DIR/software-factory && \
  npx tsx apps/cli/provenance.ts \
    --session-id <id> \
    --source <claude|codex> \
    --items-file <path> \
    --storage s3
```

On CLI failure, logs to stderr with the items file path for manual reconciliation (FAC-29). Always exits `0` — never blocks session termination.

## Items File Location

```
${AGENT_STATE_DIR:-/YOUR/WORKSPACE/DIR/.agent-state}/factory/provenance/<session-id>.items.jsonl
```

One file per session, keyed on `session_id`. Concurrent sessions in the same working directory write to separate files — no collision.

Do not check these files into version control (covered by `.gitignore`).

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `CLAUDE_CODE_ENTRYPOINT` | set by Claude Code | Identifies the runtime as `claude` |
| `CODEX_SESSION` | set by Codex | Identifies the runtime as `codex` |

## Registration

### Claude Code (`.claude/settings.json`)

See `.claude/settings.json` in this repo. Both hooks are registered under the `hooks` key.

**Matcher note:** The `PostToolUse` matcher is a regex matched against the tool name. The pattern `mcp__.*__save_(issue|project|initiative)` accepts any MCP namespace prefix.
The `PreToolUse` matcher uses the same creation-tool pattern and enforces only the `save_issue` subset.

### Codex

Codex hooks are registered via `~/.codex/hooks.json` (or inline in `~/.codex/config.toml`). Both `PostToolUse` and `Stop` hooks are supported with the same semantics as Claude Code, though the payload schema differs slightly (see FAC-43 findings for details).

**Installation:**

Add or merge the following into `~/.codex/hooks.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "^mcp__(?:linear|codex_apps)__save_(issue|project|initiative)$",
        "hooks": [
          {
            "type": "command",
            "command": "node /YOUR/WORKSPACE/DIR/agent-config/hooks/post-tool-use-record-linear-creations.codex.mjs",
            "timeout": 10
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node /YOUR/WORKSPACE/DIR/agent-config/hooks/stop-flush-provenance.mjs",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

**Matcher note:** The `PostToolUse` matcher is a regex that matches both the raw MCP Linear namespace (`mcp__linear__save_*`) and the Apps layer connector (`mcp__codex_apps__save_*`), capturing `issue`, `project`, and `initiative` creations. This ensures the hook captures Linear creations regardless of which transport layer Codex uses.

## Tests

Unit tests live in `hooks/tests/` and use Node's built-in test runner (Node 18+):

```bash
node --test hooks/tests/pre-tool-use-enforce-linear-teams.test.mjs
node --test hooks/tests/post-tool-use.test.mjs
node --test hooks/tests/stop-flush.test.mjs
```

Fixture payloads in `hooks/fixtures/` were captured from real MCP responses observed in a live Claude Code session.