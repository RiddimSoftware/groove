# riddim-mcp Client Configs

This directory contains org-managed MCP client config fragments for local
manual sessions. The configs register the `riddim-mcp` stdio server by running:

```bash
mcpd stdio
```

## Install

From the `agent-config` checkout:

```bash
bin/install-mcp-clients
```

The installer writes:

| Client | Destination |
|---|---|
| Claude Code | `~/.claude/.mcp.json` |
| Codex CLI | `~/.codex/config.toml.d/riddim-mcp.toml` |
| Gemini CLI | `~/.gemini/settings.json` |

When a destination does not exist, the installer creates a symlink to the
managed template. When a destination already exists, it preserves existing
entries and adds or updates only the `riddim-mcp` server entry. Re-running the
installer is idempotent.

## Diagnostics

Verify the daemon install before opening a client:

```bash
mcpd status
```

A healthy daemon reports `Status: ok` plus active lease and session counts.
Operational details live in the canonical `YourGithubOrg/mcp` docs:

- `/YOUR/WORKSPACE/DIR/mcp/docs/operations/runbook.md`
- `/YOUR/WORKSPACE/DIR/mcp/docs/operations/logging.md`
- `/YOUR/WORKSPACE/DIR/mcp/docs/architecture/use-case-catalog.md`
