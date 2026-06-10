#!/usr/bin/env bash
# setup-claude-env.sh
#
# One-time machine setup for the Claude Code / Codex bot environment.
#
# What it does:
#   1. Symlinks agent-config/bin/agent-worktree into ~/.local/bin and
#      /usr/local/bin so Claude Code, Codex Desktop, Codex CLI, and subagent
#      shells can launch managed worktrees.
#   2. Removes stale ~/.local/bin/gh and /usr/local/bin/gh symlinks that point
#      at the retired agent-config/bin/gh override, when safe to do so.
#   3. Appends a conditional PATH block to zsh startup files so that
#      agent-config/bin is available in Claude Code / Codex shell sessions
#      after Homebrew/RVM path setup runs. The directory no longer contains a
#      gh override; installed gh plus Symphony-scoped tokens own bot auth.
#   4. Writes [shell_environment_policy] set = { CODEX_SESSION = "1" } into
#      ~/.codex/config.toml so Codex sessions have CODEX_SESSION set.
#   5. Writes git identity vars into ~/.claude/settings.json so commits made
#      inside Claude Code sessions are attributed to developer-bot.
#   6. Ensures org-local agent runtime directories are ignored globally by Git.
#
# Idempotent: re-running detects existing configuration and skips writes.

set -euo pipefail

