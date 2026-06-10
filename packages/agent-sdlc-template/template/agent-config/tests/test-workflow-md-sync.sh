#!/bin/bash
# Tests for bin/workflow-md-sync
# Covers: unchanged repos, changed repos, duplicate PR suppression,
#         disallowed existing sync-branch paths, and missing bot credentials.
set -euo pipefail

ROOT="$(cd -P "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

FAKE_BIN="$TMP_DIR/fake"
LOG="$TMP_DIR/log"
ENROLL="$TMP_DIR/enrollment.yaml"
SOURCE="$TMP_DIR/WORKFLOW.md"
mkdir -p "$FAKE_BIN"

printf 'managed WORKFLOW.md content v1\n' > "$SOURCE"

cat > "$ENROLL" <<'YAML'
version: 1
enrolled_repos:
  - repo: YourGithubOrg/Growth
    path: WORKFLOW.md
  - repo: YourGithubOrg/Look
    path: WORKFLOW.md
YAML

make_fake_openssl() {
  cat > "$FAKE_BIN/openssl" <<'EOS'
#!/bin/bash
case "${1:-}" in
  base64) cat >/dev/null; printf 'encoded' ;;
  dgst)   cat >/dev/null; printf 'signature' ;;
  *)      exit 1 ;;
esac
EOS
  chmod +x "$FAKE_BIN/openssl"
}

write_fake_curl() {
  cat > "$FAKE_BIN/curl"
  chmod +x "$FAKE_BIN/curl"
}

make_fake_openssl

# ── Test 1: opt-in guard ──────────────────────────────────────────────────────
if (PATH="$FAKE_BIN:/usr/bin:/bin" "$ROOT/bin/workflow-md-sync" audit \
      --source "$SOURCE" --enrollment "$ENROLL") >"$LOG" 2>&1; then
  echo "FAIL: expected opt-in guard to reject run without RIDDIM_WORKFLOW_MD_SYNC=1" >&2
  exit 1
fi
grep -F "RIDDIM_WORKFLOW_MD_SYNC=1 is required" "$LOG" >/dev/null

echo "PASS: opt-in guard"

# ── Test 2: audit mode — repos already up to date ────────────────────────────
write_fake_curl <<'EOS'
#!/bin/bash
args=("$@")
url="${args[$(( ${#args[@]} - 1 ))]}"
respond() {
  local code="$1" body="${2-}"
  printf '%s' "$body"
  printf '\n__HTTP_STATUS__%s' "$code"
}
case "$url" in
  *Growth/contents/WORKFLOW.md|*Look/contents/WORKFLOW.md)
    respond 200 'managed WORKFLOW.md content v1
' ;;
  *)
    respond 404 '' ;;
esac
EOS

if ! (RIDDIM_WORKFLOW_MD_SYNC=1 PATH="$FAKE_BIN:/usr/bin:/bin" \
      "$ROOT/bin/workflow-md-sync" audit \
      --source "$SOURCE" --enrollment "$ENROLL") >"$LOG" 2>&1; then
  cat "$LOG" >&2
  echo "FAIL: expected audit to succeed when all repos are up to date" >&2
  exit 1
fi
grep -F "Up to date (2)" "$LOG" >/dev/null

echo "PASS: audit — repos up to date"

# ── Test 3: audit mode — stale repo detected ─────────────────────────────────
write_fake_curl <<'EOS'
#!/bin/bash
args=("$@")
url="${args[$(( ${#args[@]} - 1 ))]}"
respond() {
  local code="$1" body="${2-}"
  printf '%s' "$body"
  printf '\n__HTTP_STATUS__%s' "$code"
}
case "$url" in
  *Growth/contents/WORKFLOW.md)
    respond 200 'old content
' ;;
  *Look/contents/WORKFLOW.md)
    respond 200 'managed WORKFLOW.md content v1
' ;;
  *)
    respond 404 '' ;;
esac
EOS

