# Workflow-sync bot and ruleset bypass

This runbook defines the direct-to-`main` path for generated workflow-shim fan-out.

## Current GitHub and AWS state snapshot

Verified on **May 6, 2026** with `gh api`:

- Org: `YourGithubOrg`
- Existing GitHub App installation for the shared workflow system:
  - App slug: `riddim-release`
  - App ID: `3537341`
  - Installation ID: `127940904`
  - Repository selection: `selected`
  - Selected repos as of **May 6, 2026**: `YourGithubOrg/riddim-release` only
  - Current repo permissions: `contents: read`, `metadata: read`
- Existing org default branch ruleset:
  - Ruleset ID: `15807103`
  - Name: `default`
  - Applies to: `~DEFAULT_BRANCH` on `~ALL` repositories
  - Current bypass actors: `OrganizationAdmin` only
  - Current PR rule: require pull request with 1 approval, squash merges only
- AWS Parameter Store:
  - Present as of **May 6, 2026** (SM names; PS canonical paths have leading `/`): `/agent-loop/dev-bot-app-id`, `/agent-loop/dev-bot-private-key`, `/agent-loop/workflow-sync-app-id`, `/agent-loop/workflow-sync-private-key`

The workflow-sync path should continue using a **selected-repo GitHub App identity**, not a broad human bypass for `your_usernamepurewal`.

## Current blockers as of May 6, 2026

The helper and AWS secret contract are now in place, but the live GitHub configuration still blocks direct-push verification:

- The `riddim-release` app installation is **selected-repo** but currently includes only `YourGithubOrg/riddim-release`, not the enrolled consumer repos from `riddim-release/repos.yaml` (`YourGithubOrg/s2s`, `YourGithubOrg/riddim-website`).
- The installation still exposes only `contents: read` and `metadata: read`; it does **not** yet have `workflows: write`.
- Org ruleset `15807103` still bypasses only `OrganizationAdmin`; the app is not yet a bypass actor.

Until those GitHub-side changes are made, `workflow-sync-push status` correctly fails for enrolled repos before any push attempt.

## Safety model

1. **GitHub App scope stays narrow.**
   - Install the workflow-sync app only on repositories enrolled in the shared workflow system.
   - Today that enrollment source of truth lives in `YourGithubOrg/riddim-release` `repos.yaml`.
2. **Ruleset bypass is for the app, not for humans.**
   - Add the GitHub App to the bypass list for the default-branch ruleset (or to a tighter repo ruleset if preferred).
   - Do not add a personal-user bypass as the steady-state solution.
3. **Path restriction is enforced by the sync tool.**
   - GitHub rulesets can bypass PR requirements for an app, but they do not replace a content-path policy.
   - The sync helper must refuse to push if any changed file is outside `.github/workflows/`.

## Required GitHub App permissions

The workflow-sync app needs the minimum repository permissions required to update workflow files directly:

- `Contents: write`
- `Workflows: write`
- `Metadata: read`

`Workflows: write` is required because the sync path updates files under `.github/workflows/`.

As of **May 6, 2026**, the existing `riddim-release` installation does **not** yet satisfy this requirement: it currently exposes `contents: read` and no `workflows: write` grant. Update the GitHub App permissions before attempting manual verification.

## AWS secret contract

Store the app credentials in AWS Parameter Store:

- Profile: `your-aws-profile`
- Region: `us-east-1`
- App ID parameter: `/agent-loop/workflow-sync-app-id`
- Private key parameter: `/agent-loop/workflow-sync-private-key`

Example provisioning commands:

```bash
AWS_PROFILE=your-aws-profile aws ssm put-parameter \
  --name /agent-loop/workflow-sync-app-id \
  --type SecureString \
  --region us-east-1 \
  --value "3537341"

AWS_PROFILE=your-aws-profile aws ssm put-parameter \
  --name /agent-loop/workflow-sync-private-key \
  --type SecureString \
  --region us-east-1 \
  --value "$(cat /path/to/riddim-release.private-key.pem)"
```

If the parameter already exists, rotate with `--overwrite`.

