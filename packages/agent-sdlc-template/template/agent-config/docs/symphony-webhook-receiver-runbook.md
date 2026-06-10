# Symphony Webhook Receiver Runbook (AGENT-8)

This runbook covers the Cloudflare Tunnel that exposes `symphonyd`'s webhook receiver to the public internet. For endpoint paths, signature headers, and the durable provider inbox, see [`provider-webhook-relay-runbook.md`](provider-webhook-relay-runbook.md).

## Public hostname

```
https://symphony-webhooks.riddim.dev
```

This hostname resolves through Cloudflare Tunnel to `http://localhost:4779` on the symphonyd host. TLS termination is handled by Cloudflare; `symphonyd` receives plain HTTP on localhost.

## Prerequisites (one-time, human-gated)

These steps require org-admin access and are performed once per host.

### 1. Install cloudflared

```sh
brew install cloudflare/cloudflare/cloudflared
```

### 2. Authenticate with Cloudflare

```sh
cloudflared tunnel login
```

This opens a browser, asks you to select a Cloudflare zone (`riddim.dev`), and downloads `~/.cloudflared/cert.pem`. The cert is your host's identity credential — keep it in `~/.cloudflared/` and do not commit it.

### 3. Create the tunnel

```sh
cloudflared tunnel create symphony-webhooks
```

This creates a tunnel and writes credentials to `~/.cloudflared/<tunnel-id>.json`. Record the tunnel ID printed by this command — you'll need it to verify later, though the install script uses the tunnel name, not the ID.

### 4. Register DNS

```sh
cloudflared tunnel route dns symphony-webhooks symphony-webhooks.riddim.dev
```

This creates a CNAME in Cloudflare DNS pointing `symphony-webhooks.riddim.dev` at the tunnel's `cfargotunnel.com` address. DNS changes propagate within a few minutes.

## Install the launchd agent

```sh
# From the agent-config repo root:
./scripts/install-cloudflared-tunnel.sh --tunnel-name symphony-webhooks
```

The script:
1. Renders `launchd/cloudflared-config.yml.template` → `~/.cloudflared/config.yml` (substitutes tunnel name)
2. Renders `launchd/com.cloudflare.cloudflared.plist.template` → `~/Library/LaunchAgents/com.cloudflare.cloudflared.plist` (substitutes `$HOME` and the resolved `cloudflared` binary path — works on both Apple Silicon and Intel Macs)
3. Bootstraps and starts the LaunchAgent

## Start / stop the tunnel

```sh
# Stop
launchctl bootout "gui/$(id -u)/com.cloudflare.cloudflared"

# Start (plist must already be installed)
launchctl bootstrap "gui/$(id -u)" ~/Library/LaunchAgents/com.cloudflare.cloudflared.plist
launchctl kickstart "gui/$(id -u)/com.cloudflare.cloudflared"

# Status
launchctl list | grep cloudflared
# Expect: <PID>  0  com.cloudflare.cloudflared
```

To remove the agent entirely:

```sh
./scripts/uninstall-cloudflared-tunnel.sh
```

## Verify end-to-end reachability

Run this from any network that is **not** the symphonyd host's local LAN:

```sh
curl -sf https://symphony-webhooks.riddim.dev/health
# Expected: HTTP 200 with Symphony health JSON, e.g. {"status":"ok","version":"..."}
```

From the host itself you can also hit localhost directly to rule out tunnel issues:

```sh
curl -sf http://localhost:4779/health
```

## Inspect tunnel logs

| Stream | Path |
|---|---|
| stdout | `~/Library/Logs/cloudflared/cloudflared.out.log` |
| stderr | `~/Library/Logs/cloudflared/cloudflared.err.log` |

```sh
tail -f ~/Library/Logs/cloudflared/cloudflared.out.log
tail -f ~/Library/Logs/cloudflared/cloudflared.err.log
```

cloudflared logs connection state, reconnection events, and per-request proxy activity to stdout. Authentication errors and fatal startup failures appear on stderr.

## Credentials and secrets layout

| Artifact | Location | Committed? |
|---|---|---|
| Cloudflare auth cert | `~/.cloudflared/cert.pem` | No |
| Tunnel credentials | `~/.cloudflared/<tunnel-id>.json` | No |
| Rendered tunnel config | `~/.cloudflared/config.yml` | No |
| Config template | `launchd/cloudflared-config.yml.template` | Yes |
| LaunchAgent plist template | `launchd/com.cloudflare.cloudflared.plist.template` | Yes |
| Rendered LaunchAgent plist | `~/Library/LaunchAgents/com.cloudflare.cloudflared.plist` | No |