# Resolve the org root via BASH_SOURCE (no hardcoded paths). The script lives at
# <org-root>/agent-config/scripts/setup-claude-env.sh, so the agent-config root
# is the parent of this script's directory.
SCRIPT_SOURCE="${BASH_SOURCE[0]}"
while [ -L "$SCRIPT_SOURCE" ]; do
  SCRIPT_DIR_TMP="$(cd -P "$(dirname "$SCRIPT_SOURCE")" && pwd)"
  SCRIPT_SOURCE="$(readlink "$SCRIPT_SOURCE")"
  [[ "$SCRIPT_SOURCE" != /* ]] && SCRIPT_SOURCE="$SCRIPT_DIR_TMP/$SCRIPT_SOURCE"
done
SCRIPT_DIR="$(cd -P "$(dirname "$SCRIPT_SOURCE")" && pwd)"
AGENT_CONFIG_ROOT="$(cd -P "$SCRIPT_DIR/.." && pwd)"
BIN_DIR="$AGENT_CONFIG_ROOT/bin"

if ! command -v jq >/dev/null 2>&1; then
  echo "error: jq is required but not found on PATH" >&2
  echo "install jq (e.g. 'brew install jq') and re-run." >&2
  exit 1
fi

ZSHENV="$HOME/.zshenv"
ZPROFILE="$HOME/.zprofile"
ZSHRC="$HOME/.zshrc"
ZLOGIN="$HOME/.zlogin"
CODEX_CONFIG="$HOME/.codex/config.toml"
SETTINGS_DIR="$HOME/.claude"
SETTINGS_FILE="$SETTINGS_DIR/settings.json"
ZSHRC_MARKER="# Claude Code / Codex bot identity"
LOCAL_BIN="${LOCAL_BIN:-$HOME/.local/bin}"
OVERRIDE_BIN="${OVERRIDE_BIN:-/usr/local/bin}"
GLOBAL_GITIGNORE="${XDG_CONFIG_HOME:-$HOME/.config}/git/ignore"

echo "=== setup-claude-env ==="
echo "agent-config root: $AGENT_CONFIG_ROOT"
echo "bin directory:     $BIN_DIR"
echo

# ---------------------------------------------------------------------------
# 1. Shared tool symlinks — expose agent-worktree before Homebrew/system binaries
#
# Codex Desktop currently puts ~/.local/bin early in PATH. /usr/local/bin appears
# before /opt/homebrew/bin in the default macOS PATH. Maintaining both symlink
# sets gives GUI apps, Codex CLI, and subagents a stable route to agent-worktree.
# Do not install or prioritize a gh shim here; Symphony injects scoped bot tokens
# and workers call the installed GitHub CLI directly.
# ---------------------------------------------------------------------------

ensure_tool_symlink() {
  local tool_name="$1"
  local link_dir="$2"
  local label="$3"
  local target="$BIN_DIR/$tool_name"
  local link_path="$link_dir/$tool_name"

  mkdir -p "$link_dir"

  local existing
  existing=$(readlink "$link_path" 2>/dev/null || echo "")
  if [ "$existing" = "$target" ]; then
    echo "[$label] $tool_name symlink already correct — skipped"
  elif [ -e "$link_path" ] || [ -L "$link_path" ]; then
    ln -sf "$target" "$link_path"
    echo "[$label] updated $tool_name symlink → $target  (was: $existing)"
  else
    ln -sf "$target" "$link_path"
    echo "[$label] created $tool_name symlink → $target"
  fi
}

remove_stale_gh_symlink() {
  local link_dir="$1"
  local label="$2"
  local link_path="$link_dir/gh"

  local existing
  existing=$(readlink "$link_path" 2>/dev/null || echo "")

  if [ "$existing" = "$BIN_DIR/gh" ] || [ "$existing" = "/YOUR/WORKSPACE/DIR/agent-config/bin/gh" ]; then
    rm -f "$link_path"
    echo "[$label] removed stale gh override symlink → $existing"
  elif [ -L "$link_path" ]; then
    echo "[$label] gh symlink points elsewhere ($existing) — left unchanged"
  elif [ -e "$link_path" ]; then
    echo "[$label] gh exists and is not a symlink — left unchanged"
  else
    echo "[$label] no stale gh override symlink — skipped"
  fi
}

remove_stale_gh_symlink "$LOCAL_BIN" "$HOME/.local/bin"
remove_stale_gh_symlink "$OVERRIDE_BIN" "/usr/local/bin"
ensure_tool_symlink agent-worktree "$LOCAL_BIN" "$HOME/.local/bin"
ensure_tool_symlink agent-worktree "$OVERRIDE_BIN" "/usr/local/bin"

# ---------------------------------------------------------------------------
# 2. zsh startup files — conditional PATH block for agent shell sessions
#
# zsh reads ~/.zshenv early, then ~/.zprofile and ~/.zlogin for login shells.
# This machine's Homebrew/RVM startup files can rewrite PATH after ~/.zshenv, so
# keep the block in all relevant startup files and let the latest one win.
# ---------------------------------------------------------------------------

ensure_zsh_path_block() {
  local target_file="$1"
  local label="$2"

  if grep -qF "$ZSHRC_MARKER" "$target_file" 2>/dev/null; then
    if grep -qF "export PATH=\"${BIN_DIR}:" "$target_file" 2>/dev/null; then
      echo "[$label] already configured — skipped"
    else
      # Marker present but path is stale (e.g. written from a worktree). Update it.
      local escaped_bin_dir marker_line path_line
      escaped_bin_dir="${BIN_DIR//\//\\/}"
      marker_line=$(grep -n "$(echo "$ZSHRC_MARKER" | head -c 30)" "$target_file" | head -1 | cut -d: -f1)
      path_line=$((marker_line + 2))
      sed -i.bak "${path_line}s|export PATH=\"[^\"]*:\\\$PATH\"|export PATH=\"${escaped_bin_dir}:\$PATH\"|" "$target_file"
      rm -f "${target_file}.bak"
      echo "[$label] updated stale PATH → $BIN_DIR"
    fi
  else
    touch "$target_file"
    cat >> "$target_file" <<ZSH_PATH_BLOCK

$ZSHRC_MARKER
if [[ -n "\$CLAUDECODE" || -n "\$CODEX_SESSION" ]]; then
  export PATH="${BIN_DIR}:\$PATH"
fi
ZSH_PATH_BLOCK
    echo "[$label] appended PATH block for CLAUDECODE/CODEX_SESSION → $BIN_DIR"
  fi
}

ensure_zsh_path_block "$ZSHENV" "zshenv"
ensure_zsh_path_block "$ZPROFILE" "zprofile"
ensure_zsh_path_block "$ZSHRC" "zshrc"
ensure_zsh_path_block "$ZLOGIN" "zlogin"

# ---------------------------------------------------------------------------
# 3. ~/.codex/config.toml — CODEX_SESSION injection
# ---------------------------------------------------------------------------

if [ -f "$CODEX_CONFIG" ] && grep -q "CODEX_SESSION" "$CODEX_CONFIG" 2>/dev/null; then
  echo "[codex] CODEX_SESSION already present in $CODEX_CONFIG — skipped"
else
  mkdir -p "$(dirname "$CODEX_CONFIG")"
  if [ ! -f "$CODEX_CONFIG" ]; then
    cat > "$CODEX_CONFIG" <<TOML
[shell_environment_policy]
set = { CODEX_SESSION = "1" }
TOML
    echo "[codex] created $CODEX_CONFIG with CODEX_SESSION=1"
  else
    cat >> "$CODEX_CONFIG" <<TOML

[shell_environment_policy]
set = { CODEX_SESSION = "1" }
TOML
    echo "[codex] appended [shell_environment_policy] to $CODEX_CONFIG"
  fi
fi

# ---------------------------------------------------------------------------
# 4. ~/.claude/settings.json — git identity vars
# ---------------------------------------------------------------------------

mkdir -p "$SETTINGS_DIR"
if [ ! -f "$SETTINGS_FILE" ]; then
  echo "{}" > "$SETTINGS_FILE"
fi

if ! jq empty "$SETTINGS_FILE" >/dev/null 2>&1; then
  echo "error: $SETTINGS_FILE is not valid JSON; refusing to overwrite" >&2
  exit 1
fi

TMP_FILE="$(mktemp)"
trap 'rm -f "$TMP_FILE"' EXIT

jq \
  --arg gan "riddim-developer-bot" \
  --arg gae "developer-bot@riddimsoftware.com" \
  --arg gcn "riddim-developer-bot" \
  --arg gce "developer-bot@riddimsoftware.com" \
  '
  .env = (.env // {})
  | del(.env.PATH)
  | .env.GIT_AUTHOR_NAME = $gan
  | .env.GIT_AUTHOR_EMAIL = $gae
  | .env.GIT_COMMITTER_NAME = $gcn
  | .env.GIT_COMMITTER_EMAIL = $gce
  ' "$SETTINGS_FILE" > "$TMP_FILE"

mv "$TMP_FILE" "$SETTINGS_FILE"
trap - EXIT

echo "[settings.json] git identity written to $SETTINGS_FILE"

# ---------------------------------------------------------------------------
# 5. git global ignore — org-local agent runtime directories
# ---------------------------------------------------------------------------

mkdir -p "$(dirname "$GLOBAL_GITIGNORE")"
touch "$GLOBAL_GITIGNORE"

ensure_global_gitignore_entry() {
  local pattern="$1"
  if grep -qxF "$pattern" "$GLOBAL_GITIGNORE" 2>/dev/null; then
    echo "[git ignore] $pattern already present in $GLOBAL_GITIGNORE — skipped"
  else
    printf '%s\n' "$pattern" >> "$GLOBAL_GITIGNORE"
    echo "[git ignore] added $pattern to $GLOBAL_GITIGNORE"
  fi
}

ensure_global_gitignore_entry ".symphony/"

# ---------------------------------------------------------------------------
# 6. git global hooks — actionlint pre-commit for all repos on this machine
# ---------------------------------------------------------------------------

HOOKS_DIR="$AGENT_CONFIG_ROOT/git-hooks"
CURRENT_HOOKS_PATH="$(git config --global core.hooksPath 2>/dev/null || echo "")"

if [ "$CURRENT_HOOKS_PATH" = "$HOOKS_DIR" ]; then
  echo "[git hooks] core.hooksPath already set to $HOOKS_DIR — skipped"
else
  git config --global core.hooksPath "$HOOKS_DIR"
  echo "[git hooks] core.hooksPath → $HOOKS_DIR"
fi

# Ensure the pre-commit hook is executable
if [ -f "$HOOKS_DIR/pre-commit" ] && [ ! -x "$HOOKS_DIR/pre-commit" ]; then
  chmod +x "$HOOKS_DIR/pre-commit"
  echo "[git hooks] made pre-commit executable"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

echo
echo "Done."
echo "  agent-worktree route    → $LOCAL_BIN/agent-worktree and $OVERRIDE_BIN/agent-worktree"
echo "  gh route                → installed gh only; no agent-config gh override is installed"
echo "  stale gh cleanup        → removed only symlinks that pointed at the retired agent-config/bin/gh"
echo "  developer-bot PR path      → Symphony injects GH_TOKEN/GITHUB_TOKEN before workers call installed gh"