if (RIDDIM_WORKFLOW_MD_SYNC=1 PATH="$FAKE_BIN:/usr/bin:/bin" \
    "$ROOT/bin/workflow-md-sync" audit \
    --source "$SOURCE" --enrollment "$ENROLL") >"$LOG" 2>&1; then
  echo "FAIL: expected audit to exit non-zero when at least one repo would change" >&2
  exit 1
fi
grep -F "Would change (1)" "$LOG" >/dev/null
grep -F "YourGithubOrg/Growth" "$LOG" >/dev/null

echo "PASS: audit — stale repo detected"

# ── Test 4: audit mode — missing file counts as would-change ─────────────────
write_fake_curl <<'EOS'
#!/bin/bash
args=("$@")
url="${args[$(( ${#args[@]} - 1 ))]}"
respond() {
  local code="$1" body="${2-}"
  printf '%s' "$body"
  printf '\n__HTTP_STATUS__%s' "$code"
}
case "$url" in
  *Growth/contents/WORKFLOW.md)
    respond 404 '' ;;
  *Look/contents/WORKFLOW.md)
    respond 200 'managed WORKFLOW.md content v1
' ;;
  *)
    respond 404 '' ;;
esac
EOS

if (RIDDIM_WORKFLOW_MD_SYNC=1 PATH="$FAKE_BIN:/usr/bin:/bin" \
    "$ROOT/bin/workflow-md-sync" audit \
    --source "$SOURCE" --enrollment "$ENROLL") >"$LOG" 2>&1; then
  echo "FAIL: expected audit to exit non-zero when remote file is missing" >&2
  exit 1
fi
grep -F "YourGithubOrg/Growth" "$LOG" >/dev/null

echo "PASS: audit — missing remote file treated as would-change"

# ── Test 5: invalid managed path rejected ─────────────────────────────────────
cat > "$TMP_DIR/bad-enroll.yaml" <<'YAML'
version: 1
enrolled_repos:
  - repo: YourGithubOrg/Growth
    path: ../secrets.txt
YAML

write_fake_curl <<'EOS'
#!/bin/bash
exit 1
EOS

if (RIDDIM_WORKFLOW_MD_SYNC=1 PATH="$FAKE_BIN:/usr/bin:/bin" \
    "$ROOT/bin/workflow-md-sync" audit \
    --source "$SOURCE" --enrollment "$TMP_DIR/bad-enroll.yaml") >"$LOG" 2>&1; then
  echo "FAIL: expected invalid managed path to be rejected" >&2
  exit 1
fi
grep -F "invalid managed path" "$LOG" >/dev/null

echo "PASS: invalid managed path rejected"

# ── Test 6: sync --dry-run works without AWS credentials ─────────────────────
write_fake_curl <<'EOS'
#!/bin/bash
args=("$@")
url="${args[$(( ${#args[@]} - 1 ))]}"
respond() {
  local code="$1" body="${2-}"
  printf '%s' "$body"
  printf '\n__HTTP_STATUS__%s' "$code"
}
case "$url" in
  *Growth/contents/WORKFLOW.md)
    respond 200 'old content
' ;;
  *Look/contents/WORKFLOW.md)
    respond 200 'managed WORKFLOW.md content v1
' ;;
  *)
    respond 404 '' ;;
esac
EOS

if ! (RIDDIM_WORKFLOW_MD_SYNC=1 PATH="$FAKE_BIN:/usr/bin:/bin" \
      "$ROOT/bin/workflow-md-sync" sync --dry-run \
      --source "$SOURCE" --enrollment "$ENROLL") >"$LOG" 2>&1; then
  cat "$LOG" >&2
  echo "FAIL: expected sync --dry-run to succeed without AWS credentials" >&2
  exit 1
fi
grep -F "Would change (1)" "$LOG" >/dev/null
grep -F "YourGithubOrg/Growth" "$LOG" >/dev/null

echo "PASS: sync --dry-run works without credentials"

