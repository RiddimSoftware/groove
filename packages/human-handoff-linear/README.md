# human-handoff-linear

Linear workflow primitives for installing and maintaining the Human Handoff
issue template and team labels used by autonomous project workflows.

Today the package ships four real Linear commands:

- `doctor` — read-only auth and viewer/organization check.
- `setup` — ensure selected Linear teams have the `human-handoff` issue label.
- `sync-template` — provision the workspace-level `Human Handoff` issue
  template idempotently: create it if missing, update its body when the
  bundled markdown drifts, report no-change when already in sync.
- `bootstrap-project` — create (or reuse) the final Human Handoff issue for
  an existing Linear Project and wire `blocks` relations from every sibling
  implementation issue. Idempotent on every re-run.

## Requirements

- Node.js 20+
- A Linear personal API key. Create one at
  <https://linear.app/settings/api>.

## Auth

The CLI reads the API key from `LINEAR_API_KEY` or `LINEAR_API_TOKEN`.

```bash
export LINEAR_API_KEY=lin_api_...
```

The `doctor`, `sync-template`, and `bootstrap-project` commands can also
prompt for the key in an interactive terminal. The key is never logged,
written to disk, or echoed back.

## CLI

```bash
npx human-handoff-linear --help
```

Subcommands:

- `setup` - ensure selected Linear teams have the `human-handoff` issue label.
- `doctor` - validate the Linear API token by fetching the current viewer and
  workspace. Read-only: never creates or updates templates, labels, issues, or
  relations.
- `sync-template` — create or update the workspace-level `Human Handoff` issue
  template idempotently. Pass `--dry-run` to plan without writing.
- `bootstrap-project` — create or reuse the final Human Handoff issue for a
  Linear Project and wire `blocks` relations from every sibling implementation
  issue. Pass `--dry-run` to plan without writing.

### `setup`

```bash
npx human-handoff-linear setup --team GRV --team WEB
```

The command accepts team keys or Linear team UUIDs. Existing labels are detected
case-insensitively, so `Human-Handoff` satisfies the requirement and will not be
duplicated.

To preview changes:

```bash
npx human-handoff-linear setup --team GRV,WEB --dry-run
```

To ensure every Linear team visible to the API key:

```bash
npx human-handoff-linear setup --all-teams
```

Default label spec:

| Field | Default |
| --- | --- |
| Name | `human-handoff` |
| Color | `#f59e0b` |
| Description | `Marks the project issue where human-only blockers are tracked.` |

Override the defaults when a workspace needs different label metadata:

```bash
npx human-handoff-linear setup --team GRV \
  --color '#d97706' \
  --description 'Tracks human-only project blockers.'
```

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

### `bootstrap-project`

Bootstrap the final Human Handoff issue for an existing Linear Project, and
wire `blocks` relations from every sibling implementation issue so the HH
issue stays blocked until the rest of the project is complete.

```bash
# Apply (default): create the HH issue if missing and the missing blocks
# relations.
human-handoff-linear bootstrap-project --project <id-or-slug>

# Dry-run: report the HH create/reuse decision and every planned blocks
# relation without mutating Linear.
human-handoff-linear bootstrap-project --project <id-or-slug> --dry-run
```

Behavior:

- Looks up the Linear Project by id or slug and reads its issues.
- Resolves the target team from the project (pass `--team <key>` when the
  project spans multiple teams).
- Reuses any existing issue in the project that carries the `human-handoff`
  label; otherwise creates one titled `Human handoff for <Project name>`,
  applies the `human-handoff` label, attaches the `Human Handoff` template,
  starts it in the team's `Backlog` (or `Todo`) state, and leaves the estimate
  unset.
- For every non-HH sibling issue in the project, creates a `blocks` relation
  (sibling → HH) — skipping any relation that already exists. Re-running the
  command therefore never duplicates issues or relations.

Fails closed when the project, the `human-handoff` label, or the `Human
Handoff` template is missing. Install those primitives via `setup` and
`sync-template` before running `bootstrap-project`.

## Application API

The CLI adapter is deliberately thin. Core behavior is available as use-case
modules with injected ports:

```js
import { readFile } from 'node:fs/promises';
import {
  createBootstrapProjectUseCase,
  createDoctorUseCase,
  createLinearGraphqlWorkspace,
  createSyncTemplateUseCase,
  ensureHumanHandoffLabels,
} from 'human-handoff-linear';

const workspace = createLinearGraphqlWorkspace({ apiKey: process.env.LINEAR_API_KEY });
const result = await ensureHumanHandoffLabels({
  workspace,
  teamRefs: ['GRV'],
});

const reporter = { info: console.log, error: console.error };

// Read-only auth check
const doctor = createDoctorUseCase({
  reporter,
  secretReader: { read: (name) => process.env[name] },
  workspaceFactory: ({ apiKey }) => createLinearGraphqlWorkspace({ apiKey }),
});
const auth = await doctor();
if (!auth.ok) process.exit(1);

// Idempotent template sync
const templateBody = await readFile('./templates/human-handoff-issue-body.md', 'utf8');
const sync = createSyncTemplateUseCase({ reporter, templateBody, workspace });
const syncResult = await sync({ dryRun: false });
// → { action: 'create' | 'update' | 'no-change', templateId, mutationsPerformed, ... }

// Idempotent project HH-issue bootstrap
const bootstrap = createBootstrapProjectUseCase({ reporter, workspace, templateBody });
const bootstrapResult = await bootstrap({ project: 'prj_or_slug', dryRun: false });
// → { humanHandoff: { decision, issue, spec }, relations: { created, skipped, planned }, ... }
```

Ports are plain objects:

- `ConsoleReporter` - receives `info`, `error`, and optional `verbose` messages.
- `SecretReader` - resolves secrets such as `LINEAR_API_KEY`.
- `LinearWorkspace` - adapter boundary for Linear workspace operations.

The full LinearWorkspace surface (`getViewer`, `listTeams`, `listLabels`,
`createLabel`, `getTemplate`, `createTemplate`, `updateTemplate`,
`createIssue`, `createRelation`, `getProject`, `listProjectIssues`,
`listIssueRelations`, `listWorkflowStates`) is implemented by
`createLinearGraphqlWorkspace`. The mutating commands compose these methods;
they do not implement their own GraphQL.

Core use-case modules do not read environment variables, call `fetch`, or exit
the process. Those responsibilities stay in CLI/adapter code (enforced by
`tests/boundary.test.mjs`).

## Template

The public template lives at
`templates/human-handoff-issue-body.md`. It preserves the Human Handoff setup
contract in tracker-safe wording: one project-level handoff issue, read-only
prep on that issue, two terminal writes, agent-actionable vs. human-only
checkbox classes, and append-only blocker/verification sections.
