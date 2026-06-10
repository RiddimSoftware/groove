#!/bin/bash
set -euo pipefail

ROOT="$(cd -P "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

FAKE_BIN="$TMP_DIR/fake-bin"
LOG_FILE="$TMP_DIR/gemini.log"
PROFILE_ROOT="$TMP_DIR/profiles"
SOURCE_STATE="$TMP_DIR/source/.gemini"
mkdir -p "$FAKE_BIN" "$SOURCE_STATE"

cat > "$FAKE_BIN/gemini" <<'FAKE'
#!/bin/bash
{
  printf 'GEMINI_CLI_HOME=%s\n' "${GEMINI_CLI_HOME:-}"
  printf 'args=%s\n' "$*"
} >> "$RUN_GEMINI_TEST_LOG"

case "${RUN_GEMINI_FAKE_MODE:-}" in
  fallback)
    case "${GEMINI_CLI_HOME:-}" in
      */primary)
        printf 'Gemini request failed: 429 RATE_LIMIT quota exceeded\n' >&2
        exit 42
        ;;
      */secondary)
        printf 'secondary profile succeeded\n'
        exit 0
        ;;
    esac
    ;;
  allfail)
    printf 'Gemini request failed: RESOURCE_EXHAUSTED rate limit exceeded\n' >&2
    exit 43
    ;;
  nonretry)
    printf 'Gemini request failed: malformed prompt\n' >&2
    exit 44
    ;;
esac
FAKE
chmod +x "$FAKE_BIN/gemini"

cat > "$SOURCE_STATE/oauth_creds.json" <<'JSON'
{"refresh_token":"secret-refresh-token","access_token":"secret-access-token"}
JSON
cat > "$SOURCE_STATE/google_accounts.json" <<'JSON'
{"active":"seat@example.com","old":[]}
JSON
cat > "$SOURCE_STATE/settings.json" <<'JSON'
{"security":{"auth":{"selectedType":"oauth-personal"}}}
JSON

DRY_RUN_OUTPUT="$(
  PATH="$FAKE_BIN:/usr/bin:/bin" \
  GEMINI_PROFILE_ROOT="$PROFILE_ROOT" \
  "$ROOT/bin/run-gemini" --profile primary --migrate-from "$TMP_DIR/source" --dry-run
)"

grep -F 'migration plan' <<< "$DRY_RUN_OUTPUT" >/dev/null
grep -F 'action: dry run only; no credential files copied' <<< "$DRY_RUN_OUTPUT" >/dev/null
if grep -F 'secret-refresh-token' <<< "$DRY_RUN_OUTPUT" >/dev/null; then
  echo 'dry-run output leaked credential content' >&2
  exit 1
fi
[[ ! -e "$PROFILE_ROOT/primary/.gemini/oauth_creds.json" ]]

FRESH_PROFILE_ROOT="$TMP_DIR/fresh/missing/state/gemini/profiles"
FRESH_DRY_RUN_OUTPUT="$(
  PATH="$FAKE_BIN:/usr/bin:/bin" \
  GEMINI_PROFILE_ROOT="$FRESH_PROFILE_ROOT" \
  "$ROOT/bin/run-gemini" --profile fresh --migrate-from "$TMP_DIR/source" --dry-run
)"
grep -F 'migration plan' <<< "$FRESH_DRY_RUN_OUTPUT" >/dev/null
grep -F 'target status: would be created' <<< "$FRESH_DRY_RUN_OUTPUT" >/dev/null
[[ ! -e "$FRESH_PROFILE_ROOT/fresh/.gemini/oauth_creds.json" ]]

FRESH_WRITE_PROFILE_ROOT="$TMP_DIR/fresh-write/missing/state/gemini/profiles"
PATH="$FAKE_BIN:/usr/bin:/bin" \
GEMINI_PROFILE_ROOT="$FRESH_WRITE_PROFILE_ROOT" \
"$ROOT/bin/run-gemini" --profile fresh --migrate-from "$TMP_DIR/source" >/dev/null
[[ -f "$FRESH_WRITE_PROFILE_ROOT/fresh/.gemini/oauth_creds.json" ]]

PATH="$FAKE_BIN:/usr/bin:/bin" \
GEMINI_PROFILE_ROOT="$PROFILE_ROOT" \
"$ROOT/bin/run-gemini" --profile primary --migrate-from "$SOURCE_STATE" >/dev/null

[[ -f "$PROFILE_ROOT/primary/.gemini/oauth_creds.json" ]]
[[ "$(cat "$PROFILE_ROOT/primary/.gemini/google_accounts.json")" = '{"active":"seat@example.com","old":[]}' ]]

if PATH="$FAKE_BIN:/usr/bin:/bin" GEMINI_PROFILE_ROOT="$PROFILE_ROOT" \
  "$ROOT/bin/run-gemini" --profile primary --migrate-from "$SOURCE_STATE" >"$TMP_DIR/overwrite.log" 2>&1; then
  echo 'expected overwrite without --force to fail' >&2
  exit 1