# ── Test 7: sync mode — missing AWS credentials rejected ─────────────────────
cat > "$FAKE_BIN/aws" <<'EOS'
#!/bin/bash
exit 1
EOS
chmod +x "$FAKE_BIN/aws"

if (RIDDIM_WORKFLOW_MD_SYNC=1 PATH="$FAKE_BIN:/usr/bin:/bin" \
    "$ROOT/bin/workflow-md-sync" sync \
    --source "$SOURCE" --enrollment "$ENROLL") >"$LOG" 2>&1; then
  echo "FAIL: expected sync to fail when AWS secrets are unavailable" >&2
  exit 1
fi
grep -iE "failed to fetch secret|error" "$LOG" >/dev/null

echo "PASS: sync rejects missing AWS credentials"

# ── Shared fakes for authenticated sync tests ─────────────────────────────────
cat > "$FAKE_BIN/aws" <<'EOS'
#!/bin/bash
case "$*" in
  *dev-bot-app-id*)      printf '%s' '99999' ;;
  *dev-bot-private-key*) printf '%s' 'fake-private-key' ;;
  *) exit 1 ;;
esac
EOS
chmod +x "$FAKE_BIN/aws"

cat > "$TMP_DIR/single-enroll.yaml" <<'YAML'
version: 1
enrolled_repos:
  - repo: YourGithubOrg/Growth
    path: WORKFLOW.md
YAML

# ── Test 8: sync --dry-run preflights and rejects disallowed sync-branch paths ──
write_fake_curl <<'EOS'
#!/bin/bash
args=("$@")
url="${args[$(( ${#args[@]} - 1 ))]}"
respond() {
  local code="$1" body="${2-}"
  printf '%s' "$body"
  printf '\n__HTTP_STATUS__%s' "$code"
}
case "$url" in
  https://api.github.com/app)
    respond 200 '{"slug":"riddim-developer-bot"}' ;;
  https://api.github.com/repos/YourGithubOrg/Growth/installation)
    respond 200 '{"id":42,"permissions":{"contents":"write","pull_requests":"write"}}' ;;
  https://api.github.com/app/installations/42/access_tokens)
    respond 201 '{"token":"tok"}' ;;
  https://api.github.com/repos/YourGithubOrg/Growth)
    respond 200 '{"default_branch":"main"}' ;;
  https://api.github.com/repos/YourGithubOrg/Growth/git/ref/heads/workflow-md-sync/managed-update)
    respond 200 '{"ref":"refs/heads/workflow-md-sync/managed-update"}' ;;
  https://api.github.com/repos/YourGithubOrg/Growth/compare/main...workflow-md-sync/managed-update)
    respond 200 '{"files":[{"filename":"README.md"}]}' ;;
  *)
    respond 404 '' ;;
esac
EOS

if (RIDDIM_WORKFLOW_MD_SYNC=1 PATH="$FAKE_BIN:/usr/bin:/bin" \
    "$ROOT/bin/workflow-md-sync" sync --dry-run \
    --source "$SOURCE" --enrollment "$TMP_DIR/single-enroll.yaml" \
    --version "test-v1") >"$LOG" 2>&1; then
  echo "FAIL: expected sync --dry-run to refuse disallowed existing sync-branch paths when auth is available" >&2
  exit 1
fi
grep -F "disallowed path 'README.md'" "$LOG" >/dev/null

echo "PASS: sync --dry-run rejects disallowed existing sync-branch paths"