Explicitly set `AWS_PROFILE=your-aws-profile` when running these commands. Agent sessions can inherit product-specific profiles such as `bettrack`, which will otherwise make the helper look in the wrong AWS account context.

## Helper for the sync CLI

`bin/workflow-sync-push` is the narrow direct-push helper for generated workflow updates.

It:

- requires explicit opt-in with `RIDDIM_WORKFLOW_SYNC_PUSH=1`
- mints a short-lived GitHub App installation token from AWS Parameter Store
- verifies the installation exists on the target repo
- verifies the app has `contents: write` and `workflows: write`
- refuses to push unless every changed file is under `.github/workflows/`
- pushes the already-committed `HEAD` directly to the target branch

### Status / auth preflight

```bash
AWS_PROFILE=your-aws-profile \
RIDDIM_WORKFLOW_SYNC_PUSH=1 \
/YOUR/WORKSPACE/DIR/agent-config/bin/workflow-sync-push \
  status \
  --repo YourGithubOrg/s2s
```

`status` is read-only and may be run from the `agent-config` checkout to validate an enrolled consumer repo. `push` remains stricter: it must be run from a checkout whose `origin` matches the target repo.

### Dry-run validation

```bash
AWS_PROFILE=your-aws-profile \
RIDDIM_WORKFLOW_SYNC_PUSH=1 \
/YOUR/WORKSPACE/DIR/agent-config/bin/workflow-sync-push \
  push \
  --repo YourGithubOrg/s2s \
  --base origin/main \
  --dry-run
```

### Real direct push

```bash
AWS_PROFILE=your-aws-profile \
RIDDIM_WORKFLOW_SYNC_PUSH=1 \
/YOUR/WORKSPACE/DIR/agent-config/bin/workflow-sync-push \
  push \
  --repo YourGithubOrg/s2s \
  --base origin/main
```

## Ruleset configuration

Preferred policy:

- Keep the org default ruleset requiring PRs on default branches.
- Add the workflow-sync GitHub App as a bypass actor.
- Keep repository installation selection limited to enrolled repos.

Because the safety boundary is the sync tool's path allowlist, document this warning anywhere the bypass is configured:

> This bypass is only for generated workflow-shim syncs. Path restriction is enforced by the sync helper, not by a broad human bypass.

### Manual GitHub UI steps

1. Open `https://github.com/organizations/YourGithubOrg/settings/apps/riddim-release`
2. Confirm the app is installed on every repo currently enrolled in `riddim-release/repos.yaml` (`YourGithubOrg/s2s`, `YourGithubOrg/riddim-website`) and removed from any repo that is no longer enrolled
3. In the app settings, grant `Contents: Read and write` and `Workflows: Read and write`, then approve the permission update on the org installation if GitHub prompts for it
4. Open `https://github.com/organizations/YourGithubOrg/settings/rules/15807103`
5. Add the GitHub App `riddim-release` to the bypass list
6. Save the ruleset and record the change in the issue / PR notes

If the org-wide ruleset becomes too broad, create a dedicated repo ruleset for only the enrolled repos instead of granting wider human bypass.

## Manual verification checklist

### Success path

1. Pick an enrolled test repo.
2. Create a branch with only generated `.github/workflows/**` changes.
3. Commit the changes.
4. Run:

   ```bash
   AWS_PROFILE=your-aws-profile \
   RIDDIM_WORKFLOW_SYNC_PUSH=1 \
   /YOUR/WORKSPACE/DIR/agent-config/bin/workflow-sync-push \
     push \
     --repo YourGithubOrg/<repo> \
     --base origin/main \
     --dry-run
   ```

5. Confirm the helper lists only `.github/workflows/**` files.
6. Re-run without `--dry-run` and confirm the direct push to `main` succeeds.

### Refusal path

1. Add any non-allowlisted change (for example `README.md`).
2. Commit it on the same branch.
3. Re-run the helper.
4. Confirm it exits non-zero **before push** and prints the disallowed path list.

## Evidence commands used for this ticket

```bash
gh api /orgs/YourGithubOrg/installations
gh api /orgs/YourGithubOrg/rulesets/15807103
AWS_PROFILE=your-aws-profile aws ssm describe-parameters --region us-east-1
```
