# human-handoff-linear

Linear workflow primitives for installing and maintaining the Human Handoff issue
template used by autonomous project workflows.

This package is intentionally a contract shell. It exposes the CLI and importable
use-case boundaries that future work will wire to real Linear GraphQL mutations.
Current commands are dry-run/no-op unless stated otherwise.

## Requirements

- Node.js 20+
- A Linear API token for future mutation-backed commands. The current scaffold
  does not require a token for help, routing, or no-op checks.

## CLI

```bash
npx human-handoff-linear --help
```

Subcommands:

- `setup` - validate the package contract and report the future Linear template
  setup plan. No Linear mutations are performed in this scaffold.
- `sync-template` - report the checked-in Human Handoff issue body template that
  future work will sync into Linear.
- `doctor` - check local CLI readiness without contacting Linear.
- `bootstrap-project` - reserve the project bootstrap command surface for later
  implementation.

All commands are safe for non-interactive use. Unknown commands fail with a
terse message and do not require a Linear token.

## Application API

The CLI adapter is deliberately thin. Core behavior is available as use-case
modules with injected ports:

```js
import {
  createBootstrapProjectUseCase,
  createDoctorUseCase,
  createSetupUseCase,
  createSyncTemplateUseCase,
} from 'human-handoff-linear';
```

Ports are plain objects:

- `ConsoleReporter` - receives `info`, `error`, and optional `verbose` messages.
- `SecretReader` - resolves secrets such as `LINEAR_API_KEY`.
- `LinearWorkspace` - future adapter boundary for Linear workspace/template
  operations.

Core use-case modules do not read environment variables, call `fetch`, or exit
the process. Those responsibilities stay in CLI/adapter code.

## Template

The public template lives at
`templates/human-handoff-issue-body.md`. It preserves the Human Handoff setup
contract in tracker-safe wording: one project-level handoff issue, read-only
prep on that issue, two terminal writes, agent-actionable vs. human-only
checkbox classes, and append-only blocker/verification sections.
