#!/usr/bin/env bash
set -euo pipefail

PLIST_DEST="$HOME/Library/LaunchAgents/com.cloudflare.cloudflared.plist"
LABEL="com.cloudflare.cloudflared"
USER_UID=$(id -u)

echo "Uninstalling cloudflared tunnel agent..."

# Stop and unload
launchctl bootout "gui/$USER_UID/$LABEL" 2>/dev/null && echo "  Agent stopped." || echo "  Agent was not running."

# Remove plist
if [[ -f "$PLIST_DEST" ]]; then
    rm -f "$PLIST_DEST"
    echo "  Plist removed: $PLIST_DEST"
else
    echo "  Plist not found (already removed)."
fi

echo ""
echo "Done. ~/.cloudflared/ and logs in ~/Library/Logs/cloudflared/ are preserved."
echo "To remove credentials: rm -rf ~/.cloudflared/"
echo "To remove logs:        rm -rf ~/Library/Logs/cloudflared/"
