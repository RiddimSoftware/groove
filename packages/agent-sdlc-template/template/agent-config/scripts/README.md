# agent-config/scripts

Utility scripts that wire Claude Code, Codex, and Symphony workers into the GitHub App bot identities used by the autonomous loop.

## Org instruction sync

`/YOUR/WORKSPACE/DIR/agent-config/CLAUDE.md` is the canonical source of truth for org-level agent instructions. After editing that file or any imported fragment under `agent-config/`, run:

```bash
/YOUR/WORKSPACE/DIR/agent-config/scripts/sync-org-agent-instructions.sh
```

The sync script copies the canonical manifest to `/YOUR/WORKSPACE/DIR/CLAUDE.md` for Claude, then writes `/YOUR/WORKSPACE/DIR/AGENTS.md` and `/YOUR/WORKSPACE/DIR/agent-config/AGENTS.md` as compatibility shims for Codex and other tools. Do not edit generated `AGENTS.md` files directly.

---

## One-time machine setup

On a fresh machine, run **one** command to configure Claude Code and Codex:

```bash
/YOUR/WORKSPACE/DIR/agent-config/scripts/setup-claude-env.sh
```

After it completes, Claude Code, Codex Desktop, Codex CLI, and Codex subagent shells on this machine have the shared `agent-worktree` launcher available. The setup path no longer installs or prioritizes an `agent-config` command named `gh`; autonomous bot identity is scoped by Symphony when it starts each worker, and workers call the installed GitHub CLI with injected `GH_TOKEN` / `GITHUB_TOKEN`.

### What the setup script does

- Symlinks `/YOUR/WORKSPACE/DIR/agent-config/bin/agent-worktree` into `~/.local/bin/agent-worktree` and `/usr/local/bin/agent-worktree` so Claude Code, Codex Desktop, Codex CLI, and default shells can launch managed worktrees.
- Removes stale `~/.local/bin/gh` and `/usr/local/bin/gh` symlinks when, and only when, they point at the retired `/YOUR/WORKSPACE/DIR/agent-config/bin/gh` override. Other `gh` binaries or symlinks are left untouched.
- Appends a conditional PATH block to zsh startup files (`~/.zshenv`, `~/.zprofile`, `~/.zshrc`, and `~/.zlogin`) so `/YOUR/WORKSPACE/DIR/agent-config/bin` is available whenever `CLAUDECODE` or `CODEX_SESSION` is present, even after Homebrew/RVM path setup runs. This directory no longer contains a `gh` override.
- Writes `CODEX_SESSION=1` into `~/.codex/config.toml` so Codex CLI, Codex Desktop, and subagent shells trigger that PATH block.
- Sets the git author identity environment variables (`GIT_AUTHOR_NAME`, `GIT_AUTHOR_EMAIL`, `GIT_COMMITTER_NAME`, `GIT_COMMITTER_EMAIL`) so commits made inside Claude Code sessions are attributed to the developer-bot.

You only need to run it once per machine. Re-running is safe — it is idempotent.

---

## How it works

Bot authentication now has two separate surfaces:

1. **Symphony worker auth** — Symphony mints the scoped developer GitHub App token before launching a worker, exports it as `GH_TOKEN` / `GITHUB_TOKEN`, disables interactive prompts, and verifies the installed `gh` identity. Worker prompts can therefore use plain `gh` without a global CLI override.
2. **`agent-config/bin/gh-app-token`** — a narrow token helper for deterministic automation that needs a structured GitHub App installation-token envelope. It emits JSON for exactly one identity (`developer` or `reviewer`) and does not pretend to be the GitHub CLI.

### Supported Symphony token surface

Symphony and other deterministic scripts should use `gh-app-token` when they need a bot token to pass into another process. Interactive shells and workers should use the installed `gh` binary; they should not rely on an `agent-config` `gh` shim.

