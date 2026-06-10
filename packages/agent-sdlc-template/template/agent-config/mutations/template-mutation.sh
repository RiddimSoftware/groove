#!/usr/bin/env bash

# template-mutation.sh
# 
# Usage: GH_TOKEN=... ./template-mutation.sh
#
# This script demonstrates an idempotent GitHub mutation.
# It uses the GitHub CLI (gh) to interact with the API.

set -euo pipefail

# --- Pre-flight Checks ---
if [[ -z "${GH_TOKEN:-}" ]]; then
  echo "Error: GH_TOKEN environment variable is not set." >&2
  exit 1
fi

# --- Configuration ---
# Use environment variables for sensitive data or dynamic configuration.
# GH_TOKEN must be provided in the environment.

# If REPO is not set, try to detect it via gh or default to the canonical repo.
if [[ -z "${REPO:-}" ]]; then
  REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "")
fi
REPO="${REPO:-YourGithubOrg/agent-config}"

ENV_NAME="production-gate"
DRY_RUN="${DRY_RUN:-false}"
REASON="${REASON:-No reason provided}"

echo "Starting mutation for repo: $REPO (DRY_RUN=$DRY_RUN)"
echo "Reason: $REASON"

# Function to log to step summary if available
log_summary() {
  local msg="$1"
  echo "$msg"
  if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
    echo "$msg" >> "$GITHUB_STEP_SUMMARY"
  fi
}

log_summary "## Mutation: $ENV_NAME"
log_summary "- **Repo**: $REPO"
log_summary "- **Dry Run**: $DRY_RUN"
log_summary "- **Reason**: $REASON"

# Verify gh is authenticated and can reach the repo
if ! gh api "repos/$REPO" --silent > /dev/null 2>&1; then
  log_summary "### :x: Error: Cannot access repository '$REPO'."
  exit 1
fi

# --- Idempotency Check ---
# ALWAYS check the current state before applying changes.
# This ensures the script can be run multiple times safely.
log_summary "### Phase 1: Idempotency Check"
echo "Checking if environment '$ENV_NAME' already exists..."

# Capture the HTTP status code of the GET request.
# 200 = exists, 404 = does not exist, other = error.
STATUS_CODE=$(gh api "repos/$REPO/environments/$ENV_NAME" --silent -w "%{http_code}" 2>/dev/null || echo "000")

if [[ "$STATUS_CODE" == "200" ]]; then
  log_summary "- :white_check_mark: Environment '$ENV_NAME' already exists. Skipping creation."
elif [[ "$STATUS_CODE" == "404" ]]; then
  # --- Application ---
  # Only apply the change if it hasn't been applied yet.
  log_summary "- :sparkles: Environment '$ENV_NAME' does not exist."

  if [[ "$DRY_RUN" == "true" ]]; then
    log_summary "- [DRY RUN] Would create environment '$ENV_NAME'."
  else
    log_summary "### Phase 2: Application"
    log_summary "- Creating environment '$ENV_NAME'..."
    
    # Example: Create an environment
    # See: https://docs.github.com/en/rest/deployments/environments#create-or-update-an-environment
    gh api \
      --method PUT \
      -H "Accept: application/vnd.github+json" \
      -H "X-GitHub-Api-Version: 2022-11-28" \
      "repos/$REPO/environments/$ENV_NAME" \
      -f "wait_timer=0" \
      > /dev/null

    log_summary "- :white_check_mark: Successfully created environment '$ENV_NAME'."
  fi
else
  log_summary "- :x: Error: Unexpected API response (HTTP $STATUS_CODE)."
  exit 1
fi

# --- Verification ---
# Optionally, perform a final check to confirm the desired state.
log_summary "### Phase 3: Verification"
if gh api "repos/$REPO/environments/$ENV_NAME" --silent > /dev/null; then
  log_summary "- :white_check_mark: Final state verified."
else
  log_summary "- :x: Final state verification failed."
  exit 1
fi

log_summary "---"
log_summary "**Mutation completed successfully.**"
