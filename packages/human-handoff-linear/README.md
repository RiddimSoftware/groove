# human-handoff-linear

Linear workflow primitives for installing and maintaining the Human Handoff
issue template used by autonomous project workflows.

Today the package ships two real Linear commands:

- `doctor` — read-only auth and viewer/organization check.
- `sync-template` — provision the workspace-level `Human Handoff` issue
  template idempotently: create it if missing, update its body when the
  bundled markdown drifts, report no-change when already in sync.

`setup` and `bootstrap-project` remain scaffold-only and perform no Linear
mutations; later issues will wire them to the same `LinearWorkspace` adapter.

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
- `sync-template` — create or update the workspace-level `Human Handoff` issue
  template idempotently. Pass `--dry-run` to plan without writing.
- `setup`, `bootstrap-project` — scaffold-only today; reserved command surfaces
  that later issues will wire to real Linear mutations.

### `sync-template`

```text
$ human-handoff-linear sync-template
human-handoff-linear sync-template - syncing "Human Handoff" workspace template
Created workspace template "Human Handoff" (id: tpl_…)
human-handoff-linear sync-template complete - create performed (id: tpl_…)
```

Run it once to install the template; run it again after editing
`templates/human-handoff-issue-body.md` to push the new body. When the body
already matches what is in Linear, `sync-template` reports `no change` and
performs no write. It is safe to run from CI on every push.

```text
$ human-handoff-linear sync-template --dry-run   # plan-only, no writes
human-handoff-linear sync-template - syncing "Human Handoff" workspace template
[dry-run] Would update workspace template "Human Handoff" (id: tpl_…)
human-handoff-linear sync-template complete - update planned
```

The same Linear error codes that `doctor` returns also apply to
`sync-template` (auth → 3, permission → 4, rate-limit → 5, network → 6, other
API errors → 7).

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
import { readFile } from 'node:fs/promises';
import {
  createDoctorUseCase,
  createLinearGraphqlWorkspace,
  createSyncTemplateUseCase,
} from 'human-handoff-linear';

const workspace = createLinearGraphqlWorkspace({ apiKey: process.env.LINEAR_API_KEY });
const reporter = { info: console.log, error: console.error };

// Read-only auth check
const doctor = createDoctorUseCase({
  reporter,
  secretReader: { read: (name) => process.env[name] },
  workspace,
});
const auth = await doctor();
if (!auth.ok) process.exit(1);

// Idempotent template sync
const templateBody = await readFile('./templates/human-handoff-issue-body.md', 'utf8');
const sync = createSyncTemplateUseCase({ reporter, templateBody, workspace });
const result = await sync({ dryRun: false });
// → { action: 'create' | 'update' | 'no-change', templateId, mutationsPerformed, ... }
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