```bash
# Developer identity
AWS_PROFILE=your-aws-profile \
/YOUR/WORKSPACE/DIR/agent-config/bin/gh-app-token --identity developer

# Reviewer identity
AWS_PROFILE=your-aws-profile \
/YOUR/WORKSPACE/DIR/agent-config/bin/gh-app-token --identity reviewer
```

Output shape:

```json
{
  "identity": "developer",
  "bot_login": "riddim-developer-bot[bot]",
  "app_slug": "riddim-developer-bot",
  "installation_id": "12345678",
  "expires_at": "2026-05-12T13:00:00Z",
  "token": "<installation token>"
}
```

Diagnostics stay on stderr. On login mismatch or missing dependencies, the helper exits non-zero and prints no token on stdout.

## Manual agent worktree launcher

For manual Claude, Codex, or Gemini coding sessions, start from the shared launcher instead of editing inside a root checkout:

```bash
agent-worktree /YOUR/WORKSPACE/DIR/bap bap-copy-fix -- codex
agent-worktree /YOUR/WORKSPACE/DIR/riddim-website web-header-copy -- claude
agent-worktree --no-launch /YOUR/WORKSPACE/DIR/autopilot root-repair-test -- gemini
```

What it does:

- validates that the supplied path is a git repo with an `origin` remote;
- fetches `origin/main` to ensure the local `origin/main` ref is up to date;
- creates a managed sibling worktree under `<repo>-worktrees/` based on the just-fetched `origin/main`;
- launches the requested agent with cwd set to that worktree, or prints the exact command in `--no-launch` / `--dry-run` mode.

This command does not modify the root checkout. The root's existing branch, staged changes, and untracked files are preserved.

## Workflow-sync direct push

Generated workflow-shim fan-out uses a separate direct-push helper:

- Helper: `/YOUR/WORKSPACE/DIR/agent-config/bin/workflow-sync-push`
- Opt-in env: `RIDDIM_WORKFLOW_SYNC_PUSH=1`
- Recommended AWS env: `AWS_PROFILE=your-aws-profile`
- Secrets: `agent-loop/workflow-sync-app-id`, `agent-loop/workflow-sync-private-key`
- Permission preflight: requires the app installation to expose `contents: write` and `workflows: write`
- Safety guard: refuses to push if any changed file is outside `.github/workflows/`
- Read-only preflight: `status --repo OWNER/REPO` may be run from `agent-config`; `push` still requires the local checkout `origin` to match the target repo

Operational runbook: [`../docs/workflow-sync-bot.md`](../docs/workflow-sync-bot.md)

## Repo enrollment reminder

When enrolling a repository in the developer-bot PR loop, configure branch protection to require the GitHub Actions check **`pr-build`**. Do **not** require a `success` context for new enrollments: GitHub Actions emits Checks API check runs, while `success` is ambiguous with the older Commit Statuses API naming model. Required `pr-build` workflows must trigger on `pull_request`, `merge_group`, and `workflow_dispatch`, and they must not use path filters that can skip the workflow and leave the required check pending.

---

## First-time credential provisioning

The helper at `/YOUR/WORKSPACE/DIR/agent-config/bin/gh-app-token` needs two AWS Parameter Store parameters for each bot identity before it can mint a token for Symphony worker auth or other deterministic token retrieval. On a brand-new machine — or the first time the GitHub App is set up for the org — run these once.

### Prerequisites

- `aws`, `curl`, `jq`, `openssl`, and the GitHub CLI (`gh`) installed locally.
- `AWS_PROFILE=your-aws-profile` configured with `ssm:GetParameter` and `ssm:PutParameter` on the parameters below.
- `riddim-developer-bot` GitHub App installed on the `YourGithubOrg` org with `pull_requests: write` and `contents: write` permissions.

### Provisioning the AWS parameters

You will need the App ID and the PEM private key from the GitHub App settings page (`https://github.com/organizations/YourGithubOrg/settings/apps/riddim-developer-bot`).

