# Use Case Catalog

This catalog documents the application behaviors (use cases) implemented in this repository.

## Inventory

### MintGitHubAppInstallationToken
**Actor:** Symphony / Deterministic Automation
**Goal:** Generate a short-lived GitHub App installation token for the requested bot identity and verify that the discovered app slug matches the expected bot login before releasing the token.
**Inputs:** `secret_prefix`, `expected_bot_login`, `aws_profile`
**Outputs:** `GH_INSTALL_TOKEN`, `GH_INSTALL_ID`, `GH_APP_SLUG`, `GH_INSTALL_TOKEN_EXPIRES_AT` or an error message.
**Entities / Values:** `GitHubAppCredential`, `GitHubInstallation`, `InstallationToken`, `BotIdentityConfig`
**Ports:** `SecretStore_GetSecret`, `Clock_Now`, `Base64UrlEncode`, `JwtSigner_Sign`, `GitHubAppApi_GetApp`, `GitHubAppApi_GetInstallation`, `GitHubAppApi_MintToken`
**Primary Adapters:** `bin/gh-app-token`, `aws ssm`, `date`, `openssl`, `curl`
**Current Implementation:** `bin/gh-core.sh`

---
*Add new use cases above this line.*