To restore credentials on a new host: re-run `cloudflared tunnel login` to obtain a fresh `cert.pem`, then verify the tunnel exists in your Cloudflare Zero Trust dashboard. The tunnel's credentials JSON (`<tunnel-id>.json`) must also be present; it can be re-generated via `cloudflared tunnel token --cred-file ~/.cloudflared/<tunnel-id>.json <tunnel-name>`.

> **Multiple tunnels:** if the host has credentials JSON files for more than one tunnel (multiple `~/.cloudflared/*.json` files), cloudflared may pick the wrong one when `credentials-file` is not set explicitly. In that case, add `credentials-file: /Users/<you>/.cloudflared/<tunnel-id>.json` to `~/.cloudflared/config.yml` after running the install script. This is uncommon on a single-operator developer laptop.

## Webhook signing secrets (AWS Parameter Store)

All four webhook signing secrets are stored in AWS Parameter Store under profile `your-aws-profile`, region `us-east-1`:

| Provider | Parameter name |
|---|---|
| Linear | `/symphony/linear-webhook-signing-secret` |
| GitHub | `/symphony/github-webhook-signing-secret` |
| App Store Connect | `/symphony/asc-webhook-signing-secret` _(reserved)_ |
| Sentry | `/symphony/sentry-webhook-signing-secret` _(reserved)_ |

### Read a parameter value

```sh
aws ssm get-parameter \
  --name /symphony/linear-webhook-signing-secret \
  --with-decryption \
  --profile your-aws-profile \
  --region us-east-1 \
  --query 'Parameter.Value' \
  --output text
```

### Rotate a signing secret

1. Generate and store a new secret value:

```sh
PARAMETER_NAME="/symphony/linear-webhook-signing-secret"   # change per provider
NEW_SECRET=$(openssl rand -hex 32)

aws ssm put-parameter \
  --name "$PARAMETER_NAME" \
  --value "$NEW_SECRET" \
  --type SecureString \
  --overwrite \
  --profile your-aws-profile \
  --region us-east-1
```

2. Update the webhook signing secret in the provider's console to match `$NEW_SECRET` (Linear Settings → API → Webhooks, or GitHub App settings).

3. Restart symphonyd so it re-reads the parameter from Parameter Store:

```sh
# If running under launchd:
launchctl bootout "gui/$(id -u)/com.riddimsoftware.symphonyd"
launchctl bootstrap "gui/$(id -u)" ~/Library/LaunchAgents/com.riddimsoftware.symphonyd.plist
launchctl kickstart "gui/$(id -u)/com.riddimsoftware.symphonyd"

# Verify it came back:
launchctl list | grep symphonyd
curl -sf http://localhost:4779/health
```

> **Order matters:** update the provider's secret before restarting symphonyd to minimize the window where in-flight deliveries are rejected with a signature mismatch.

## Laptop-sleep failure mode

The symphonyd host is a developer laptop. When the laptop sleeps or the user logs out, all in-flight webhook deliveries fail silently — providers record the delivery as failed and enter their retry cycle.

**What happens:** the Cloudflare Tunnel stays registered in DNS but cloudflared (a LaunchAgent) stops when the user logs out. Inbound HTTP requests time out at the Cloudflare edge; providers receive a 5xx or timeout error.

**Mitigation — provider replay UIs:**

| Provider | Replay UI | Retry window |
|---|---|---|
| GitHub | GitHub App settings → Advanced → Recent Deliveries → Redeliver | 72 hours |
| Linear | Linear Settings → API → Webhooks → [webhook] → Recent Deliveries → Retry | ~24 hours |
| App Store Connect | No replay UI — events must be re-triggered manually (e.g. re-submit a build review) | None |
| Sentry | Sentry Settings → Integrations → [integration] → Webhook → Recent Deliveries → Retry | ~24 hours |

After the laptop wakes and symphonyd restarts, use the replay UI for each provider to redeliver any missed events. The durable provider inbox deduplicates by delivery ID, so replaying is always safe.

**LaunchAgent vs LaunchDaemon:** this plist installs as a user LaunchAgent (`~/Library/LaunchAgents/`), which means cloudflared stops when the user logs out. If the host is ever used in headless or multi-user modes, migrate to a system LaunchDaemon (`/Library/LaunchDaemons/`) run as `_cloudflared` or another dedicated service account. That change requires root to install and is out of scope for the current developer-laptop deployment.

## Cloudflare Zero Trust access policy (optional hardening)

Cloudflare Tunnel can be fronted by a Zero Trust access policy to restrict which source IPs or identities can reach `/webhook/*`. This is not required for provider webhooks (providers use HMAC signatures for integrity), but it reduces noise from public internet scanners. Configure via the Cloudflare Zero Trust dashboard under Networks → Tunnels → [tunnel] → Public Hostnames.