# ── Test 9: sync mode — up-to-date repo skipped ──────────────────────────────
write_fake_curl <<'EOS'
#!/bin/bash
args=("$@")
method="GET"
url="${args[$(( ${#args[@]} - 1 ))]}"
for ((i=0; i<${#args[@]}; i++)); do
  if [[ "${args[$i]}" == "-X" ]]; then method="${args[$((i+1))]}"; fi
done
respond() {
  local code="$1" body="${2-}"
  printf '%s' "$body"
  printf '\n__HTTP_STATUS__%s' "$code"
}
case "$url" in
  https://api.github.com/app)
    respond 200 '{"slug":"riddim-developer-bot"}' ;;
  https://api.github.com/repos/YourGithubOrg/Growth/installation|https://api.github.com/repos/YourGithubOrg/Look/installation)
    respond 200 '{"id":42,"permissions":{"contents":"write","pull_requests":"write"}}' ;;
  https://api.github.com/app/installations/42/access_tokens)
    respond 201 '{"token":"tok"}' ;;
  https://api.github.com/repos/YourGithubOrg/Growth|https://api.github.com/repos/YourGithubOrg/Look)
    respond 200 '{"default_branch":"main"}' ;;
  *Growth/git/ref/heads/workflow-md-sync/managed-update|*Look/git/ref/heads/workflow-md-sync/managed-update)
    respond 404 '' ;;
  *Growth/pulls*state=open*|*Look/pulls*state=open*)
    respond 200 '[]' ;;
  *Growth/contents/WORKFLOW.md|*Look/contents/WORKFLOW.md)
    respond 200 'managed WORKFLOW.md content v1
' ;;
  *)
    respond 404 '' ;;
esac
EOS

if ! (RIDDIM_WORKFLOW_MD_SYNC=1 PATH="$FAKE_BIN:/usr/bin:/bin" \
      "$ROOT/bin/workflow-md-sync" sync \
      --source "$SOURCE" --enrollment "$ENROLL" --version "test-v1") >"$LOG" 2>&1; then
  cat "$LOG" >&2
  echo "FAIL: expected sync to succeed for up-to-date repos" >&2
  exit 1
fi
grep -F "Up to date (2)" "$LOG" >/dev/null
if grep -F "Updated/PR opened" "$LOG" >/dev/null 2>&1; then
  echo "FAIL: no PRs should be opened when repos are already up to date" >&2
  exit 1
fi

echo "PASS: sync skips up-to-date repos"

