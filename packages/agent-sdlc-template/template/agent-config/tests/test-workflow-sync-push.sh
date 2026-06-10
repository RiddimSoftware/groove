#!/bin/bash
set -euo pipefail

ROOT="$(cd -P "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

FAKE_BIN="$TMP_DIR/fake"
REPO_DIR="$TMP_DIR/repo"
LOG="$TMP_DIR/log"
mkdir -p "$FAKE_BIN" "$REPO_DIR"

cat > "$FAKE_BIN/aws" <<'SH'
#!/bin/bash
case "$*" in
  *agent-loop/workflow-sync-app-id*) printf '3537341' ;;
  *agent-loop/workflow-sync-private-key*) printf 'fake-private-key' ;;
  *) exit 1 ;;
esac
SH
chmod +x "$FAKE_BIN/aws"

cat > "$FAKE_BIN/curl" <<'SH'
#!/bin/bash
url="${@: -1}"
case "$url" in
  https://api.github.com/app) printf '{"slug":"riddim-release"}' ;;
  https://api.github.com/repos/YourGithubOrg/agent-config/installation) printf '{"id":127940904,"repository_selection":"selected","permissions":{"contents":"write","workflows":"write"}}' ;;
  https://api.github.com/repos/YourGithubOrg/bettrack/installation) printf '{"id":127940904,"repository_selection":"selected","permissions":{"contents":"write","workflows":"write"}}' ;;
  https://api.github.com/app/installations/127940904/access_tokens) printf '{"token":"workflow-sync-token"}' ;;
  *) exit 1 ;;
esac
SH
chmod +x "$FAKE_BIN/curl"

cat > "$FAKE_BIN/jq" <<'SH'
#!/bin/bash
input="$(cat)"
case "$*" in
  *slug*) printf '%s\n' "$(sed -n 's/.*"slug":"\([^"]*\)".*/\1/p' <<< "$input")" ;;
  *repository_selection*) printf '%s\n' "$(sed -n 's/.*"repository_selection":"\([^"]*\)".*/\1/p' <<< "$input")" ;;
  *permissions.contents*) printf '%s\n' "$(sed -n 's/.*"contents":"\([^"]*\)".*/\1/p' <<< "$input")" ;;
  *permissions.workflows*) printf '%s\n' "$(sed -n 's/.*"workflows":"\([^"]*\)".*/\1/p' <<< "$input")" ;;
  *id*) printf '%s\n' "$(sed -n 's/.*"id":\([0-9]*\).*/\1/p' <<< "$input")" ;;
  *token*) printf '%s\n' "$(sed -n 's/.*"token":"\([^"]*\)".*/\1/p' <<< "$input")" ;;
  *) exit 1 ;;
esac
SH
chmod +x "$FAKE_BIN/jq"

cat > "$FAKE_BIN/openssl" <<'SH'
#!/bin/bash
case "${1:-}" in
  base64)
    cat >/dev/null
    printf 'encoded'
    ;;
  dgst)
    cat >/dev/null
    printf 'signature'
    ;;
  *)
    exit 1
    ;;
esac
SH
chmod +x "$FAKE_BIN/openssl"

git -C "$REPO_DIR" init >/dev/null
git -C "$REPO_DIR" config user.name "Test User"
git -C "$REPO_DIR" config user.email "test@example.com"
git -C "$REPO_DIR" remote add origin git@github.com:YourGithubOrg/agent-config.git
echo base > "$REPO_DIR/base.txt"
git -C "$REPO_DIR" add base.txt
git -C "$REPO_DIR" commit -m "base" >/dev/null
git -C "$REPO_DIR" branch -M main
git -C "$REPO_DIR" update-ref refs/remotes/origin/main HEAD

mkdir -p "$REPO_DIR/.github/workflows"
cat > "$REPO_DIR/.github/workflows/test.yml" <<'YML'
name: test
on: workflow_dispatch
jobs:
  noop:
    runs-on: ubuntu-latest
    steps:
      - run: echo ok
YML
git -C "$REPO_DIR" add .github/workflows/test.yml
git -C "$REPO_DIR" commit -m "allowed" >/dev/null

status_output="$(cd "$REPO_DIR" && PATH="$FAKE_BIN:/usr/bin:/bin" RIDDIM_WORKFLOW_SYNC_PUSH=1 "$ROOT/bin/workflow-sync-push" status)"
grep -F "workflow-sync push helper ready for riddim-release[bot]" <<< "$status_output" >/dev/null
grep -F "Repository selection: selected" <<< "$status_output" >/dev/null

cross_repo_status_output="$(cd "$REPO_DIR" && PATH="$FAKE_BIN:/usr/bin:/bin" RIDDIM_WORKFLOW_SYNC_PUSH=1 "$ROOT/bin/workflow-sync-push" status --repo YourGithubOrg/bettrack)"
grep -F "Working repo: YourGithubOrg/agent-config" <<< "$cross_repo_status_output" >/dev/null
grep -F "Target repo: YourGithubOrg/bettrack" <<< "$cross_repo_status_output" >/dev/null

if (cd "$REPO_DIR" && PATH="$FAKE_BIN:/usr/bin:/bin" RIDDIM_WORKFLOW_SYNC_PUSH=1 "$ROOT/bin/workflow-sync-push" push --repo YourGithubOrg/bettrack --dry-run) >"$LOG" 2>&1; then
  echo "expected cross-repo push preflight to fail" >&2
  exit 1
fi
grep -F "origin remote repo mismatch" "$LOG" >/dev/null

dry_run_output="$(cd "$REPO_DIR" && PATH="$FAKE_BIN:/usr/bin:/bin" RIDDIM_WORKFLOW_SYNC_PUSH=1 "$ROOT/bin/workflow-sync-push" push --dry-run)"
grep -F ".github/workflows/test.yml" <<< "$dry_run_output" >/dev/null
grep -F "Dry run: true" <<< "$dry_run_output" >/dev/null

cat > "$FAKE_BIN/curl" <<'SH'
#!/bin/bash
url="${@: -1}"
case "$url" in
  https://api.github.com/app) printf '{"slug":"riddim-release"}' ;;
  https://api.github.com/repos/YourGithubOrg/agent-config/installation) printf '{"id":127940904,"repository_selection":"selected","permissions":{"contents":"read","workflows":"read"}}' ;;
  *) exit 1 ;;
