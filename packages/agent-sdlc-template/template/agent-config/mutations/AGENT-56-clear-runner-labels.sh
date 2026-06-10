#!/usr/bin/env bash
# AGENT-56: Delete hosted-runner RUNNER_LABELS vars from portal-door, riddim-release, sonnio.
# These variables override the safe self-hosted template default with hosted-runner labels,
# causing CI to fail with a payments error on private repos.
#
# Vars to delete (repos will then inherit the self-hosted template default):
#   portal-door:    RUNNER_LABELS_LINUX (was ["ubuntu-latest"])
#   riddim-release: RUNNER_LABELS_MAC   (was ["macos-15"])
#   riddim-release: RUNNER_LABELS_LINUX (was ["ubuntu-latest"])
#   sonnio:         RUNNER_LABELS_LINUX (was ["ubuntu-latest"])
#
# Usage: GH_TOKEN=<org-scoped-token> DRY_RUN=true ./AGENT-56-clear-runner-labels.sh

set -euo pipefail

if [[ -z "${GH_TOKEN:-}" ]]; then
  echo "Error: GH_TOKEN environment variable is not set." >&2
  exit 1
fi

DRY_RUN="${DRY_RUN:-false}"
REASON="${REASON:-No reason provided}"

log_summary() {
  local msg="$1"
  echo "$msg"
  if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
    echo "$msg" >> "$GITHUB_STEP_SUMMARY"
  fi
}

log_summary "## AGENT-56: Clear hosted-runner RUNNER_LABELS vars"
log_summary "- **Dry Run**: $DRY_RUN"
log_summary "- **Reason**: $REASON"
log_summary ""
log_summary "### Phase 1: Deletion"

# Idempotent: checks existence before deleting; skips if already absent.
delete_var() {
  local repo="$1"
  local var="$2"
  local http_status
  http_status=$(gh api "repos/YourGithubOrg/${repo}/actions/variables/${var}" \
    -w "%{http_code}" --silent 2>/dev/null || echo "000")

  if [[ "$http_status" == "404" ]]; then
    log_summary "- :white_check_mark: \`${repo}/${var}\` — already absent, nothing to do."
  elif [[ "$http_status" == "200" ]]; then
    if [[ "$DRY_RUN" == "true" ]]; then
      log_summary "- [DRY RUN] Would delete \`${repo}/${var}\`."
    else
      gh api --method DELETE "repos/YourGithubOrg/${repo}/actions/variables/${var}" > /dev/null
      log_summary "- :wastebasket: Deleted \`${repo}/${var}\` (inherits self-hosted default)."
    fi
  else
    log_summary "- :warning: Unexpected status ${http_status} for \`${repo}/${var}\`. Skipping."
    return 1
  fi
}

delete_var "portal-door"    "RUNNER_LABELS_LINUX"
delete_var "riddim-release" "RUNNER_LABELS_MAC"
delete_var "riddim-release" "RUNNER_LABELS_LINUX"
delete_var "sonnio"         "RUNNER_LABELS_LINUX"

log_summary ""
log_summary "### Phase 2: Org-wide verification scan"
log_summary "Scanning all private repos for remaining hosted-runner RUNNER_LABELS vars..."

SCAN_RESULT=""
for r in PleasePlay agent-config aso autopilot baseball blindfold bubble-bop chill \
         doubledozen evidence lab mcp portal-door reach riddim-release riddim-website \
         s2s skills software-factory sonnio; do
  row=$(gh api "repos/YourGithubOrg/${r}/actions/variables" \
    --jq ".variables[] | select(.name|test(\"RUNNER_LABELS\")) | \"${r} \(.name)=\(.value)\"" \
    2>/dev/null || true)
  if [[ -n "$row" ]]; then
    SCAN_RESULT+="${row}"$'\n'
  fi
done

HOSTED=$(printf '%s' "$SCAN_RESULT" | grep -iE "macos-[0-9]|ubuntu-|windows-" || true)

if [[ -z "$HOSTED" ]]; then
  log_summary "- :white_check_mark: **Zero hosted-runner labels found. Org-wide invariant satisfied.**"
else
  log_summary "- :x: **Remaining hosted-runner labels found:**"
  log_summary '```'
  log_summary "$HOSTED"
  log_summary '```'
  exit 1
fi

log_summary ""
log_summary "**Mutation AGENT-56 completed successfully.**"
