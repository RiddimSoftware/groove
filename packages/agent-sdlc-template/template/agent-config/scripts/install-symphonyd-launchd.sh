#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLIST_TEMPLATE="$SCRIPT_DIR/../launchd/com.riddimsoftware.symphonyd.plist"

REPO=""
CODE_DIR="$HOME/code"
WORKFLOW_PATH=""

usage() {
    echo "Usage: $0 --repo <name> [--workflow-path <abs-path>] [--code-dir <dir>]"
    echo ""
    echo "Options:"
    echo "  --repo <name>               Repository name (required). Sets label, cwd, and log paths."
    echo "  --workflow-path <abs-path>  Path to WORKFLOW.md (default: <code-dir>/<repo>/WORKFLOW.md)"
    echo "  --code-dir <dir>            Parent directory containing repo checkouts (default: $HOME/code)"
    echo ""
    echo "Examples:"
    echo "  $0 --repo agent-config"
    echo "  $0 --repo epac"
    echo "  $0 --repo autopilot --workflow-path /custom/path/WORKFLOW.md"
    exit 1
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --repo)
            REPO="${2:?--repo requires an argument}"
            shift 2
            ;;
        --workflow-path)
            WORKFLOW_PATH="${2:?--workflow-path requires an argument}"
            shift 2
            ;;
        --code-dir)
            CODE_DIR="${2:?--code-dir requires an argument}"
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

REPO_DIR="$CODE_DIR/$REPO"
LABEL="com.riddimsoftware.symphonyd.$REPO"
PLIST_DEST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG_DIR="$HOME/Library/Logs/symphonyd/$REPO"
LOG_OUT="$LOG_DIR/symphonyd.out.log"
LOG_ERR="$LOG_DIR/symphonyd.err.log"

if [[ -z "$WORKFLOW_PATH" ]]; then
    WORKFLOW_PATH="$REPO_DIR/WORKFLOW.md"
fi

if [[ ! -d "$REPO_DIR" ]]; then
    echo "Error: repo directory does not exist: $REPO_DIR"
    exit 1
fi

if [[ ! -f "$WORKFLOW_PATH" ]]; then
    echo "Error: workflow path does not exist: $WORKFLOW_PATH"
    exit 1
fi

echo "Installing symphonyd launchd agent for repo: $REPO"
echo "  Label:         $LABEL"
echo "  Working dir:   $REPO_DIR"
echo "  Workflow path: $WORKFLOW_PATH"
echo "  Log directory: $LOG_DIR"

mkdir -p "$LOG_DIR"

sed \
    -e "s|LABEL_PLACEHOLDER|$LABEL|g" \
    -e "s|WORKFLOW_PATH_PLACEHOLDER|$WORKFLOW_PATH|g" \
    -e "s|WORKING_DIR_PLACEHOLDER|$REPO_DIR|g" \
    -e "s|LOG_OUT_PLACEHOLDER|$LOG_OUT|g" \
    -e "s|LOG_ERR_PLACEHOLDER|$LOG_ERR|g" \
    "$PLIST_TEMPLATE" > "$PLIST_DEST"
echo "  Plist installed: $PLIST_DEST"

USER_UID=$(id -u)

launchctl bootout "gui/$USER_UID/$LABEL" 2>/dev/null || true

launchctl bootstrap "gui/$USER_UID" "$PLIST_DEST"
echo "  Agent bootstrapped."

launchctl kickstart "gui/$USER_UID/$LABEL"
echo "  Agent started."

echo ""
echo "Done. Next steps:"
echo "  Tail logs:   tail -f $LOG_OUT"
echo "  Error logs:  tail -f $LOG_ERR"
echo "  Status:      $(dirname "$0")/status-symphonyd-launchd.sh --repo $REPO"
echo "  Stop:        launchctl bootout gui/$USER_UID/$LABEL"
echo ""
echo "IMPORTANT: If you have a manually launched symphonyd instance for '$REPO' running,"
echo "stop it before running this script to avoid conflicts."
echo "After install, launchd owns the daemon — do not re-launch manually."
echo "To run manually again, first: launchctl bootout gui/$USER_UID/$LABEL"
