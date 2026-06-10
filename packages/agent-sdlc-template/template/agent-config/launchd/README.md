# symphonyd launchd Agent

Runs `symphonyd` as a macOS LaunchAgent per repo with auto-restart on crash and structured log routing.

Each supervised repo gets its own deterministic LaunchAgent label, working directory, and log paths so multiple `symphonyd` instances do not collide.

## Files

| File | Purpose |
|---|---|
| `launchd/com.riddimsoftware.symphonyd.plist` | LaunchAgent plist template (placeholders rendered by install script) |
| `scripts/install-symphonyd-launchd.sh` | Renders the plist for a repo, installs it, and starts the agent |
| `scripts/uninstall-symphonyd-launchd.sh` | Stops the agent for a repo and removes its plist |
| `scripts/status-symphonyd-launchd.sh` | Reports loaded state, PID, cwd, and log paths for all repo daemons |

## Install

Each repo requires its own install invocation. The `--repo` argument is mandatory.

```sh
# Install for agent-config (uses ~/code/agent-config/WORKFLOW.md by default)
./scripts/install-symphonyd-launchd.sh --repo agent-config

# Install for epac
./scripts/install-symphonyd-launchd.sh --repo epac

# Custom workflow path
./scripts/install-symphonyd-launchd.sh --repo autopilot --workflow-path /path/to/WORKFLOW.md
```

**Before installing:** stop any manually launched `symphonyd` instance for that repo. After install, launchd owns the daemon — do not re-launch manually. To run manually again:

```sh
launchctl bootout gui/$(id -u)/com.riddimsoftware.symphonyd.<repo>
```

## Uninstall

```sh
./scripts/uninstall-symphonyd-launchd.sh --repo agent-config
./scripts/uninstall-symphonyd-launchd.sh --repo epac
```

Log directories are preserved on uninstall.

## Status

```sh
# Show all symphonyd per-repo daemons
./scripts/status-symphonyd-launchd.sh

# Show a specific repo
./scripts/status-symphonyd-launchd.sh --repo epac
```

Output includes: label, loaded state, PID (if running), last exit status, working directory, workflow path, and last log line.

## Log paths

Logs are routed per repo under `~/Library/Logs/symphonyd/<repo>/`:

| Repo | Stdout | Stderr |
|---|---|---|
| `agent-config` | `~/Library/Logs/symphonyd/agent-config/symphonyd.out.log` | `~/Library/Logs/symphonyd/agent-config/symphonyd.err.log` |
| `epac` | `~/Library/Logs/symphonyd/epac/symphonyd.out.log` | `~/Library/Logs/symphonyd/epac/symphonyd.err.log` |

```sh
# Tail logs for a specific repo
tail -f ~/Library/Logs/symphonyd/agent-config/symphonyd.out.log
tail -f ~/Library/Logs/symphonyd/epac/symphonyd.err.log
```

## Verify agents are running

```sh
launchctl list | grep 'com\.riddimsoftware\.symphonyd\.'
# Expect one line per repo: <PID>  0  com.riddimsoftware.symphonyd.<repo>

# Or use the status script for more detail:
./scripts/status-symphonyd-launchd.sh
```

## Label scheme

Each daemon label is deterministic and repo-specific:

```
com.riddimsoftware.symphonyd.<repo>
```

Plist files installed to `~/Library/LaunchAgents/`:

```
com.riddimsoftware.symphonyd.agent-config.plist
com.riddimsoftware.symphonyd.epac.plist
```

This prevents collision between multiple `symphonyd` instances in launchd.

## KeepAlive behavior

The agent uses `KeepAlive = { SuccessfulExit: false, Crashed: true }` with a
`ThrottleInterval` of 30 seconds. This means:

- **Crash** → restarted after 30 seconds
- **Normal exit** (e.g. `--once` or graceful shutdown) → not restarted
- **Tight crash loops** → throttled to at most one restart per 30 seconds

## Working directory

Each plist sets `WorkingDirectory` to the repo checkout root (e.g. `~/code/agent-config`). This controls the cwd that `symphonyd` inherits, which affects relative file resolution in the Symphony workflow runtime.

## Environment variables

The plist sets:

- `PATH`: includes `/YOUR/WORKSPACE/DIR/agent-config/bin` and `/opt/homebrew/bin` so shared helpers such as `agent-worktree` and `gh-app-token` are available.
- `AWS_PROFILE`: `your-aws-profile`

If Symphony requires additional env vars, add them to the `EnvironmentVariables` dict in the plist template and re-run the install script for each repo.

## Plist placeholders

The template (`launchd/com.riddimsoftware.symphonyd.plist`) uses these placeholders, rendered by `install-symphonyd-launchd.sh`:

| Placeholder | Rendered value |
|---|---|
| `LABEL_PLACEHOLDER` | `com.riddimsoftware.symphonyd.<repo>` |
| `WORKFLOW_PATH_PLACEHOLDER` | `<code-dir>/<repo>/WORKFLOW.md` |
| `WORKING_DIR_PLACEHOLDER` | `<code-dir>/<repo>` |
| `LOG_OUT_PLACEHOLDER` | `~/Library/Logs/symphonyd/<repo>/symphonyd.out.log` |
| `LOG_ERR_PLACEHOLDER` | `~/Library/Logs/symphonyd/<repo>/symphonyd.err.log` |

## Validation (without launchctl)

Repository-local plist rendering can be verified without mutating host launchd state:

```sh
./tests/test-symphonyd-plist-render.sh
```

This test renders plists for `agent-config` and `epac` into a temp directory and asserts that all placeholders are replaced, labels are repo-specific, and paths do not cross-contaminate between repos.

## Cloudflare Tunnel (cloudflared)

`com.cloudflare.cloudflared.plist` runs `cloudflared tunnel run` as a LaunchAgent
so the public webhook receiver (`symphony-webhooks.riddim.dev`) restarts automatically.

| File | Purpose |
|---|---|
| `launchd/com.cloudflare.cloudflared.plist.template` | LaunchAgent plist template (rendered by install script) |
| `launchd/cloudflared-config.yml.template` | Tunnel config template (rendered by install script) |
| `scripts/install-cloudflared-tunnel.sh` | Renders both templates, installs plist, starts the agent |
| `scripts/uninstall-cloudflared-tunnel.sh` | Stops the agent and removes the plist |

See [`docs/symphony-webhook-receiver-runbook.md`](../docs/symphony-webhook-receiver-runbook.md)
for the full operational guide including DNS setup, secret rotation, and the
laptop-sleep replay procedure.
