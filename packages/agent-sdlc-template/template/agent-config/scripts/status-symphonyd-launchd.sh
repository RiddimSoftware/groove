#!/usr/bin/env bash
set -euo pipefail

# Reports the launchd supervision state for one or all symphonyd per-repo daemons.
#
# Usage:
#   status-symphonyd-launchd.sh [--repo <name>]
#
# Without --repo, lists every com.riddimsoftware.symphonyd.* label and their state.

REPO=""
LABEL_PREFIX="com.riddimsoftware.symphonyd."

usage() {
    echo "Usage: $0 [--repo <name>]"
    echo ""
    echo "Options:"
    echo "  --repo <name>  Show status for a specific repo daemon only"
    echo ""
    echo "Without --repo, reports all symphonyd.* daemons known to launchd."
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

report_label() {
    local label="$1"
    local repo="${label#"$LABEL_PREFIX"}"
    local log_dir="$HOME/Library/Logs/symphonyd/$repo"
    local log_out="$log_dir/symphonyd.out.log"
    local log_err="$log_dir/symphonyd.err.log"
    local plist="$HOME/Library/LaunchAgents/$label.plist"

    echo "── $label"

    local list_output
    list_output=$(launchctl list "$label" 2>/dev/null) || true

    if [[ -z "$list_output" ]]; then
        echo "   State:      NOT LOADED"
    else
        local pid last_exit
        pid=$(echo "$list_output" | awk '/"PID"/{gsub(/[^0-9]/,"",$NF); print $NF}')
        last_exit=$(echo "$list_output" | awk '/"LastExitStatus"/{gsub(/[^0-9-]/,"",$NF); print $NF}')
        if [[ -n "$pid" && "$pid" != "0" ]]; then
            echo "   State:      RUNNING (PID $pid)"
        else
            echo "   State:      LOADED (not running, last exit: ${last_exit:-unknown})"
        fi
    fi

    if [[ -f "$plist" ]]; then
        local cwd
        cwd=$(plutil -extract WorkingDirectory raw -o - "$plist" 2>/dev/null || echo "(not set)")
        echo "   Working dir: $cwd"
        local wf
        wf=$(plutil -extract ProgramArguments.1 raw -o - "$plist" 2>/dev/null || echo "(unknown)")
        echo "   Workflow:    $wf"
    else
        echo "   Plist:      NOT FOUND ($plist)"
    fi

    echo "   Stdout log: $log_out"
    if [[ -f "$log_out" ]]; then
        echo "   (last line: $(tail -n1 "$log_out" 2>/dev/null || echo '(empty)'))"
    else
        echo "   (log file does not exist yet)"
    fi
    echo "   Stderr log: $log_err"
    if [[ -f "$log_err" ]]; then
        local last_err
        last_err=$(tail -n1 "$log_err" 2>/dev/null || echo '(empty)')
        if [[ -n "$last_err" ]]; then
            echo "   (last line: $last_err)"
        fi
    else
        echo "   (log file does not exist yet)"
    fi
    echo ""
}

if [[ -n "$REPO" ]]; then
    report_label "${LABEL_PREFIX}${REPO}"
else
    mapfile -t labels < <(launchctl list 2>/dev/null | awk '{print $3}' | grep "^${LABEL_PREFIX}" | sort)
    if [[ ${#labels[@]} -eq 0 ]]; then
        echo "No symphonyd per-repo daemons found in launchd."
        echo "Install one with: scripts/install-symphonyd-launchd.sh --repo <name>"
        exit 0
    fi
    echo "symphonyd per-repo daemon status:"
    echo ""
    for label in "${labels[@]}"; do
        report_label "$label"
    done
fi
