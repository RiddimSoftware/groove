# Autopilot Workflow Test Harness Contract

This document defines the shared test harness contract for Autopilot workflow repositories
(`autopilot`, `agent-config`, `riddim-release`). Follow it before writing or modifying
any workflow behavior so that follow-up work has one target rather than inventing conventions
per repo.

## 1. Local test command

Every Autopilot workflow behavior that can be tested locally must expose a single runnable command
from the repo root:

```bash
# Shell-based behaviors
bash tests/test-<behavior>.sh

# Node-based behaviors
node .github/scripts/<use-case>.test.js

# Python-based behaviors
python -m pytest tests/test_<behavior>.py -x
```

The command must exit 0 on success and non-zero on failure with a human-readable message. It
must not require live GitHub, AWS, App Store Connect, or network access. CI runs these commands
unattended.

## 2. Fixture layout

```
tests/
  test-<behavior>.sh          # Shell harness for shell-based use cases
  fixtures/
    <behavior>/
      <scenario-name>.json    # Static input data for a scenario
      <scenario-name>.env     # Optional env vars for the scenario
.github/
  scripts/
    <use-case>.js             # Pure decision logic (no I/O)
    <use-case>.test.js        # Node test driver (if the use case is JS)
```

Shell test files live in `tests/` alongside examples such as `test-gh-app-token.sh` and
`test-workflow-sync-push.sh`. Pure decision scripts live in `.github/scripts/`.

When fixture files are not needed (the harness writes its own inline stubs), the `fixtures/`
subdirectory can be omitted for that behavior.

## 3. Fake-port pattern

All edge capabilities — `gh`, `git`, `aws`, `curl`, `sleep`, filesystem mutation — are
represented as fakeable ports by overriding `PATH` with a directory of lightweight shell stubs.
This is the established pattern in `agent-config/tests/`.

### Pattern

```bash
FAKE_BIN="$(mktemp -d)/fake"
mkdir -p "$FAKE_BIN"

# Write a fake for each edge dependency
cat > "$FAKE_BIN/gh" <<'SH'
#!/bin/bash
printf 'args=%s\n' "$*" >> "$GH_TEST_LOG"
# Return fixture output based on args
case "$*" in
  "pr list"*)  printf '[{"number":42,"title":"test pr"}]' ;;
  *)           exit 1 ;;
esac
SH
chmod +x "$FAKE_BIN/gh"

# Execute the use case with the fake PATH
PATH="$FAKE_BIN:/usr/bin:/bin" bash .github/scripts/my-use-case.sh
```

### Rules

- Each fake binary uses a `case "$*"` switch on the full argument string.
- Fakes return static fixture data; they never call the real binary.
- If a fake is called with unrecognized arguments, it exits 1 so tests fail loudly.
- Fakes write to a log file only when the test needs to assert that a call was made (e.g.,
  `printf 'args=%s\n' "$*" >> "$TEST_LOG"`).
- Never mount live tokens or real credentials in a test. Use fixed strings like `fake-token`,
  `fake-private-key`, or `bot-token`.

### Port inventory by edge capability

| Capability | Fake approach |
|---|---|
| `gh` (GitHub CLI) | Shell stub via `$FAKE_BIN/gh`; `case "$*"` on subcommand |
| `aws` Parameter Store | Shell stub via `$FAKE_BIN/aws`; return fake parameter value by name |
| `curl` GitHub API | Shell stub via `$FAKE_BIN/curl`; `case "$url"` on the last arg |
| `jq` JSON parser | Shell stub via `$FAKE_BIN/jq`; `case "$*"` on filter expression |
| `openssl` signing | Shell stub; return `encoded`/`signature` literals |
| `git` commands | Use a real git repo in `$(mktemp -d)`; `git -C "$REPO_DIR" ...` |
| `sleep` | Override with a no-op stub if timing is tested; otherwise remove from the hot path |
| Filesystem mutation | Write to `$(mktemp -d)`; never touch repo source tree |
| Clock/timestamps | Pass a fixed ISO-8601 string as an argument; do not call `date` in use-case logic |

## 4. Live-test boundary

