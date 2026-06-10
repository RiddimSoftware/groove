# Symphony Shared Configuration

This directory contains the canonical baseline configuration for Symphony workflows across the organization.

## Usage

Per-repository `WORKFLOW.md` files should inherit from this baseline using the `extends` directive:

```yaml
extends: /YOUR/WORKSPACE/DIR/agent-config/symphony/shared.yml
```

Autopilot uses a repo-local runtime workflow at
`/YOUR/WORKSPACE/DIR/autopilot/WORKFLOW.md`, generated from
`symphony/manifests/autopilot.yml`.

## Baseline Ownership

This file (`shared.yml`) owns the following fields, which are consistent across all repositories:

- `tracker`: Configuration for Linear integration.
- `polling`: Global polling intervals, including provider-specific shared polling defaults.
- `provider_webhook_relay`: Shared webhook ingestion contract for Linear and GitHub providers.
- `provider_event_inbox`: Durable, deduplicating inbox behavior for normalized provider events.
- `workspace`: Repository workspace settings and branch templates.
- `hooks`: Global hook timeouts.
- `agent`: Core agent configuration, provider settings, and bot credentials.
- `codex`: Codex-specific server, sandbox, and timeout settings.
- `claude`: Claude-specific command and timeout settings.
- `coordinator`: Coordinator connection settings. Disabled by default (`enabled: false`); set `enabled: true` once `mcpd` is running and coordinator worker mode is available. **Capacity is not configured here** — the coordinator live policy (`mcpd.db`, set via `PATCH /coordinator/capacity` on the console) is the sole authority. See [`docs/coordinator-runbook.md`](../docs/coordinator-runbook.md) for the full setup walkthrough.

Fields NOT included in this baseline (and which should remain in individual `WORKFLOW.md` files) include repository-specific overrides, unique server ports, and `gemini` or `reviewer` blocks specific to certain implementations.
