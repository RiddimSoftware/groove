#!/bin/bash
set -euo pipefail

ROOT="$(cd -P "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

HOME_DIR="$TMP_DIR/home"
LOCAL_BIN_DIR="$TMP_DIR/local-bin"
OVERRIDE_BIN_DIR="$TMP_DIR/override-bin"
mkdir -p "$HOME_DIR" "$LOCAL_BIN_DIR" "$OVERRIDE_BIN_DIR"

ln -s "$ROOT/bin/gh" "$LOCAL_BIN_DIR/gh"
ln -s "/YOUR/WORKSPACE/DIR/agent-config/bin/gh" "$OVERRIDE_BIN_DIR/gh"

output=$(
  HOME="$HOME_DIR" \
  XDG_CONFIG_HOME="$TMP_DIR/xdg" \
  LOCAL_BIN="$LOCAL_BIN_DIR" \
  OVERRIDE_BIN="$OVERRIDE_BIN_DIR" \
  "$ROOT/scripts/setup-claude-env.sh"
)

[ ! -L "$LOCAL_BIN_DIR/gh" ] && [ ! -e "$LOCAL_BIN_DIR/gh" ] || { echo "expected stale local gh symlink to be removed" >&2; exit 1; }
[ ! -L "$OVERRIDE_BIN_DIR/gh" ] && [ ! -e "$OVERRIDE_BIN_DIR/gh" ] || { echo "expected stale override gh symlink to be removed" >&2; exit 1; }
[ "$(readlink "$LOCAL_BIN_DIR/agent-worktree")" = "$ROOT/bin/agent-worktree" ] || { echo "expected local agent-worktree symlink" >&2; exit 1; }
[ "$(readlink "$OVERRIDE_BIN_DIR/agent-worktree")" = "$ROOT/bin/agent-worktree" ] || { echo "expected override agent-worktree symlink" >&2; exit 1; }

grep -F "gh route                → installed gh only; no agent-config gh override is installed" <<< "$output" >/dev/null || {
  echo "expected installed-gh summary" >&2
  echo "$output" >&2
  exit 1
}

if grep -R "RIDDIM_DEV_BOT_GH\|agent-bot status" "$HOME_DIR" "$TMP_DIR/xdg" >/dev/null 2>&1; then
  echo "setup output files should not configure legacy gh wrapper env" >&2
  exit 1
fi

echo "setup-claude-env tests passed"