# ── Test 10: sync mode — stale repo opens a new PR ───────────────────────────
write_fake_curl <<'EOS'
#!/bin/bash
args=("$@")
method="GET"
url="${args[$(( ${#args[@]} - 1 ))]}"
for ((i=0; i<${#args[@]}; i++)); do
  if [[ "${args[$i]}" == "-X" ]]; then method="${args[$((i+1))]}"; fi
done
respond() {
  local code="$1" body="${2-}"
  printf '%s' "$body"
  printf '\n__HTTP_STATUS__%s' "$code"
}
case "$url" in
  https://api.github.com/app)
    respond 200 '{"slug":"riddim-developer-bot"}' ;;
  https://api.github.com/repos/YourGithubOrg/Growth/installation)
    respond 200 '{"id":42,"permissions":{"contents":"write","pull_requests":"write"}}' ;;
  https://api.github.com/app/installations/42/access_tokens)
    respond 201 '{"token":"tok"}' ;;
  https://api.github.com/repos/YourGithubOrg/Growth)
    respond 200 '{"default_branch":"main"}' ;;
  https://api.github.com/repos/YourGithubOrg/Growth/git/ref/heads/workflow-md-sync/managed-update)
    respond 404 '' ;;
  *Growth/pulls*head=YourGithubOrg:workflow-md-sync/managed-update)
    respond 200 '[]' ;;
  https://api.github.com/repos/YourGithubOrg/Growth/contents/WORKFLOW.md)
    respond 200 'old stale content
' ;;
  https://api.github.com/repos/YourGithubOrg/Growth/git/ref/heads/main)
    respond 200 '{"object":{"sha":"abc123"}}' ;;
  https://api.github.com/repos/YourGithubOrg/Growth/git/refs)
    respond 201 '{}' ;;
  https://api.github.com/repos/YourGithubOrg/Growth/contents/WORKFLOW.md?ref=workflow-md-sync/managed-update)
    respond 404 '' ;;
  https://api.github.com/repos/YourGithubOrg/Growth/pulls)
    respond 201 '{"html_url":"https://github.com/YourGithubOrg/Growth/pull/1"}' ;;
  *)
    respond 404 '' ;;
esac
EOS

if ! (RIDDIM_WORKFLOW_MD_SYNC=1 PATH="$FAKE_BIN:/usr/bin:/bin" \
      "$ROOT/bin/workflow-md-sync" sync \
      --source "$SOURCE" --enrollment "$TMP_DIR/single-enroll.yaml" \
      --version "test-v1") >"$LOG" 2>&1; then
  cat "$LOG" >&2
  echo "FAIL: expected sync to open a PR for stale repo" >&2
  exit 1
fi
grep -F "Updated/PR opened (1)" "$LOG" >/dev/null
grep -F "https://github.com/YourGithubOrg/Growth/pull/1" "$LOG" >/dev/null

echo "PASS: sync opens PR for stale repo"

# ── Test 11: sync mode — existing open PR is updated, not duplicated ────────
write_fake_curl <<'EOS'
#!/bin/bash
args=("$@")
method="GET"
url="${args[$(( ${#args[@]} - 1 ))]}"
for ((i=0; i<${#args[@]}; i++)); do
  if [[ "${args[$i]}" == "-X" ]]; then method="${args[$((i+1))]}"; fi
done
respond() {
  local code="$1" body="${2-}"
  printf '%s' "$body"
  printf '\n__HTTP_STATUS__%s' "$code"
}
case "$url" in
  https://api.github.com/app)
    respond 200 '{"slug":"riddim-developer-bot"}' ;;
  https://api.github.com/repos/YourGithubOrg/Growth/installation)
    respond 200 '{"id":42,"permissions":{"contents":"write","pull_requests":"write"}}' ;;
  https://api.github.com/app/installations/42/access_tokens)
    respond 201 '{"token":"tok"}' ;;
  https://api.github.com/repos/YourGithubOrg/Growth)
    respond 200 '{"default_branch":"main"}' ;;
  https://api.github.com/repos/YourGithubOrg/Growth/git/ref/heads/workflow-md-sync/managed-update)
    respond 200 '{"ref":"refs/heads/workflow-md-sync/managed-update"}' ;;
  https://api.github.com/repos/YourGithubOrg/Growth/compare/main...workflow-md-sync/managed-update)
    respond 200 '{"files":[{"filename":"WORKFLOW.md"}]}' ;;
  *Growth/pulls*head=YourGithubOrg:workflow-md-sync/managed-update)
    respond 200 '[{"number":7,"html_url":"https://github.com/YourGithubOrg/Growth/pull/7","user":{"login":"riddim-developer-bot[bot]"}}]' ;;
  https://api.github.com/repos/YourGithubOrg/Growth/contents/WORKFLOW.md)
    respond 200 'old stale content
' ;;
  https://api.github.com/repos/YourGithubOrg/Growth/git/ref/heads/main)
    respond 200 '{"object":{"sha":"abc123"}}' ;;
  https://api.github.com/repos/YourGithubOrg/Growth/git/refs/heads/workflow-md-sync/managed-update)
    respond 200 '{}' ;;
  https://api.github.com/repos/YourGithubOrg/Growth/contents/WORKFLOW.md?ref=workflow-md-sync/managed-update)
    respond 200 '{"sha":"blob123"}' ;;
  https://api.github.com/repos/YourGithubOrg/Growth/pulls/7)
    respond 200 '{}' ;;
  *)
    respond 404 '' ;;
esac
EOS

if ! (RIDDIM_WORKFLOW_MD_SYNC=1 PATH="$FAKE_BIN:/usr/bin:/bin" \
      "$ROOT/bin/workflow-md-sync" sync \
      --source "$SOURCE" --enrollment "$TMP_DIR/single-enroll.yaml" \
      --version "test-v1") >"$LOG" 2>&1; then
  cat "$LOG" >&2
  echo "FAIL: expected sync to update existing PR" >&2
  exit 1
fi
grep -F "updated existing PR #7" "$LOG" >/dev/null
if grep -F "opened PR: " "$LOG" >/dev/null 2>&1; then
  echo "FAIL: sync must not open a new PR when one already exists" >&2
  exit 1
fi

echo "PASS: sync updates existing open PR instead of creating a duplicate"

# ── Test 12: sync mode — disallowed existing sync-branch file is rejected ────
write_fake_curl <<'EOS'
#!/bin/bash
args=("$@")
url="${args[$(( ${#args[@]} - 1 ))]}"
respond() {
  local code="$1" body="${2-}"
  printf '%s' "$body"
  printf '\n__HTTP_STATUS__%s' "$code"
}
case "$url" in
  https://api.github.com/app)
    respond 200 '{"slug":"riddim-developer-bot"}' ;;
  https://api.github.com/repos/YourGithubOrg/Growth/installation)
    respond 200 '{"id":42,"permissions":{"contents":"write","pull_requests":"write"}}' ;;
  https://api.github.com/app/installations/42/access_tokens)
    respond 201 '{"token":"tok"}' ;;
  https://api.github.com/repos/YourGithubOrg/Growth)
    respond 200 '{"default_branch":"main"}' ;;
  https://api.github.com/repos/YourGithubOrg/Growth/git/ref/heads/workflow-md-sync/managed-update)
    respond 200 '{"ref":"refs/heads/workflow-md-sync/managed-update"}' ;;
  https://api.github.com/repos/YourGithubOrg/Growth/compare/main...workflow-md-sync/managed-update)
    respond 200 '{"files":[{"filename":"README.md"}]}' ;;
  *)
    respond 404 '' ;;
esac
EOS

if (RIDDIM_WORKFLOW_MD_SYNC=1 PATH="$FAKE_BIN:/usr/bin:/bin" \
    "$ROOT/bin/workflow-md-sync" sync \
    --source "$SOURCE" --enrollment "$TMP_DIR/single-enroll.yaml" \
    --version "test-v1") >"$LOG" 2>&1; then
  echo "FAIL: expected sync to refuse disallowed existing sync-branch paths" >&2
  exit 1
fi
grep -F "disallowed path 'README.md'" "$LOG" >/dev/null

echo "PASS: sync refuses disallowed existing sync-branch paths"

# ── Test 13: --repo flag limits work to the named repo only ──────────────────
CALLS_LOG="$TMP_DIR/calls"
: > "$CALLS_LOG"
write_fake_curl <<EOS
#!/bin/bash
args=("\$@")
url="\${args[-1]}"
printf '%s\n' "\$url" >> "$CALLS_LOG"
respond() {
  local code="\$1" body="\${2-}"
  printf '%s' "\$body"
  printf '\n__HTTP_STATUS__%s' "\$code"
}
case "\$url" in
  *Look/contents/WORKFLOW.md)
    respond 200 'managed WORKFLOW.md content v1
' ;;
  *Growth/contents/WORKFLOW.md)
    respond 200 'managed WORKFLOW.md content v1
' ;;
  *)
    respond 404 '' ;;
esac
EOS

RIDDIM_WORKFLOW_MD_SYNC=1 PATH="$FAKE_BIN:/usr/bin:/bin" \
  "$ROOT/bin/workflow-md-sync" audit \
  --source "$SOURCE" --enrollment "$ENROLL" \
  --repo YourGithubOrg/Look >"$LOG" 2>&1 || true

if grep -F "Growth" "$CALLS_LOG" >/dev/null 2>&1; then
  echo "FAIL: --repo flag should limit sync to the named repo only" >&2
  exit 1
fi

echo "PASS: --repo flag limits sync to named repo"

echo ""
echo "All workflow-md-sync tests passed"