A test is "live" if it calls any of the following without a fake:

- GitHub API (REST or GraphQL)
- GitHub Actions hosted runner
- AWS Parameter Store
- App Store Connect API
- Any external HTTP endpoint

Live tests must be opt-in: guarded by an environment variable such as `RIDDIM_LIVE_TESTS=1` and
excluded from CI by default. Document the guard clearly in the test file header.

```bash
# Live tests require real credentials and hit the GitHub API.
# Run only manually: RIDDIM_LIVE_TESTS=1 bash tests/test-foo-live.sh
[[ "${RIDDIM_LIVE_TESTS:-}" == "1" ]] || { echo "Skipping live tests"; exit 0; }
```

Non-live tests — those using the fake-port pattern — must always run in CI without any guard.

## 5. Driver shape: thin YAML, fat script

GitHub Actions YAML files must not own application policy. The YAML layer calls a script or
CLI; the script owns all decision logic.

**Correct pattern:**

```yaml
# .github/workflows/reviewer-gate.yml
jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run reviewer gate
        run: bash .github/scripts/reviewer-gate.sh
        env:
          PR_NUMBER: ${{ github.event.pull_request.number }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

```bash
# .github/scripts/reviewer-gate.sh  ← application policy lives here
pr_number="${PR_NUMBER:?}"
# ...decision logic...
```

**Incorrect pattern:** inline `if:` expressions, multi-step bash, or any conditional logic
inside the YAML file itself.

The YAML file's job is to: check out the repo, supply secrets as environment variables, and
invoke the script. Nothing else.

This boundary means `.github/scripts/` files can be executed locally against fakes without
a runner.

## 6. Clean Architecture Shape template

Use this template in Linear issue descriptions for any behavior-changing Autopilot workflow issue.

```markdown
## Clean Architecture Shape

Use case:
* `<UseCaseName>` — new / updated.

Entities / value objects:
* `<Entity>` — brief description.

Ports (interfaces this use case needs):
* `<PortName>` — what capability it abstracts (e.g., "read PR metadata from GitHub").

Adapters (implementations of ports):
* `GitHub CLI adapter` — calls `gh` with the required args.
* `Filesystem adapter` — reads/writes files under `.github/`.

Fake ports (for tests):
* `Fake<PortName>` — shell stub that returns fixture data; lives in `tests/`.

Boundary rule:
* GitHub Actions, `gh`, `git`, AWS, ASC, filesystem, clocks, and hosted runners are
  edge details. The use case must not import or call them directly.

Test command:
* `bash tests/test-<behavior>.sh`
```

## 7. Reference examples

### Reviewer policy (`autopilot`)

`autopilot/Sources/AutopilotCore/ReviewPullRequest.swift` is the reference pure
decision slice for Autopilot reviewer policy. It:
- takes PR metadata, linked issue context, and repo conventions as plain values
- returns a structured `ReviewVerdict`
- is tested by Swift tests with fake adapters around all I/O

Apply the same principle to new shell-based use cases: extract the decision into a function
that receives all inputs as arguments and writes its result to stdout.

### Token minting (`agent-config`)

`tests/test-gh-app-token.sh` fakes `aws`, `curl`, `jq`, and `openssl` via `$FAKE_BIN`. The
test asserts that the helper emits the expected JSON token envelope and fails closed on
login mismatch or missing dependencies. This is the canonical shell fake-port example in
this repo.

### Workflow sync push (`agent-config`)

`tests/test-workflow-sync-push.sh` fakes `aws`, `curl`, and `jq`, constructs a real
`git` repo in `$(mktemp -d)`, and asserts on output strings. It covers both happy paths
and refusal cases (wrong permissions, disallowed paths).

## 8. Verification checklist

Before opening a PR that adds or changes workflow behavior:

- [ ] A `tests/test-<behavior>.sh` (or equivalent) exists and exits 0 locally.
- [ ] No live calls are made from the non-live test.
- [ ] The YAML file delegates to a script; no policy logic is inline in the YAML.
- [ ] `actionlint .github/workflows/*.yml` passes.
- [ ] The Linear issue description includes the Clean Architecture Shape template (§6).
