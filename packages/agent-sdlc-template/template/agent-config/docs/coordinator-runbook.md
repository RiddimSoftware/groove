# Symphony Coordinator Runbook

This runbook covers starting the Symphony Coordinator (`mcpd`), enabling coordinator mode in `symphonyd`, verifying worker registration, and opting individual repos out of coordinator assignment.

The coordinator feature is gated behind `coordinator.enabled` in `symphony/shared.yml` and is disabled by default. Do not enable it until the prerequisites below are met.

## Prerequisites

| Component | Readiness gate |
|---|---|
| `mcpd` (riddim-mcp daemon) | MCP-17: Expose coordinator MCP tools and snapshot API |
| `symphonyd` coordinator worker mode | AUTO-779: Add coordinator worker mode to symphonyd |

Until both issues are merged and deployed, leave `coordinator.enabled: false` in `shared.yml`.

---

## Step 1 — Start the coordinator daemon (`mcpd`)

Follow the full install walkthrough in the [mcpd operations runbook](../../mcp/docs/operations/runbook.md). The short path for a machine that already has `mcpd` installed:

```bash
# Verify mcpd is installed
which mcpd && mcpd --version

# Start via launchd (recommended for persistent operation)
launchctl load -w ~/Library/LaunchAgents/com.riddim.mcp.plist

# Confirm healthy
mcpd status
```

Expected output when healthy:

```
Status:          ok
Version:         <git-sha>
Uptime:          <N>s
Events:          0
Active leases:   0
Active sessions: 0
```

If `mcpd` is not yet installed, complete the build and launchd setup documented in the mcpd runbook before continuing.

---

## Step 2 — Enable coordinator mode in shared config

Edit `symphony/shared.yml` and flip the switch:

```yaml
coordinator:
  enabled: true           # was: false
  url: http://127.0.0.1:8785/mcp
  fallback_mode: standalone
  heartbeat_interval_ms: 30000
  poll_interval_ms: 30000
```

Capacity is managed by the coordinator live policy, not by `shared.yml`. After `mcpd` is running, set or adjust capacity via the console:

```bash
PATCH /coordinator/capacity   # body: { "global_max_agents": 4, "repositories": { ... } }
```

The coordinator stores this in `mcpd.db` and it takes effect immediately without a symphonyd restart.

> **Do not commit `enabled: true` to the shared baseline yet.** Keep the flip local (or in a `WORKFLOW.local.yml` override) until coordinator worker mode is verified end-to-end.

---

## Step 3 — Start `symphonyd` and confirm worker registration

```bash
# From the repo whose WORKFLOW.md you want to run under the coordinator
cd /YOUR/WORKSPACE/DIR/autopilot
swift run symphonyd
```

Within the first `poll_interval_ms` (30 s), `symphonyd` should register itself with the coordinator. Verify in the operator console:

```bash
open http://127.0.0.1:8785/coordinator
```

Or from the CLI:

```bash
curl -s http://127.0.0.1:8785/coordinator/snapshot | jq '.workers'
```

A registered worker will appear in the `workers` array with:
- `repo`: the repository this worker serves
- `state`: `"active"` or `"idle"`
- `capacity`: the effective slot count for this worker

---

## Step 4 — 10-second smoke path (human validation gate)

This step **requires a human operator** and is not required for PR merge.

1. Start `mcpd` (`mcpd status` → `ok`).
2. Flip `coordinator.enabled: true` locally.
3. Start `symphonyd` for one repo.
4. Wait 30 s; run `curl -s http://127.0.0.1:8785/coordinator/snapshot | jq '.workers'`.
5. Confirm the worker appears with `state: "active"`.
6. Trigger one real issue dispatch and confirm the coordinator assigns it to the registered worker.
7. Record pass/fail in a comment on AGENT-36.

---

## Standalone mode (opting a repo out of coordinator assignment)

When `coordinator.fallback_mode: standalone` is set (the default), any `symphonyd` instance that cannot reach the coordinator URL continues operating as a self-managed daemon — it picks up issues from Linear directly without coordinator assignment.

To force a specific repo to always run standalone regardless of coordinator availability, override in its `WORKFLOW.local.yml`:

```yaml
coordinator:
  enabled: false
```

No changes to `shared.yml` are needed — the local override takes precedence.

---

## Capacity policy

The shared config establishes defaults. Operators can override capacity at runtime without a config file change:

```bash
# Update global capacity ceiling and per-repo overrides via the coordinator API
curl -s -X PATCH http://127.0.0.1:8785/coordinator/capacity \
  -H 'Content-Type: application/json' \
  -d '{
    "maxAgents": 6,
    "perRepo": {
      "YourGithubOrg/mcp": 2,
      "YourGithubOrg/autopilot": 3
    },
    "updatedBy": "operator"
  }' | jq .
```

Runtime capacity changes take effect immediately and are reflected in the next `/coordinator/snapshot`. They are not persisted across `mcpd` restarts — update `shared.yml` for durable policy.

---

## Migration notes: `provider_event_inbox`

The `provider_event_inbox` section in `shared.yml` is **preserved unchanged**. It controls the local SQLite-backed provider event inbox used by `symphonyd` for durable, deduplicating ingest of Linear and GitHub webhooks. It is orthogonal to coordinator assignment.

Do not remove or migrate `provider_event_inbox` until:
1. Coordinator ingest (MCP-17) is live and verified in production.
2. Coordinator worker mode (AUTO-779) is verified end-to-end.

Until both conditions are met, `provider_event_inbox` remains the authoritative event source for all `symphonyd` instances.

---

## Secrets and external setup (human-gated)

The coordinator itself does not require additional webhook secrets beyond what `mcpd` already uses. However, if you are deploying `mcpd` for the first time or rotating secrets, the following steps require human access to AWS Parameter Store or the relevant vendor dashboards:

| Step | Owner | Location |
|---|---|---|
| Rotate `/symphony/linear-webhook-signing-secret` | Eng lead | AWS Parameter Store (`your-aws-profile`, `us-east-1`) |
| Rotate `/symphony/github-webhook-signing-secret` | Eng lead | AWS Parameter Store (`your-aws-profile`, `us-east-1`) |
| Register Linear webhook URL | Eng lead | Linear → Settings → API → Webhooks |
| Register GitHub webhook URL | Eng lead | GitHub → Org → Settings → Webhooks |

These steps are out of scope for autonomous agent changes. Document completion in a Linear comment on AGENT-36 or the relevant infrastructure issue.

---

## Troubleshooting

**`mcpd status` shows `starting`:**
The daemon is still initializing or SQLite is unavailable. Check `~/Library/Logs/riddim-mcp/mcpd.err` and follow the [recovery steps in the mcpd runbook](../../mcp/docs/operations/runbook.md#recovering-from-a-stuck-sqlite-mcpd-repair---force).

**`symphonyd` falls back to standalone immediately:**
Check that `coordinator.url` is reachable: `curl -s http://127.0.0.1:8785/healthz`. If unreachable, verify `mcpd` is running and bound to port 8785 (or the configured `RIDDIM_MCP_PORT`).

**Port 8785 conflicts with a `symphonyd` worker:**
See the [port collision section](../../mcp/docs/operations/runbook.md#port-collisions) in the mcpd runbook.

**Worker appears in snapshot but no issues are dispatched:**
Confirm the coordinator worker mode feature flag is enabled in `symphonyd` (AUTO-779). Until that flag is active, `symphonyd` ignores coordinator assignments even when registered.
