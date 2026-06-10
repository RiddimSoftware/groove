---
name: mint-gh-token
description: Mints a GitHub authentication token using the autonomous developer skill. Use this when you need a GitHub token or when you need to authenticate gh cli commands.
---

# Mint GitHub Token

## Overview

This skill allows you to mint a GitHub authentication token for the developer bot identity by executing the Symphony environment's token helper script.

## Usage

When you need to mint a GitHub token or authenticate the `gh` CLI, run the following command exactly:

```bash
/YOUR/WORKSPACE/DIR/agent-config/bin/gh-app-token --identity developer
```

This will output JSON containing the minted token (e.g., in the `token` field). You can parse this JSON or extract the token to set the `GH_TOKEN` or `GITHUB_TOKEN` environment variable for subsequent `gh` CLI commands.

**Example usage in a script:**
```bash
TOKEN=$(/YOUR/WORKSPACE/DIR/agent-config/bin/gh-app-token --identity developer | jq -r '.token')
GH_TOKEN=$TOKEN gh pr create --title "My PR" --body "My PR body"
```
