#!/usr/bin/env bash
set -euo pipefail

REPO=""

usage() {
    echo "Usage: $0 --repo <name>"
    echo ""
    echo "Options:"
    echo "  --repo <name>  Repository name (required). Derives label and plist path."
    echo ""
    echo "Examples:"
    echo "  $0 --repo agent-config"
    echo "  $0 --repo epac"
    exit 1
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --repo)
            REPO="${2:?--repo requires an argument}"
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

if [[ -z "$REPO" ]]; then
    echo "Error: --repo is required"
    usage
fi

LABEL="com.riddimsoftware.symphonyd.$REPO"
PLIST_DEST="$HOME/Library/LaunchAgents/$LABEL.plist"
USER_UID=$(id -u)

echo "Uninstalling symphonyd launchd agent for repo: $REPO"
echo "  Label: $LABEL"

if launchctl list "$LABEL" &>/dev/null; then
    launchctl bootout "gui/$USER_UID/$LABEL"
    echo "  Agent stopped and unregistered."
else
    echo "  Agent not currently loaded, skipping bootout."
fi

if [[ -f "$PLIST_DEST" ]]; then
    rm -f "$PLIST_DEST"
    echo "  Plist removed: $PLIST_DEST"
else
    echo "  Plist not found: $PLIST_DEST"
fi

echo ""
echo "Done. Log directory preserved at: $HOME/Library/Logs/symphonyd/$REPO/"
echo "To remove logs manually: rm -rf $HOME/Library/Logs/symphonyd/$REPO/"