```bash
# 1. Store the App ID (a plain integer, e.g. "123456")
AWS_PROFILE=your-aws-profile aws ssm put-parameter \
  --name /agent-loop/dev-bot-app-id \
  --region us-east-1 \
  --type SecureString \
  --value "YOUR_APP_ID_HERE" \
  --overwrite

# 2. Store the PEM private key
#    Download the .pem file from the App settings page first, then:
AWS_PROFILE=your-aws-profile aws ssm put-parameter \
  --name /agent-loop/dev-bot-private-key \
  --region us-east-1 \
  --type SecureString \
  --value "$(cat /path/to/your-app.private-key.pem)" \
  --overwrite
```

`put-parameter --overwrite` is idempotent — the same command creates the parameter or rotates an existing one:

```bash
AWS_PROFILE=your-aws-profile aws ssm put-parameter \
  --name /agent-loop/dev-bot-private-key \
  --region us-east-1 \
  --type SecureString \
  --value "$(cat /path/to/new-key.pem)" \
  --overwrite
```

These parameters are org-wide. Subsequent machines only need the one-time machine setup unless they are responsible for token minting.

---

## Usage from Claude Code / Codex

Use the installed `gh` normally for human work. Symphony-owned autonomous workers receive `GH_TOKEN` / `GITHUB_TOKEN` before launch, so plain `gh pr create ...` runs under the worker-scoped bot identity without any global command override. Use `gh-app-token` only when a deterministic script needs structured token metadata.

```bash
# Normal human path
gh pr view 42 --json state,url

# Fetch a JSON token envelope for Symphony or another deterministic script
AWS_PROFILE=your-aws-profile \
/YOUR/WORKSPACE/DIR/agent-config/bin/gh-app-token --identity developer

# Inside a Symphony developer worker after scoped auth injection
gh pr create \
  --title "[RIDDIM-XYZ]: short imperative description" \
  --body-file -   # reads body from stdin
```

If a pre-migration setup left a stale override symlink behind, re-run `setup-claude-env.sh` or remove it manually after confirming it points at the retired target:

```bash
[ "$(readlink ~/.local/bin/gh 2>/dev/null)" = "/YOUR/WORKSPACE/DIR/agent-config/bin/gh" ] && rm -f ~/.local/bin/gh
[ "$(readlink /usr/local/bin/gh 2>/dev/null)" = "/YOUR/WORKSPACE/DIR/agent-config/bin/gh" ] && rm -f /usr/local/bin/gh
```

---

## Security properties

- The App private key and installation token are held only in shell variables; never written to disk beyond a `mktemp` key file that is deleted on `EXIT`.
- No sensitive values are printed to stdout or stderr.
- Installation token lifetime is ≤ 9 minutes (well within GitHub's 10-minute cap).
- The installation id is discovered dynamically from the org endpoint — no hardcoded IDs.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Symphony worker `gh` commands use the wrong user | Worker-scoped `GH_TOKEN` / `GITHUB_TOKEN` was not injected or was overwritten before `gh` ran |
| `command not found: jq` (or `aws`, `curl`, `openssl`) | Missing prerequisite — install via Homebrew (`brew install jq awscli`) and re-run setup |
| `gh` resolves to an old agent-config path | A stale pre-migration symlink remains — re-run `setup-claude-env.sh` or remove the symlink if it points at `/YOUR/WORKSPACE/DIR/agent-config/bin/gh` |
| `failed to fetch secret` | `AWS_PROFILE=your-aws-profile` not configured, or the secret doesn't exist yet (run "First-time credential provisioning" above) |
| `failed to fetch installation` | App not installed on the `YourGithubOrg` org, or App ID is wrong |
| `could not parse installation token` | App lacks `pull_requests: write` or `contents: write` permissions |
| `gh: ... not logged in` inside a worker | `GITHUB_TOKEN` did not propagate during worker launch — check Symphony scoped-auth injection and `gh` version >= 2.x |
