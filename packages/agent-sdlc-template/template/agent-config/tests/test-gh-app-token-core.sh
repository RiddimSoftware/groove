#!/bin/bash
set -euo pipefail

ROOT="$(cd -P "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT/bin/gh-core.sh"

assert_equals() {
  local expected="$1" actual="$2" message="$3"
  if [[ "$expected" != "$actual" ]]; then
    echo "${message}: expected '${expected}', got '${actual}'" >&2
    exit 1
  fi
}

Port_SecretStore_GetSecret() {
  case "$1" in
    agent-loop/dev-bot-app-id) printf '123456' ;;
    agent-loop/dev-bot-private-key) printf 'fake-private-key' ;;
    agent-loop/empty-bot-app-id) printf '' ;;
    agent-loop/empty-bot-private-key) printf 'fake-private-key' ;;
    *) return 1 ;;
  esac
}

Port_Clock_Now() { printf '1760000000'; }
Port_Base64UrlEncode() { printf 'encoded-%s' "$1"; }
Port_JwtSigner_Sign() { printf 'signature'; }
Port_GitHubAppApi_GetApp() { printf '%s' "${FAKE_APP_SLUG:-riddim-developer-bot}"; }
Port_GitHubAppApi_GetInstallation() { printf '%s' "${FAKE_INSTALL_ID:-98765}"; }
Port_GitHubAppApi_MintToken() { printf '%s\t%s' "${FAKE_TOKEN:-developer-token}" '2026-05-12T13:00:00Z'; }

MintGitHubAppInstallationToken 'agent-loop/dev-bot' 'riddim-developer-bot[bot]' 'your-aws-profile'
assert_equals 'developer-token' "$GH_INSTALL_TOKEN" 'token should be captured'
assert_equals '98765' "$GH_INSTALL_ID" 'installation id should be captured'
assert_equals 'riddim-developer-bot' "$GH_APP_SLUG" 'app slug should be captured'
assert_equals '2026-05-12T13:00:00Z' "$GH_INSTALL_TOKEN_EXPIRES_AT" 'expiry should be captured'

if FAKE_APP_SLUG=wrong-bot MintGitHubAppInstallationToken 'agent-loop/dev-bot' 'riddim-developer-bot[bot]' 'your-aws-profile'; then
  echo 'expected bot mismatch to fail' >&2
  exit 1
fi
assert_equals 'bot login mismatch: expected riddim-developer-bot[bot], got wrong-bot[bot]' "$GH_MINT_ERROR" 'mismatch diagnostic'

if MintGitHubAppInstallationToken 'agent-loop/empty-bot' 'riddim-developer-bot[bot]' 'your-aws-profile'; then
  echo 'expected empty app id to fail' >&2
  exit 1
fi
assert_equals 'agent-loop/empty-bot-app-id is empty' "$GH_MINT_ERROR" 'empty app id diagnostic'

echo 'gh-app-token core tests passed'
