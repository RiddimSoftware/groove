#!/bin/bash
# Core GitHub App token minting use case shared by gh-app-token.

# MintGitHubAppInstallationToken Use Case
# Inputs:
#   $1 = secret_prefix (e.g. agent-loop/dev-bot or agent-loop/reviewer-bot)
#   $2 = expected_bot_login (e.g. riddim-developer-bot[bot])
#   $3 = aws_profile (e.g. your-aws-profile)
# Ports required to be implemented by adapters:
#   Port_SecretStore_GetSecret <secret_id> <aws_profile>
#   Port_Clock_Now
#   Port_Base64UrlEncode <string>
#   Port_JwtSigner_Sign <header_b64> <payload_b64> <private_key>
#   Port_GitHubAppApi_GetApp <jwt>
#   Port_GitHubAppApi_GetInstallation <jwt>
#   Port_GitHubAppApi_MintToken <jwt> <install_id>
# Outputs: $GH_INSTALL_TOKEN, $GH_INSTALL_ID, $GH_APP_SLUG,
#          $GH_INSTALL_TOKEN_EXPIRES_AT, $GH_MINT_ERROR
# shellcheck disable=SC2034 # Output variables are read by sourcing adapters/tests.
MintGitHubAppInstallationToken() {
  local secret_prefix="$1"
  local expected_bot_login="$2"
  local aws_profile="$3"

  GH_INSTALL_TOKEN=""
  GH_INSTALL_ID=""
  GH_APP_SLUG=""
  GH_INSTALL_TOKEN_EXPIRES_AT=""
  GH_MINT_ERROR=""

  local app_id
  app_id=$(Port_SecretStore_GetSecret "${secret_prefix}-app-id" "$aws_profile")
  if [[ -z "$app_id" ]]; then
    GH_MINT_ERROR="${secret_prefix}-app-id is empty"
    return 1
  fi

  local private_key
  private_key=$(Port_SecretStore_GetSecret "${secret_prefix}-private-key" "$aws_profile")
  if [[ -z "$private_key" ]]; then
    GH_MINT_ERROR="${secret_prefix}-private-key is empty"
    return 1
  fi

  local now iat exp
  now=$(Port_Clock_Now)
  iat=$(( now - 60 ))
  exp=$(( now + 540 ))

  local header_json='{"alg":"RS256","typ":"JWT"}'
  local payload_json="{\"iat\":${iat},\"exp\":${exp},\"iss\":\"${app_id}\"}"

  local header_b64 payload_b64
  header_b64=$(Port_Base64UrlEncode "$header_json")
  payload_b64=$(Port_Base64UrlEncode "$payload_json")

  local sig_b64
  sig_b64=$(Port_JwtSigner_Sign "$header_b64" "$payload_b64" "$private_key")
  if [[ -z "$sig_b64" ]]; then
    GH_MINT_ERROR="failed to sign JWT"
    return 1
  fi

  local jwt="${header_b64}.${payload_b64}.${sig_b64}"

  local app_slug
  app_slug=$(Port_GitHubAppApi_GetApp "$jwt")
  if [[ -z "$app_slug" ]]; then
    GH_MINT_ERROR="could not parse GitHub App slug"
    return 1
  fi

  GH_APP_SLUG="$app_slug"
  local actual_bot_login="${app_slug}[bot]"
  if [[ "$actual_bot_login" != "$expected_bot_login" ]]; then
    GH_MINT_ERROR="bot login mismatch: expected ${expected_bot_login}, got ${actual_bot_login}"
    return 1
  fi

  local install_id
  install_id=$(Port_GitHubAppApi_GetInstallation "$jwt")
  if [[ -z "$install_id" ]]; then
    GH_MINT_ERROR="could not parse installation id from GitHub response"
    return 1
  fi
  GH_INSTALL_ID="$install_id"

  local token_payload
  token_payload=$(Port_GitHubAppApi_MintToken "$jwt" "$install_id")
  if [[ -z "$token_payload" ]]; then
    GH_MINT_ERROR="could not parse installation token from GitHub response"
    return 1
  fi

  local token expires_at
  IFS=$'\t' read -r token expires_at <<< "$token_payload"
  if [[ -z "$token" ]]; then
    GH_MINT_ERROR="could not parse installation token from GitHub response"
    return 1
  fi

  GH_INSTALL_TOKEN="$token"
  GH_INSTALL_TOKEN_EXPIRES_AT="$expires_at"
  return 0
}
