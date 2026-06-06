# human-handoff-linear

Linear workflow primitives for installing and maintaining the Human Handoff
issue template used by autonomous project workflows.

This package is still a contract shell — most commands (`setup`,
`sync-template`, `bootstrap-project`) are dry-run/no-op scaffolds awaiting
later issues. The `doctor` command, however, performs a real Linear auth check
through the GraphQL adapter, and the underlying `LinearWorkspace` adapter
implements the full surface those later commands will use.

## Requirements

- Node.js 20+
- A Linear personal API key. Create one at
  <https://linear.app/settings/api>.

## Auth

The CLI reads the API key from the `LINEAR_API_KEY` environment variable.

```bash
export LINEAR_API_KEY=lin_api_…
```

If the variable is unset and you run from an interactive terminal, the CLI
prompts for the key without echoing it. Pass `--no-prompt` to disable that
fallback (use in CI, where there is no TTY anyway). The key is never logged,
written to disk, or echoed back.

## CLI

```bash
npx human-handoff-linear --help
```

Subcommands:

- `doctor` — validate the Linear API token by fetching the current viewer and
  workspace. Read-only: never creates or updates templates, labels, issues, or
  relations.
- `setup`, `sync-template`, `bootstrap-project` — scaffold-only today; reserved
  command surfaces that later issues will wire to real Linear mutations.

### `doctor`

```text
$ human-handoff-linear doctor
human-handoff-linear doctor - validating Linear auth (read-only).
Linear token: present.
Authenticated as Ada Lovelace in workspace Riddim (riddim).
human-handoff-linear doctor complete - no mutations performed
```

Failure cases map to stable exit codes for scripting:

| Condition | Stderr prefix | Exit |
|---|---|---|
| `LINEAR_API_KEY` unset and `--no-prompt` (or non-TTY) | `LINEAR_API_KEY is not set` | 2 |
| HTTP 401 / GraphQL `AUTHENTICATION_ERROR` | `[auth]` | 3 |
| HTTP 403 / GraphQL `FORBIDDEN` | `[permission]` | 4 |
| HTTP 429 / GraphQL `RATELIMITED` | `[rate_limit]` | 5 |
| Network/transport failure | `[network]` | 6 |
| Other GraphQL or HTTP error | `[api]` | 7 |
| Other / unknown | (no prefix) | 1 |

## Application API

The CLI adapter is deliberately thin. Core behavior is available as use-case
modules with injected ports:

```js
import {
  createBootstrapProjectUseCase,
  createDoctorUseCase,
  createLinearGraphqlWorkspace,
  createSetupUseCase,
  createSyncTemplateUseCase,
} from 'human-handoff-linear';

const workspace = createLinearGraphqlWorkspace({ apiKey: process.env.LINEAR_API_KEY });
const doctor = createDoctorUseCase({
  reporter: { info: console.log, error: console.error },
  secretReader: { read: (name) => process.env[name] },
  workspace,
});
const result = await doctor();
if (!result.ok) process.exit(1);
```

Ports are plain objects:

- `ConsoleReporter` — receives `info`, `error`, and optional `verbose` messages.
- `SecretReader` — resolves secrets such as `LINEAR_API_KEY`.
- `LinearWorkspace` — adapter boundary for Linear workspace operations.

The full LinearWorkspace surface (`getViewer`, `listTeams`, `listLabels`,
`createLabel`, `getTemplate`, `createTemplate`, `updateTemplate`,
`createIssue`, `createRelation`) is implemented by
`createLinearGraphqlWorkspace`. Later mutating commands build on these
methods; they do not implement their own GraphQL.

Core use-case modules do not read environment variables, call `fetch`, or
exit the process. Those responsibilities stay in CLI/adapter code (enforced
by `tests/boundary.test.mjs`).

## Template

The public template lives at
`templates/human-handoff-issue-body.md`. It preserves the Human Handoff setup
contract in tracker-safe wording: one project-level handoff issue, read-only
prep on that issue, two terminal writes, agent-actionable vs. human-only
checkbox classes, and append-only blocker/verification sections.