fi
grep -F 'refusing to overwrite without --force' "$TMP_DIR/overwrite.log" >/dev/null

printf '{"active":"new-seat@example.com","old":[]}\n' > "$SOURCE_STATE/google_accounts.json"
PATH="$FAKE_BIN:/usr/bin:/bin" \
GEMINI_PROFILE_ROOT="$PROFILE_ROOT" \
"$ROOT/bin/run-gemini" --profile primary --migrate-from "$SOURCE_STATE" --force >"$TMP_DIR/force.log" 2>&1
grep -F 'overwriting existing Gemini profile state' "$TMP_DIR/force.log" >/dev/null
[[ "$(cat "$PROFILE_ROOT/primary/.gemini/google_accounts.json")" = '{"active":"new-seat@example.com","old":[]}' ]]
[[ "$(stat -f '%Lp' "$PROFILE_ROOT/primary/.gemini/oauth_creds.json" 2>/dev/null || stat -c '%a' "$PROFILE_ROOT/primary/.gemini/oauth_creds.json")" = "600" ]]

RUN_GEMINI_TEST_LOG="$LOG_FILE" \
PATH="$FAKE_BIN:/usr/bin:/bin" \
GEMINI_PROFILE_ROOT="$PROFILE_ROOT" \
"$ROOT/bin/run-gemini" --profile primary --check -- -p hello

grep -F "GEMINI_CLI_HOME=$PROFILE_ROOT/primary" "$LOG_FILE" >/dev/null
grep -F 'args=-p hello' "$LOG_FILE" >/dev/null

rm -f "$PROFILE_ROOT/primary/.gemini/settings.json"
if RUN_GEMINI_TEST_LOG="$LOG_FILE" PATH="$FAKE_BIN:/usr/bin:/bin" GEMINI_PROFILE_ROOT="$PROFILE_ROOT" \
  "$ROOT/bin/run-gemini" --profile primary --check >"$TMP_DIR/check.log" 2>&1; then
  echo 'expected --check to fail for incomplete profile' >&2
  exit 1
fi
grep -F 'profile state is incomplete' "$TMP_DIR/check.log" >/dev/null
grep -F 'settings.json' "$TMP_DIR/check.log" >/dev/null

if PATH="$FAKE_BIN:/usr/bin:/bin" GEMINI_PROFILE_ROOT="$ROOT/.tmp-gemini-profiles" \
  "$ROOT/bin/run-gemini" --profile unsafe --migrate-from "$SOURCE_STATE" >"$TMP_DIR/unsafe.log" 2>&1; then
  echo 'expected repository-local profile root to be rejected' >&2
  exit 1
fi
grep -F 'refusing to migrate credentials under repository path' "$TMP_DIR/unsafe.log" >/dev/null

if PATH="$FAKE_BIN:/usr/bin:/bin" GEMINI_PROFILE_ROOT="$ROOT/new/missing/profile-root" \
  "$ROOT/bin/run-gemini" --profile unsafe --migrate-from "$SOURCE_STATE" --dry-run >"$TMP_DIR/unsafe-nested.log" 2>&1; then
  echo 'expected nested repository-local profile root to be rejected even when parents are missing' >&2
  exit 1
fi
grep -F 'refusing to migrate credentials under repository path' "$TMP_DIR/unsafe-nested.log" >/dev/null

mkdir -p "$PROFILE_ROOT/secondary"
cat > "$PROFILE_ROOT/registry.json" <<'JSON'
{
  "version": 1,
  "profileRootEnv": "GEMINI_PROFILE_ROOT",
  "profileRootDefault": "${XDG_STATE_HOME:-$HOME/.local/state}/gemini/profiles",
  "profiles": {
    "primary": {
      "key": "primary",
      "displayName": "Primary Gemini seat",
      "emailHint": "seat-1@example.com",
      "licenseActive": true,
      "status": "active",
      "maxSessionsPerDay": 12,
      "rotationOrder": 1,
      "localProfileDirectory": "primary",
      "notes": "Default interactive profile."
    },
    "secondary": {
      "key": "secondary",
      "displayName": "Secondary Gemini seat",
      "emailHint": "seat-2@example.com",
      "licenseActive": true,
      "status": "active",
      "maxSessionsPerDay": 12,
      "rotationOrder": 2,
      "localProfileDirectory": "secondary",
      "notes": "Second licensed profile."
    },
    "idle": {
      "key": "idle",
      "displayName": "Idle Gemini seat",
      "emailHint": "seat-3@example.com",
      "licenseActive": true,
      "status": "idle",
      "rotationOrder": 3,
      "localProfileDirectory": "idle",
      "notes": "Configured but not in active rotation."
    }
  }
}
JSON

