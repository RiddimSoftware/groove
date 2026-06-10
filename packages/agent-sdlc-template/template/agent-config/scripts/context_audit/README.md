# context_audit

Reusable deterministic checks for repository agent-context files. This package
implements D1-D9 from `context/agent-context-standard.md`; CI and proactive
audit skills can import the same functions instead of reimplementing the rubric.

## Entrypoint

From the `agent-config` repo root:

```bash
python -m scripts.context_audit /YOUR/WORKSPACE/DIR/autopilot
```

If `scripts/` is on `PYTHONPATH`, the package can also be run as:

```bash
PYTHONPATH=scripts python -m context_audit /YOUR/WORKSPACE/DIR/autopilot
```

The positional argument may be a repo path, a registered repository name, or a
registered alias from `context/repositories.yaml`.

## Exit Codes

- `0` when no check returns `fail`.
- `1` when one or more checks return `fail`.
- `2` when the CLI cannot load inputs, such as a missing registry file.

Warnings do not fail the command.

## JSON Contract

Use `--format json` for machine consumers:

```bash
python -m scripts.context_audit autopilot --format json
```

Shape:

```json
{
  "repo_path": "/YOUR/WORKSPACE/DIR/autopilot",
  "registry_path": "/YOUR/WORKSPACE/DIR/agent-config/context/repositories.yaml",
  "results": [
    {
      "check_id": "D1",
      "status": "pass",
      "message": "D1: CLAUDE.md exists with 86 non-blank lines."
    }
  ],
  "summary": {
    "pass": 9,
    "warn": 0,
    "fail": 0,
    "skip": 0
  }
}
```

Each check result is stable: `{check_id, status, message}`. `status` is one of
`pass`, `fail`, `warn`, or `skip`. Messages are written as remediation text an
agent can act on directly.

## D5 Schema Tolerance (transitional)

D5 enforces the `## Project Snapshot` schema from the standard. To keep the
CI gate from blocking PRs on repos that predate the standard during rollout, the
parser also accepts the legacy snapshot layout and maps it onto the required
keys:

- `Tracker/project` → `Linear team`
- `Canonical repo path` → `Canonical path`
- `Primary stack` (under `## Local Setup`) → `Stack`
- `Install/build command` → `Build command`; `Test command` / `Symphony
  validation command` under `## Local Setup` fill `Test command` / `Verify
  command`
- a legacy snapshot with no `Status` is read as `active`

A file that supplies none of the required facts under either the canonical or
legacy spelling still fails D5, naming the missing key. As repos migrate to the
canonical schema, this tolerance can be removed.

## D6 Directory Heuristic

D6 treats a token in the Repository Map as a directory candidate only when it
has a clear path shape, to avoid failing on prose or inline-code mentions
(binary names, command flags). A token is checked against disk only when it:

- has a path separator (`docs/architecture`) or a trailing slash (`Sources/`),
  after stripping surrounding backticks/quotes and trailing prose punctuation;
- is not a file (anything ending in a known source/doc suffix is skipped);
- contains no template placeholder or glob characters (`<`, `>`, `*`, `?`, `|`).

A bare word like `symphonyd` (no separator, no trailing slash) is treated as
prose and never failed. Paths tagged `(planned)` are skipped.

## D7 Command Heuristic

Command resolution intentionally favors false negatives over blocking plausible
commands. It fails only when a recognized target is clearly absent:

- `make <target>` requires a Makefile with that target.
- `npm`/`pnpm`/`yarn`/`bun` scripts require `package.json` and the named script.
- `swift ...` requires `Package.swift`.
- `python ...` requires a Python project marker such as `pyproject.toml`,
  `pytest.ini`, `setup.cfg`, a requirements file, or `tests/`.
- `bundle ...` requires `Gemfile`.
- `xcodebuild` requires an `.xcodeproj` or `.xcworkspace`.
- `cargo ...` requires `Cargo.toml`.
- `go ...` requires `go.mod`.
- Local executable paths such as `./scripts/check.sh` must exist.

Unrecognized commands are treated as plausible and do not fail D7.
