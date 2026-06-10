#!/bin/bash
set -euo pipefail

ROOT="$(cd -P "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

ORIGIN_DIR="$TMP_DIR/origin.git"
SEED_DIR="$TMP_DIR/seed"
REPO_DIR="$TMP_DIR/demo"
FAKE_BIN="$TMP_DIR/fake-bin"
LOG_FILE="$TMP_DIR/fake-agent.log"
mkdir -p "$FAKE_BIN"

git init --bare "$ORIGIN_DIR" >/dev/null

git init "$SEED_DIR" >/dev/null
git -C "$SEED_DIR" config user.name "Test User"
git -C "$SEED_DIR" config user.email "test@example.com"
echo base > "$SEED_DIR/base.txt"
git -C "$SEED_DIR" add base.txt
git -C "$SEED_DIR" commit -m "base" >/dev/null
git -C "$SEED_DIR" branch -M main
git -C "$SEED_DIR" remote add origin "$ORIGIN_DIR"
git -C "$SEED_DIR" push -u origin main >/dev/null

git clone "$ORIGIN_DIR" "$REPO_DIR" >/dev/null
REPO_REAL="$(cd -P "$REPO_DIR" && pwd)"
git -C "$REPO_DIR" config user.name "Test User"
git -C "$REPO_DIR" config user.email "test@example.com"

echo dirty > "$REPO_DIR/base.txt"
echo junk > "$REPO_DIR/untracked.txt"
git -C "$REPO_DIR" checkout -b feature >/dev/null

NO_LAUNCH_OUTPUT="$($ROOT/bin/agent-worktree --no-launch "$REPO_DIR" 'copy fix' 2>&1)"
EXPECTED_WORKTREE="$(cd -P "$TMP_DIR" && pwd)/demo-worktrees/claude--manual-copy-fix"

grep -F "Root repo: $REPO_REAL" <<< "$NO_LAUNCH_OUTPUT" >/dev/null
grep -F "Branch: claude/manual-copy-fix" <<< "$NO_LAUNCH_OUTPUT" >/dev/null
grep -F "Worktree path: $EXPECTED_WORKTREE" <<< "$NO_LAUNCH_OUTPUT" >/dev/null
grep -F "run: git -C $REPO_REAL fetch origin main" <<< "$NO_LAUNCH_OUTPUT" >/dev/null
[[ "$(git -C "$REPO_DIR" branch --show-current)" = "feature" ]]
[[ "$(cat "$REPO_DIR/base.txt")" = "dirty" ]]
[[ -e "$REPO_DIR/untracked.txt" ]]
[[ -d "$EXPECTED_WORKTREE" ]]
[[ "$(git -C "$EXPECTED_WORKTREE" branch --show-current)" = "claude/manual-copy-fix" ]]

echo dirty-again > "$REPO_DIR/base.txt"
echo junk-again > "$REPO_DIR/untracked-again.txt"
git -C "$REPO_DIR" checkout -b feature-2 >/dev/null
DRY_RUN_OUTPUT="$($ROOT/bin/agent-worktree --dry-run "$REPO_DIR" 'dry run' -- codex 2>&1)"
EXPECTED_DRY_RUN_WORKTREE="$(cd -P "$TMP_DIR" && pwd)/demo-worktrees/claude--manual-dry-run"

grep -F "Dry run: true" <<< "$DRY_RUN_OUTPUT" >/dev/null
grep -F "dry-run: git -C $REPO_REAL fetch origin main" <<< "$DRY_RUN_OUTPUT" >/dev/null
grep -F "dry-run: git -C $REPO_REAL worktree add" <<< "$DRY_RUN_OUTPUT" >/dev/null
grep -F "launch command: cd $EXPECTED_DRY_RUN_WORKTREE && exec codex" <<< "$DRY_RUN_OUTPUT" >/dev/null
[[ "$(git -C "$REPO_DIR" branch --show-current)" = "feature-2" ]]
[[ "$(cat "$REPO_DIR/base.txt")" = "dirty-again" ]]
[[ -e "$REPO_DIR/untracked-again.txt" ]]
[[ ! -e "$EXPECTED_DRY_RUN_WORKTREE" ]]

cat > "$FAKE_BIN/fake-agent" <<'FAKE'
#!/bin/bash
printf 'pwd=%s\n' "$PWD" > "$AGENT_WORKTREE_TEST_LOG"
printf 'args=%s\n' "$*" >> "$AGENT_WORKTREE_TEST_LOG"
FAKE
chmod +x "$FAKE_BIN/fake-agent"

LAUNCH_OUTPUT="$(PATH="$FAKE_BIN:/usr/bin:/bin" AGENT_WORKTREE_TEST_LOG="$LOG_FILE" "$ROOT/bin/agent-worktree" "$REPO_DIR" 'DEL-286 smoke' -- fake-agent hello world 2>&1)"
EXPECTED_LAUNCH_WORKTREE="$(cd -P "$TMP_DIR" && pwd)/demo-worktrees/claude--del-286-smoke"

grep -F "Branch: claude/del-286-smoke" <<< "$LAUNCH_OUTPUT" >/dev/null
grep -F "launch: cd $EXPECTED_LAUNCH_WORKTREE && exec fake-agent hello world" <<< "$LAUNCH_OUTPUT" >/dev/null
grep -F "pwd=$EXPECTED_LAUNCH_WORKTREE" "$LOG_FILE" >/dev/null
grep -F "args=hello world" "$LOG_FILE" >/dev/null
[[ "$(git -C "$REPO_DIR" branch --show-current)" = "feature-2" ]]
[[ -e "$REPO_DIR/untracked-again.txt" ]]

mkdir -p "$TMP_DIR/invalid-repo"
if "$ROOT/bin/agent-worktree" --no-launch "$TMP_DIR/invalid-repo" nope >"$TMP_DIR/invalid.log" 2>&1; then
  echo "expected invalid repo check to fail" >&2
  exit 1
fi
grep -F "not a git repository" "$TMP_DIR/invalid.log" >/dev/null

NO_ORIGIN_REPO="$TMP_DIR/no-origin"
git init "$NO_ORIGIN_REPO" >/dev/null
if "$ROOT/bin/agent-worktree" --no-launch "$NO_ORIGIN_REPO" nope >"$TMP_DIR/no-origin.log" 2>&1; then
  echo "expected missing origin check to fail" >&2
  exit 1
fi
grep -F "no origin remote" "$TMP_DIR/no-origin.log" >/dev/null

mkdir -p "$TMP_DIR/demo-worktrees/claude--manual-blocked"
if "$ROOT/bin/agent-worktree" --no-launch "$REPO_DIR" blocked >"$TMP_DIR/blocked.log" 2>&1; then
  echo "expected non-worktree target path refusal" >&2
  exit 1
fi
grep -F "not a registered git worktree" "$TMP_DIR/blocked.log" >/dev/null

echo "agent-worktree tests passed"
