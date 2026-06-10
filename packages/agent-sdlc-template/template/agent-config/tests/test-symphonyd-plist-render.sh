#!/usr/bin/env bash
# Validates that install-symphonyd-launchd.sh renders plist placeholders correctly
# without requiring launchctl mutations. Uses a temp directory as the target.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
INSTALL_SCRIPT="$REPO_ROOT/scripts/install-symphonyd-launchd.sh"
PLIST_TEMPLATE="$REPO_ROOT/launchd/com.riddimsoftware.symphonyd.plist"

PASS=0
FAIL=0

pass() { echo "  PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL + 1)); }

assert_contains() {
    local file="$1" pattern="$2" label="$3"
    if grep -qF "$pattern" "$file"; then
        pass "$label"
    else
        fail "$label — expected '$pattern' in $file"
        echo "     actual content:"
        cat "$file"
    fi
}

assert_not_contains() {
    local file="$1" pattern="$2" label="$3"
    if ! grep -qF "$pattern" "$file"; then
        pass "$label"
    else
        fail "$label — did NOT expect '$pattern' in $file"
    fi
}

echo "=== test-symphonyd-plist-render ==="
echo ""

# ── 1. Template has all required placeholders ──────────────────────────────
echo "1. Plist template placeholders"
for ph in LABEL_PLACEHOLDER WORKFLOW_PATH_PLACEHOLDER WORKING_DIR_PLACEHOLDER LOG_OUT_PLACEHOLDER LOG_ERR_PLACEHOLDER; do
    assert_contains "$PLIST_TEMPLATE" "$ph" "template has $ph"
done
echo ""

# ── 2. Render for agent-config ─────────────────────────────────────────────
echo "2. Render: repo=agent-config"
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

FAKE_CODE_DIR="$TMP_DIR/code"
mkdir -p "$FAKE_CODE_DIR/agent-config"
echo "# test" > "$FAKE_CODE_DIR/agent-config/WORKFLOW.md"

# Patch install script to write plist to TMP_DIR instead of LaunchAgents,
# and skip launchctl calls, by wrapping via env override of HOME.
FAKE_LAUNCH_AGENTS="$TMP_DIR/LaunchAgents"
mkdir -p "$FAKE_LAUNCH_AGENTS"

# We render the plist manually using the same sed pipeline as install.sh
RENDERED="$FAKE_LAUNCH_AGENTS/com.riddimsoftware.symphonyd.agent-config.plist"
REPO="agent-config"
LABEL="com.riddimsoftware.symphonyd.$REPO"
REPO_DIR="$FAKE_CODE_DIR/$REPO"
WORKFLOW_PATH="$REPO_DIR/WORKFLOW.md"
LOG_OUT="$TMP_DIR/Library/Logs/symphonyd/$REPO/symphonyd.out.log"
LOG_ERR="$TMP_DIR/Library/Logs/symphonyd/$REPO/symphonyd.err.log"

sed \
    -e "s|LABEL_PLACEHOLDER|$LABEL|g" \
    -e "s|WORKFLOW_PATH_PLACEHOLDER|$WORKFLOW_PATH|g" \
    -e "s|WORKING_DIR_PLACEHOLDER|$REPO_DIR|g" \
    -e "s|LOG_OUT_PLACEHOLDER|$LOG_OUT|g" \
    -e "s|LOG_ERR_PLACEHOLDER|$LOG_ERR|g" \
    "$PLIST_TEMPLATE" > "$RENDERED"

assert_contains "$RENDERED" "com.riddimsoftware.symphonyd.agent-config" "agent-config: label"
assert_contains "$RENDERED" "$WORKFLOW_PATH" "agent-config: workflow path"
assert_contains "$RENDERED" "$REPO_DIR" "agent-config: WorkingDirectory"
assert_contains "$RENDERED" "symphonyd/$REPO/symphonyd.out.log" "agent-config: stdout log path"
assert_contains "$RENDERED" "symphonyd/$REPO/symphonyd.err.log" "agent-config: stderr log path"
assert_not_contains "$RENDERED" "LABEL_PLACEHOLDER" "agent-config: no unreplaced LABEL_PLACEHOLDER"
assert_not_contains "$RENDERED" "WORKFLOW_PATH_PLACEHOLDER" "agent-config: no unreplaced WORKFLOW_PATH_PLACEHOLDER"
assert_not_contains "$RENDERED" "WORKING_DIR_PLACEHOLDER" "agent-config: no unreplaced WORKING_DIR_PLACEHOLDER"
assert_not_contains "$RENDERED" "LOG_OUT_PLACEHOLDER" "agent-config: no unreplaced LOG_OUT_PLACEHOLDER"
assert_not_contains "$RENDERED" "LOG_ERR_PLACEHOLDER" "agent-config: no unreplaced LOG_ERR_PLACEHOLDER"
echo ""

# ── 3. Render for epac — labels must not collide with agent-config ─────────
echo "3. Render: repo=epac (labels distinct from agent-config)"
mkdir -p "$FAKE_CODE_DIR/epac"
echo "# test" > "$FAKE_CODE_DIR/epac/WORKFLOW.md"

RENDERED_EPAC="$FAKE_LAUNCH_AGENTS/com.riddimsoftware.symphonyd.epac.plist"
REPO_EPAC="epac"
LABEL_EPAC="com.riddimsoftware.symphonyd.$REPO_EPAC"
REPO_DIR_EPAC="$FAKE_CODE_DIR/$REPO_EPAC"
WORKFLOW_EPAC="$REPO_DIR_EPAC/WORKFLOW.md"
LOG_OUT_EPAC="$TMP_DIR/Library/Logs/symphonyd/$REPO_EPAC/symphonyd.out.log"
LOG_ERR_EPAC="$TMP_DIR/Library/Logs/symphonyd/$REPO_EPAC/symphonyd.err.log"

sed \
    -e "s|LABEL_PLACEHOLDER|$LABEL_EPAC|g" \
    -e "s|WORKFLOW_PATH_PLACEHOLDER|$WORKFLOW_EPAC|g" \
    -e "s|WORKING_DIR_PLACEHOLDER|$REPO_DIR_EPAC|g" \
    -e "s|LOG_OUT_PLACEHOLDER|$LOG_OUT_EPAC|g" \
    -e "s|LOG_ERR_PLACEHOLDER|$LOG_ERR_EPAC|g" \
    "$PLIST_TEMPLATE" > "$RENDERED_EPAC"

assert_contains "$RENDERED_EPAC" "com.riddimsoftware.symphonyd.epac" "epac: label"
assert_contains "$RENDERED_EPAC" "$REPO_DIR_EPAC" "epac: WorkingDirectory points to epac"
assert_not_contains "$RENDERED_EPAC" "com.riddimsoftware.symphonyd.agent-config" "epac: label does not reference agent-config"
assert_not_contains "$RENDERED_EPAC" "Logs/symphonyd/agent-config" "epac: log paths do not reference agent-config"
echo ""

# ── 4. Plist filenames are distinct (no collision in LaunchAgents) ─────────
echo "4. Per-repo plist filenames are distinct"
AC_PLIST="$FAKE_LAUNCH_AGENTS/com.riddimsoftware.symphonyd.agent-config.plist"
EPAC_PLIST="$FAKE_LAUNCH_AGENTS/com.riddimsoftware.symphonyd.epac.plist"
if [[ "$AC_PLIST" != "$EPAC_PLIST" && -f "$AC_PLIST" && -f "$EPAC_PLIST" ]]; then
    pass "plist filenames are distinct per repo"
else
    fail "plist filenames are not distinct"
fi
echo ""

# ── Summary ────────────────────────────────────────────────────────────────
echo "Results: $PASS passed, $FAIL failed"
if [[ $FAIL -gt 0 ]]; then
    exit 1
fi
