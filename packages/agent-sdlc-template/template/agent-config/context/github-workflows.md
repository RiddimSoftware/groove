## Autopilot Workflow Test Harness Contract

For the test harness contract that governs local testing, fake-port patterns, driver shape,
and the Clean Architecture Shape template for Autopilot workflow repos, see
[`docs/autopilot-workflow-test-harness.md`](docs/autopilot-workflow-test-harness.md).

## GitHub Workflow Discipline

Any commit that adds or changes files under `.github/workflows/` must include local verification before the change is pushed to `main` or merged.

### Mandatory: actionlint before every workflow commit

**Run `actionlint` on every changed workflow file before committing.** This is enforced by a pre-commit hook registered globally in `agent-config/hooks/pre-commit`. The hook runs automatically on `git commit` and blocks the commit if any errors are found.

```bash
# Run manually at any time:
actionlint .github/workflows/*.yml

# Install if missing:
brew install actionlint
```

The pre-commit hook lives in `agent-config/git-hooks/pre-commit` and is wired globally via `git config --global core.hooksPath`. If you are working on a new machine, run `agent-config/scripts/setup-claude-env.sh` to register it.

**Do not bypass the hook** (`--no-verify`) unless you have already confirmed the error is a false positive and left a comment in the workflow file explaining why. Actionlint failures in CI are a hard blocker and wasted runner time — catch them locally.

Common actionlint mistakes to avoid:
- Double quotes inside `${{ }}` expressions — use single quotes: `${{ vars.X || '["a","b"]' }}`
- Multi-line bash strings with un-indented continuation lines inside `run: |` — use `printf` or heredocs
- Wrong secret names declared as `required: true` — GitHub validates these at startup before any `if:` guard
- Unused shell variables — remove them or prefix with `_`

### Broader local verification

- Test the affected workflow jobs in an environment that closely mimics the GitHub Actions runner and event context, such as `act`, a matching container or VM, or a project-approved local runner.
- Provide required workflow inputs, environment variables, and test-safe secrets locally so the workflow can actually execute instead of only passing static validation.
- Capture the local verification command and result in the PR, ticket, or review notes.
- Do not use production GitHub Actions runs as the first place to debug workflow logic. If a workflow cannot be locally verified because of platform constraints, unavailable secrets, or external service limits, stop and surface the blocker before pushing to `main` or merging.

## GitHub Mutation Discipline

For non-PR GitHub mutations (e.g., environment creation, repository settings changes, or org-level configuration), we use a `workflow_dispatch` audit pattern.

Before implementing a mutation, read the canonical instructions and use the templates in [`mutations/README.md`](../mutations/README.md).

### Core principles for mutations

- **Auditability**: Every mutation must be performed by a temporary GitHub Actions workflow merged into `main`.
- **Control**: Mutations are triggered manually via `workflow_dispatch` after merge, never automatically on push.
- **Idempotency**: Mutation scripts must check the current state before applying changes.
- **Cleanliness**: Workflows must be **disabled** (not deleted) after successful verification to preserve the audit trail while keeping the active workflow list clean.

## PR Checks Are the Autonomous Development Quality Gate

Required status checks on `main` are the primary mechanism by which autonomous development stays safe. Every merged PR has been validated by at least one automated quality gate before touching `main`. Without required checks, the autonomous loop can merge broken code silently.

### For agents: how to handle CI failures

A CI failure is a **code failure**, a **resolvable config gap**, or an **infrastructure failure**. Treat them differently:

| Failure type | Examples | Correct response |
|---|---|---|
| **Code failure** | lint error, build error, validate.py finding, Lighthouse budget breach | Fix the code and push to the PR branch |
| **Resolvable config gap** | missing GitHub repo variable/secret whose value the agent can compute or retrieve | Set the value directly using `gh variable set` or `gh secret set`, then verify the workflow passes |
| **Human-only config gap** | missing variable requiring personal info, third-party credentials, or values only the human knows | Post a Linear comment with the exact action needed (variable name + where to set it). Do NOT delete or disable the failing step. Stop. |
| **Infrastructure failure** | runner permission denied, AWS IAM error, network timeout, actions/setup-X fails | Stop. Create a Linear infrastructure issue. Do NOT open PRs to fix it |

**Never fix a CI failure by deleting or disabling the failing step.** If a workflow step fails due to a config gap, either fix the gap or surface it — removing the step trades a visible failure for silent loss of functionality.

**Resolving config gaps with `gh`:**

The developer bot has permission to create and update GitHub repository variables and secrets. Run these commands **locally from the agent session** (not inside a GHA workflow — the runner has no `your-aws-profile` AWS profile). The `gh secret set` call writes the value into GitHub's secret store; the next GHA run picks it up via `${{ secrets.SECRET_NAME }}`.

```bash
# Set a repository variable (non-sensitive config)
gh variable set VARIABLE_NAME --body "value" --repo YourGithubOrg/<repo>

# Set a repository secret (sensitive config)
gh secret set SECRET_NAME --body "value" --repo YourGithubOrg/<repo>

# Pull a value from AWS Parameter Store (local your-aws-profile profile) then write to GH
VALUE=$(AWS_PROFILE=your-aws-profile aws ssm get-parameter \
  --name </parameter-name> --with-decryption --region us-east-1 \
  --query 'Parameter.Value' --output text | jq -r '.field')
gh secret set SECRET_NAME --body "$VALUE" --repo YourGithubOrg/<repo>
```

