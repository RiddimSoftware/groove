---
name: pr
description: Resolve GitHub pull request feedback and merge conflicts. Use when the user invokes "pr", "$pr", or asks Codex to fix a PR from a GitHub PR URL, a PR number plus repository, or a PR number in the current repo; includes parsing review comments and issue comments, handling the no-review case, resolving conflicts with the base branch, committing fixes, pushing back to the PR branch, and reporting verification.
---

# PR

## Overview

Use this skill to take an existing GitHub PR from "needs attention" to "ready for review" by addressing actionable comments when present and resolving base-branch conflicts even when no review has happened yet. Work in a dedicated worktree; keep the repository root on a clean `origin/main`. If the root checkout is on another branch, dirty, or has untracked files, nuke it back to a clean `origin/main` per [worktree-discipline.md](/YOUR/WORKSPACE/DIR/agent-config/worktree-discipline.md) — the cost of friction is higher than the cost of lost root-only state.

## Environment

You have access to:

- **AWS CLI** — `AWS_PROFILE=your-aws-profile` is the org credential. Org secrets (Linear, App Store Connect, bot tokens) live in AWS Parameter Store (`us-east-1`). The Bash tool's non-interactive shell skips `~/.zshrc`, so `export AWS_PROFILE=your-aws-profile` before any `aws` call in the session.
- **Linear** — prefer the Linear MCP for reads; fall back to direct GraphQL using the API token at `/linear/api-token` in AWS Parameter Store when MCP coverage is insufficient.
- **App Store Connect API** — credentials at `/appstore/connect-api` in AWS Parameter Store. Use for ASC reads/writes (app metadata, reviews, ratings, in-app events) when a PR touches iOS app-store artifacts.
- **GitHub CLI (`gh`)** — defaults to `YourGithubOrg` for ambiguous repo names.
- **All org repositories** under `/YOUR/WORKSPACE/DIR/`. Routing map: [`/YOUR/WORKSPACE/DIR/agent-config/context/repositories.yaml`](/YOUR/WORKSPACE/DIR/agent-config/context/repositories.yaml).

## Inputs

Accept any of these forms:

- Full PR URL: `https://github.com/YourGithubOrg/repo/pull/123`
- Repo plus number: `YourGithubOrg/repo#123`, `repo PR 123`, or `repo 123`
- Number only: infer the repo from the current git remote. If the current directory is not inside a repo, ask for the repo.

Default the GitHub owner to `YourGithubOrg` when the user provides a repo name without an owner.

## Workflow

### 1. Resolve and inspect the PR

Use the GitHub app tools when available; otherwise use `gh`. Gather:

- Repository owner/name, PR number, URL, title, author, base branch, head repo, head branch, draft state, mergeability, and conflict status.
- PR body and linked issue/ticket references.
- Review decision and reviewer comments.
- Issue comments on the PR.
- Review threads, especially unresolved threads. Prefer thread-aware reads through GraphQL or the GitHub connector when available; flat comment lists can miss resolution state.

If the PR has not been reviewed and has no comments, say so briefly and still continue to conflict detection and local verification.

Once the PR number, repo name, and owner are known, call `mcp__ccd_session__mark_chapter` with title formatted as `owner/repo #<number>` (e.g. `YourGithubOrg/bettrack #42`) so the chat title reflects the PR being worked on.

### 2. Prepare a dedicated worktree

Read the repo's `AGENTS.md` and/or `CLAUDE.md` before editing.

If a root checkout exists, ensure it is on a clean `origin/main` before creating or reusing the PR worktree. If the root is on a non-`main` branch, in detached HEAD, dirty, or has untracked files, nuke it back to a clean `origin/main`:

```bash
git -C <repo-root> fetch origin main
git -C <repo-root> switch main 2>/dev/null || git -C <repo-root> checkout -B main origin/main
git -C <repo-root> reset --hard origin/main
git -C <repo-root> clean -fdx
```

This is destructive on purpose — local commits on `main`, unstaged edits, and untracked files in the root are discarded. If you suspect the root contains work the user wanted preserved, stash it first (`git -C <repo-root> stash push -u -m "pre-nuke <date>"`) before the reset so it's recoverable; otherwise just nuke. Then continue in the dedicated PR worktree.

Create or reuse a clearly named worktree for the PR, for example:

```bash
git fetch origin
git worktree add ../<repo>-pr-<number> origin/<base-branch>
cd ../<repo>-pr-<number>
gh pr checkout <number>
```

If `gh pr checkout` cannot check out the contributor branch, fetch the PR head into a local branch and note whether pushing back requires fork permissions.

Before editing, record the initial status and branch:

```bash
git status --short
git branch --show-current
```

Do not overwrite or revert unrelated user changes in an existing worktree.

### 3. Build the fix list

Classify every PR signal:

- **Actionable:** requested code changes, failing behavior described by reviewers, required docs/tests, requested conflict resolution.
- **Already addressed:** comments on code that no longer exists, suggestions already implemented, resolved threads.
- **Question / non-actionable:** design discussion, praise, opinions without a requested change.

When comments conflict with each other or with acceptance criteria, choose the smallest coherent fix and call out the tradeoff in the final response.

### 4. Resolve conflicts

If GitHub reports conflicts or the branch is behind the base branch, bring the base branch into the PR branch inside the worktree:

```bash
git fetch origin <base-branch>
git merge origin/<base-branch>
```

Resolve conflicts by preserving the PR's intended behavior while accepting base-branch changes that are unrelated to the PR. After conflict resolution, run:

```bash
git status --short
git diff
```

For repos that require rebasing instead of merge commits, follow the project's local instructions. Otherwise prefer merge for conflict resolution because it preserves the PR branch history and is straightforward for review.

### 5. Implement review fixes

Make focused edits that directly correspond to the fix list. Add or update tests when comments identify behavior changes, regressions, or edge cases. Keep unrelated refactors out unless they are necessary to resolve the requested feedback cleanly.

If a comment is obsolete or impossible to satisfy safely, do not force a code change. Leave it for the summary with a concrete reason.

### 6. Verify

Run the narrowest meaningful local verification first, then broaden when the fix touches shared behavior. Prefer project-local commands from README, package scripts, Makefile, or repo instructions.

Always report commands and results. If verification cannot run because dependencies, secrets, services, or the platform are unavailable, report the blocker and the best substitute check that did run.

### 7. Commit, push, and comment

Commit only changes for this PR fix pass:

```bash
git status --short
git add -A
git commit -m "Address PR feedback"
git push
```

If the PR branch belongs to a fork and push fails, report the exact blocker and leave the local commit in the worktree.

After a successful push, add a new PR comment documenting the code changes made in this pass. Include:

- Which review comments or conflict areas were addressed.
- Files or modules changed, grouped by purpose.
- Tests or checks run.
- Anything intentionally left unchanged.

Use `gh pr comment <number> --body-file -` or the GitHub connector. Do this even when the only change was conflict resolution and there were no review comments.

### 8. Final response

Summarize:

- PR URL and branch updated.
- Comments addressed and conflicts resolved.
- Comments intentionally left unchanged, with reasons.
- Verification commands and outcomes.
- Push status and commit hash.
- PR comment status.

Do not wait for CI or a new human review unless the user explicitly asks.
