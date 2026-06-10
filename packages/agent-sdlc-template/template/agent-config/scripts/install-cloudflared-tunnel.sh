#!/usr/bin/env bash
set -euo pipefail

TUNNEL_NAME=""
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLIST_TEMPLATE="$SCRIPT_DIR/../launchd/com.cloudflare.cloudflared.plist.template"
CONFIG_TEMPLATE="$SCRIPT_DIR/../launchd/cloudflared-config.yml.template"
PLIST_DEST="$HOME/Library/LaunchAgents/com.cloudflare.cloudflared.plist"
CONFIG_DEST="$HOME/.cloudflared/config.yml"
LOG_DIR="$HOME/Library/Logs/cloudflared"
LABEL="com.cloudflare.cloudflared"

usage() {
    echo "Usage: $0 --tunnel-name <name>"
    echo ""
    echo "Options:"
    echo "  --tunnel-name <name>  Name of the Cloudflare Tunnel (from 'cloudflared tunnel list')"
    echo ""
    echo "Prerequisites:"
    echo "  1. cloudflared installed: brew install cloudflare/cloudflare/cloudflared"
    echo "  2. Authenticated:         cloudflared tunnel login"
    echo "  3. Tunnel created:        cloudflared tunnel create symphony-webhooks"
    echo "  4. DNS route created:     cloudflared tunnel route dns <name> symphony-webhooks.riddim.dev"
    exit 1
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --tunnel-name)
            TUNNEL_NAME="${2:?--tunnel-name requires an argument}"
            shift 2
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo "Unknown argument: $1"
            usage
            ;;
    esac
done

if [[ -z "$TUNNEL_NAME" ]]; then
    echo "Error: --tunnel-name is required"
    usage
fi

# Resolve cloudflared binary — works on both Apple Silicon (/opt/homebrew/bin)
# and Intel (/usr/local/bin) Macs.
if ! CLOUDFLARED_BIN=$(command -v cloudflared 2>/dev/null); then
    echo "Error: cloudflared not found. Install with: brew install cloudflare/cloudflare/cloudflared"
    exit 1
fi

if [[ ! -f "$HOME/.cloudflared/cert.pem" ]]; then
    echo "Error: ~/.cloudflared/cert.pem not found."
    echo "Authenticate first: cloudflared tunnel login"
    exit 1
fi

# Verify tunnel credentials JSON exists. cloudflared writes one JSON file per
# tunnel to ~/.cloudflared/ after 'cloudflared tunnel create'. Without it the
# daemon starts but immediately exits with an auth error.
shopt -s nullglob
cred_files=("$HOME"/.cloudflared/*.json)
shopt -u nullglob
if [[ ${#cred_files[@]} -eq 0 ]]; then
    echo "Error: no tunnel credentials JSON found in ~/.cloudflared/"
    echo "Either create a new tunnel:"
    echo "  cloudflared tunnel create $TUNNEL_NAME"
    echo "Or restore an existing credential file — see 'Credentials and secrets layout'"
    echo "in docs/symphony-webhook-receiver-runbook.md."
    exit 1
fi

echo "Installing cloudflared tunnel agent..."
echo "  Tunnel name:    $TUNNEL_NAME"
echo "  cloudflared:    $CLOUDFLARED_BIN"
echo "  Hostname:       symphony-webhooks.riddim.dev"
echo "  Credentials:    ${cred_files[*]}"

# Create required directories
mkdir -p "$LOG_DIR"
mkdir -p "$HOME/.cloudflared"
mkdir -p "$HOME/Library/LaunchAgents"
echo "  Log directory: $LOG_DIR"

# Render config.yml (substitutes TUNNEL_NAME_PLACEHOLDER)
if [[ -f "$CONFIG_DEST" ]]; then
    echo "  Backing up existing config: ${CONFIG_DEST}.bak"
    cp -f "$CONFIG_DEST" "${CONFIG_DEST}.bak"
fi
sed "s|TUNNEL_NAME_PLACEHOLDER|$TUNNEL_NAME|g" "$CONFIG_TEMPLATE" > "$CONFIG_DEST"
echo "  Config installed: $CONFIG_DEST"

# Render plist (substitutes HOME_PLACEHOLDER and CLOUDFLARED_BIN_PLACEHOLDER)
# Escape HOME for sed (handles paths with slashes)
HOME_ESC="${HOME//\//\\/}"
BIN_ESC="${CLOUDFLARED_BIN//\//\\/}"
sed \
    -e "s|HOME_PLACEHOLDER|$HOME_ESC|g" \
    -e "s|CLOUDFLARED_BIN_PLACEHOLDER|$BIN_ESC|g" \
    "$PLIST_TEMPLATE" > "$PLIST_DEST"
echo "  Plist installed: $PLIST_DEST"

USER_UID=$(id -u)

# Unload existing agent if present
launchctl bootout "gui/$USER_UID/$LABEL" 2>/dev/null || true

# Bootstrap and start
launchctl bootstrap "gui/$USER_UID" "$PLIST_DEST"
launchctl kickstart "gui/$USER_UID/$LABEL"
echo "  Agent bootstrapped and started."

echo ""
echo "Done. Verify the tunnel:"
echo "  Status:      launchctl list | grep cloudflared"
echo "  Logs:        tail -f $LOG_DIR/cloudflared.out.log"
echo "  Smoke test:  curl -sf https://symphony-webhooks.riddim.dev/health"
echo ""
echo "DNS propagation may take a few minutes after first setup."