**When a config gap requires human action** (personal contact info, credentials not in AWS Parameter Store, values requiring judgment): post a Linear comment identifying the exact variable name and where to set it (e.g. "Settings → Variables → Repository variables"). Do not guess values or use placeholder data.

**Do not loop on infrastructure failures.** If a required check fails for a reason unrelated to the PR's code changes (same check was passing before your PR, or the failure message points to runner/secret/network issues), stop immediately. The fix is infrastructure-level, not code-level.

**How to identify infrastructure failures:**
- Error message mentions `/Users/runner` permission denied, secret not found, AWS credential error, or network timeout
- The check fails in seconds (setup phase) rather than minutes (actual build/test phase)
- The same check was passing on other recent PRs
- Your PR doesn't touch code that would plausibly cause the failure

## Org-wide `pr-build` gate contract

For any Riddim repository enrolled in the developer-bot PR loop, the required branch-protection check name is **`pr-build`**.

### Why this contract exists

GitHub uses the umbrella term **status checks** for two different mechanisms:
- **Checks API check runs** — what GitHub Actions workflows emit.
- **Commit Statuses API contexts** — the older status mechanism.

The historical required context name `success` is ambiguous because it can be read as a Commit Statuses API context instead of a GitHub Actions check run. To keep repo enrollment and branch protection unambiguous, new enrollments must require **`pr-build`**, not `success`.

### Required rules for enrolled repos

- Protect `main` (or the repo's default branch) with a required status check named **`pr-build`**.
- Do **not** configure a required branch-protection context named `success` for new enrollments.
- The workflow that produces `pr-build` must trigger on:
  - `pull_request`
  - `merge_group`
  - `workflow_dispatch`
- The required `pr-build` workflow must **not** use `paths`, `paths-ignore`, or equivalent event filters that can skip the workflow entirely and leave the required check pending.
- Each repository may choose the lightest-weight validation that still proves a PR is buildable for that repo shape.

### Repo-shape examples

These examples define the intent of the `pr-build` contract, not a single mandatory workflow implementation.

#### iOS app repo

Use `pr-build` for the fastest reliable compile-only validation, such as:
- `xcodebuild -workspace <App>.xcworkspace -scheme <App> -destination 'platform=iOS Simulator,name=iPhone 16' build`
- or the equivalent project-based build when the repo uses `.xcodeproj` instead of CocoaPods.

#### Swift package repo

Use `pr-build` for package compilation, such as:
- `swift build`
- optionally followed by a lightweight `swift test` if the package is small enough that tests are part of the basic gate.

#### Web / package repo

Use `pr-build` for the smallest reliable install + build validation, such as:
- `npm ci && npm run build`
- `pnpm install --frozen-lockfile && pnpm build`
- `bundle install && bundle exec rake assets:precompile` when the repo's minimal proof is a web build rather than a JavaScript package build.

### Trigger skeleton

```yaml
name: pr-build

on:
  pull_request:
  merge_group:
  workflow_dispatch:

jobs:
  pr-build:
    runs-on: ubuntu-latest
    steps:
      # repo-specific checkout / toolchain / build steps
```

The workflow name and the emitted required check should both resolve to `pr-build` so branch-protection setup stays obvious during repo enrollment.

## Context-file validation gate (opt-in)

The agent-context standard's deterministic checks (`D1`–`D9`, see
[`agent-context-standard.md`](agent-context-standard.md#deterministic-checks-the-validator--ci-gate))
are wired as a blocking per-PR gate so context drift is caught the moment a merge would
introduce it. The gate is **single-sourced** as a composite action in this repo,
[`.github/actions/context-validate`](../.github/actions/context-validate/action.yml), which
runs the [`scripts/context_audit`](../scripts/context_audit) CLI against the calling repo's
primary context file and exits non-zero on any `fail`. Failure output is the library's
agent-legible remediation text, so a Codex run can self-correct from the CI log alone.

`agent-config` is the reference consumer: its own `pr-build` runs the gate as a
`context-validate` job (see [`pr-build.yml`](../.github/workflows/pr-build.yml)).

### Why a composite action (not a `riddim-release` reusable workflow)

The recommended pattern was a reusable workflow in `riddim-release`, but the check library
and the `repositories.yaml` registry both live **in this repo**, and AGENT-50 (#169)
deliberately dropped agent-config's dependency on `riddim-release` reusable workflows. A
composite action keeps single-source/fan-out intact while (a) avoiding a disallowed
multi-repo change, (b) not reintroducing the cross-repo dependency #169 removed, and (c)
auto-vendoring the pinned library to every consumer — no repo copies the Python or
re-checks-out the library by hand.

### How a repo opts in

Rolling the gate out to the other repos is a follow-up (per their `pr-build` enrollment
issues), not done here. To opt a repo in, after the repo checks out its own tree, add one
step to its `pr-build` job:

```yaml
jobs:
  pr-build:
    runs-on: ...
    steps:
      - uses: actions/checkout@v4   # the repo under validation
      # ... the repo's own build/test steps ...
      - name: Validate agent-context file (D1-D9)
        uses: YourGithubOrg/agent-config/.github/actions/context-validate@main
```

Notes for consumers:
- The runner needs `python3` (3.10+); the action fails fast with a clear message if absent.
- The repo must have an entry in `context/repositories.yaml` whose `remote` matches its
  `origin` URL, so `D8`/`D9` resolve the registry record by remote in CI (the runner
  checkout path will not match the registry's absolute `path`).
- Cross-repo use requires the consumer's workflow to have read access to `agent-config`
  (it is in the same org); agent-config-self uses the local `./.github/actions/...` path and
  needs no extra access.