esac
SH
chmod +x "$FAKE_BIN/curl"

if (cd "$REPO_DIR" && PATH="$FAKE_BIN:/usr/bin:/bin" RIDDIM_WORKFLOW_SYNC_PUSH=1 "$ROOT/bin/workflow-sync-push" status) >"$LOG" 2>&1; then
  echo "expected insufficient-permission status to fail" >&2
  exit 1
fi
grep -F "contents: write" "$LOG" >/dev/null

cat > "$FAKE_BIN/curl" <<'SH'
#!/bin/bash
url="${@: -1}"
case "$url" in
  https://api.github.com/app) printf '{"slug":"riddim-release"}' ;;
  https://api.github.com/repos/YourGithubOrg/agent-config/installation) printf '{"id":127940904,"repository_selection":"selected","permissions":{"contents":"write","workflows":"write"}}' ;;
  https://api.github.com/app/installations/127940904/access_tokens) printf '{"token":"workflow-sync-token"}' ;;
  *) exit 1 ;;
esac
SH
chmod +x "$FAKE_BIN/curl"

echo note >> "$REPO_DIR/README.md"
git -C "$REPO_DIR" add README.md
git -C "$REPO_DIR" commit -m "disallowed" >/dev/null

if (cd "$REPO_DIR" && PATH="$FAKE_BIN:/usr/bin:/bin" RIDDIM_WORKFLOW_SYNC_PUSH=1 "$ROOT/bin/workflow-sync-push" push) >"$LOG" 2>&1; then
  echo "expected disallowed-path push to fail" >&2
  exit 1
fi
grep -F "README.md" "$LOG" >/dev/null
grep -F "outside the allowlist" "$LOG" >/dev/null

if (cd "$REPO_DIR" && PATH="$FAKE_BIN:/usr/bin:/bin" "$ROOT/bin/workflow-sync-push" status) >/dev/null 2>&1; then
  echo "expected opt-in requirement to be enforced" >&2
  exit 1
fi

echo "workflow-sync push helper tests passed"
