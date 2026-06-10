#!/bin/bash
set -euo pipefail

ROOT="$(cd -P "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

FAKE_BIN="$TMP_DIR/fake"
mkdir -p "$FAKE_BIN"

cat > "$FAKE_BIN/aws" <<'SH'
#!/bin/bash
case "$*" in
  *agent-loop/dev-bot-app-id*) printf '123456' ;;
  *agent-loop/dev-bot-private-key*) printf 'fake-private-key' ;;
  *agent-loop/reviewer-bot-app-id*) printf '654321' ;;
  *agent-loop/reviewer-bot-private-key*) printf 'fake-reviewer-private-key' ;;
  *) exit 1 ;;
esac
SH
chmod +x "$FAKE_BIN/aws"

cat > "$FAKE_BIN/curl" <<'SH'
#!/bin/bash
url="${@: -1}"
slug="${FAKE_APP_SLUG:-}"
token="${FAKE_TOKEN:-}"

if [ -z "$slug" ]; then
  if [ "${TEST_IDENTITY:-developer}" = "reviewer" ]; then
    slug="riddim-reviewer-bot"
  else
    slug="riddim-developer-bot"
  fi
fi

if [ -z "$token" ]; then
  if [ "${TEST_IDENTITY:-developer}" = "reviewer" ]; then
    token="reviewer-token"
  else
    token="developer-token"
  fi
fi

case "$url" in
  https://api.github.com/app) printf '{"slug":"%s"}' "$slug" ;;
  https://api.github.com/orgs/YourGithubOrg/installation) printf '{"id":98765}' ;;
  https://api.github.com/app/installations/98765/access_tokens) printf '{"token":"%s","expires_at":"2026-05-12T13:00:00Z"}' "$token" ;;
  *) exit 1 ;;
esac
SH
chmod +x "$FAKE_BIN/curl"

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

run_helper() {
  local identity="$1"
  shift
  PATH="$FAKE_BIN:/usr/bin:/bin" \
  AWS_PROFILE=your-aws-profile \
  TEST_IDENTITY="$identity" \
  "$ROOT/bin/gh-app-token" --identity "$identity" "$@"
}

assert_json_field() {
  local json="$1"
  local field="$2"
  local expected="$3"
  local actual
  actual=$(JSON_PAYLOAD="$json" python3 - "$field" <<'PY'
import json, os, sys
field = sys.argv[1]
print(json.loads(os.environ["JSON_PAYLOAD"])[field])
PY
)
  if [[ "$actual" != "$expected" ]]; then
    echo "expected JSON field $field=$expected, got $actual" >&2
    exit 1
  fi
}

dev_json="$(run_helper developer)"
assert_json_field "$dev_json" identity developer
assert_json_field "$dev_json" bot_login 'riddim-developer-bot[bot]'
assert_json_field "$dev_json" app_slug 'riddim-developer-bot'
assert_json_field "$dev_json" installation_id '98765'
assert_json_field "$dev_json" expires_at '2026-05-12T13:00:00Z'
assert_json_field "$dev_json" token 'developer-token'

reviewer_json="$(run_helper reviewer)"
assert_json_field "$reviewer_json" identity reviewer
assert_json_field "$reviewer_json" bot_login 'riddim-reviewer-bot[bot]'
assert_json_field "$reviewer_json" app_slug 'riddim-reviewer-bot'
assert_json_field "$reviewer_json" installation_id '98765'
assert_json_field "$reviewer_json" expires_at '2026-05-12T13:00:00Z'
assert_json_field "$reviewer_json" token 'reviewer-token'

stdout_file="$TMP_DIR/stdout"
stderr_file="$TMP_DIR/stderr"
if PATH="$FAKE_BIN:/usr/bin:/bin" \
  AWS_PROFILE=your-aws-profile \
  TEST_IDENTITY=developer \
  FAKE_APP_SLUG=wrong-bot \
  "$ROOT/bin/gh-app-token" --identity developer >"$stdout_file" 2>"$stderr_file"; then
  echo "expected slug mismatch to fail" >&2
  exit 1
fi
[[ ! -s "$stdout_file" ]] || {
  echo "expected no stdout on slug mismatch" >&2
  cat "$stdout_file" >&2
  exit 1
}
grep -F "bot login mismatch" "$stderr_file" >/dev/null || {
  echo "expected slug mismatch diagnostic" >&2
  cat "$stderr_file" >&2
  exit 1
}

if PATH="/usr/bin:/bin" AWS_PROFILE=your-aws-profile "$ROOT/bin/gh-app-token" --identity developer >"$stdout_file" 2>"$stderr_file"; then
  echo "expected missing dependency path to fail" >&2
  exit 1
fi
grep -F "required command not found: aws" "$stderr_file" >/dev/null || {
  echo "expected missing aws diagnostic" >&2
  cat "$stderr_file" >&2
  exit 1
}

echo "gh-app-token tests passed"