: > "$LOG_FILE"
RUN_GEMINI_TEST_LOG="$LOG_FILE" \
RUN_GEMINI_FAKE_MODE=fallback \
PATH="$FAKE_BIN:/usr/bin:/bin" \
GEMINI_PROFILE_ROOT="$PROFILE_ROOT" \
GEMINI_FALLBACK_BACKOFF_SECONDS=0 \
"$ROOT/bin/run-gemini" --profile primary --auto-rotate -- -p hello >"$TMP_DIR/fallback.out" 2>"$TMP_DIR/fallback.err"
grep -F 'secondary profile succeeded' "$TMP_DIR/fallback.out" >/dev/null
grep -F 'rotation_chain=primary,secondary' "$TMP_DIR/fallback.err" >/dev/null
grep -F 'attempt=1 profile=primary status=failed reason=quota exit_code=42 fallback=true' "$TMP_DIR/fallback.err" >/dev/null
grep -F 'attempt=2 profile=secondary status=succeeded reason=none exit_code=0' "$TMP_DIR/fallback.err" >/dev/null
grep -F "GEMINI_CLI_HOME=$PROFILE_ROOT/primary" "$LOG_FILE" >/dev/null
grep -F "GEMINI_CLI_HOME=$PROFILE_ROOT/secondary" "$LOG_FILE" >/dev/null
if grep -F 'GEMINI_CLI_HOME='"$PROFILE_ROOT"'/idle' "$LOG_FILE" >/dev/null; then
  echo 'idle profile should not be included in fallback chain' >&2
  exit 1
fi

: > "$LOG_FILE"
if RUN_GEMINI_TEST_LOG="$LOG_FILE" RUN_GEMINI_FAKE_MODE=fallback PATH="$FAKE_BIN:/usr/bin:/bin" \
  GEMINI_PROFILE_ROOT="$PROFILE_ROOT" GEMINI_AUTO_ROTATE=true GEMINI_FALLBACK_BACKOFF_SECONDS=0 \
  "$ROOT/bin/run-gemini" --profile primary --no-auto-rotate -- -p hello >"$TMP_DIR/no-rotate.out" 2>"$TMP_DIR/no-rotate.err"; then
  echo 'expected disabled auto-rotation to return the primary profile failure' >&2
  exit 1
fi
grep -F '429 RATE_LIMIT quota exceeded' "$TMP_DIR/no-rotate.err" >/dev/null
grep -F "GEMINI_CLI_HOME=$PROFILE_ROOT/primary" "$LOG_FILE" >/dev/null
if grep -F "GEMINI_CLI_HOME=$PROFILE_ROOT/secondary" "$LOG_FILE" >/dev/null; then
  echo '--no-auto-rotate should prevent secondary profile attempts' >&2
  exit 1
fi

: > "$LOG_FILE"
if RUN_GEMINI_TEST_LOG="$LOG_FILE" RUN_GEMINI_FAKE_MODE=allfail PATH="$FAKE_BIN:/usr/bin:/bin" \
  GEMINI_PROFILE_ROOT="$PROFILE_ROOT" GEMINI_FALLBACK_BACKOFF_SECONDS=0 \
  "$ROOT/bin/run-gemini" --profile primary --auto-rotate --max-fallback-attempts 1 -- -p hello >"$TMP_DIR/allfail.out" 2>"$TMP_DIR/allfail.err"; then
  echo 'expected all quota-blocked profiles to fail loudly' >&2
  exit 1
fi
grep -F 'rotation_chain=primary,secondary' "$TMP_DIR/allfail.err" >/dev/null
grep -F 'all attempted Gemini profiles failed with quota/auth fallback signatures' "$TMP_DIR/allfail.err" >/dev/null

: > "$LOG_FILE"
if RUN_GEMINI_TEST_LOG="$LOG_FILE" RUN_GEMINI_FAKE_MODE=nonretry PATH="$FAKE_BIN:/usr/bin:/bin" \
  GEMINI_PROFILE_ROOT="$PROFILE_ROOT" GEMINI_FALLBACK_BACKOFF_SECONDS=0 \
  "$ROOT/bin/run-gemini" --profile primary --auto-rotate -- -p hello >"$TMP_DIR/nonretry.out" 2>"$TMP_DIR/nonretry.err"; then
  echo 'expected non-retryable failures to stop without fallback' >&2
  exit 1
fi
grep -F 'attempt=1 profile=primary status=failed reason=non_retryable exit_code=44 fallback=false' "$TMP_DIR/nonretry.err" >/dev/null
grep -F "GEMINI_CLI_HOME=$PROFILE_ROOT/primary" "$LOG_FILE" >/dev/null
if grep -F "GEMINI_CLI_HOME=$PROFILE_ROOT/secondary" "$LOG_FILE" >/dev/null; then
  echo 'non-retryable failures should not try another profile' >&2
  exit 1
fi

echo 'run-gemini tests passed'
