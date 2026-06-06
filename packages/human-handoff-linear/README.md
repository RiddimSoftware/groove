# human-handoff-linear

`human-handoff-linear` is a local CLI for installing and maintaining the
Human Handoff Linear primitive in a workspace. It gives autonomous project
workflows one predictable place to track human-only blockers while the rest of
the project remains agent-actionable.

The package currently manages four pieces of Linear setup:

- `doctor` validates the API key and workspace without mutating Linear.
- `sync-template` creates or updates the workspace-level `Human Handoff` issue
  template.
- `setup` ensures selected teams have the `human-handoff` issue label.
- `bootstrap-project` creates or reuses the final Human Handoff issue for a
  project and wires `blocks` relations from every sibling implementation issue.

## Install

Run directly with `npx`:

```bash
npx human-handoff-linear --help
```

Or install it as a CLI dependency:

```bash
npm install --save-dev human-handoff-linear
npx human-handoff-linear --help
```

When working from this repository, the workspace package can be run with:

```bash
npm --workspace human-handoff-linear test
node packages/human-handoff-linear/bin/human-handoff-linear.mjs --help
```

## Auth

The CLI uses a Linear personal API key for local setup. Create one in Linear at
`https://linear.app/settings/api`, then export it before running commands:

```bash
export LINEAR_API_KEY=lin_api_...
```

`setup` also accepts `LINEAR_API_TOKEN`. `doctor`, `sync-template`, and
`bootstrap-project` can prompt for the key in an interactive terminal. Pass
`--no-prompt` in CI or scripts to fail fast instead of prompting.

This is intentionally not a hosted Linear app yet. Today there is no OAuth
install flow, webhook endpoint, bot actor, or Linear Integration Directory
listing. The CLI runs locally under the API key you provide and can only access
what that key can access. A future hosted integration could replace local API
keys with OAuth and workspace installation, but that is outside this package's
current behavior.

## Minimal Setup

Use dry runs first so the intended Linear writes are visible before they happen:

```bash
# 1. Confirm the token can read the workspace. This never writes to Linear.
npx human-handoff-linear doctor --no-prompt

# 2. Plan label installation for the teams that will use Human Handoff.
npx human-handoff-linear setup --team GRV --dry-run

# 3. Apply label installation when the plan is correct.
npx human-handoff-linear setup --team GRV

# 4. Plan the workspace template sync.
npx human-handoff-linear sync-template --dry-run --no-prompt

# 5. Apply the workspace template sync.
npx human-handoff-linear sync-template --no-prompt

# 6. Plan the project handoff issue and blocks relations.
npx human-handoff-linear bootstrap-project --project <id-or-slug> --dry-run --no-prompt

# 7. Apply project bootstrap when the plan is correct.
npx human-handoff-linear bootstrap-project --project <id-or-slug> --no-prompt
```

For a multi-team workspace, pass `--team` more than once or comma-separate team
keys:

```bash
npx human-handoff-linear setup --team GRV --team WEB --dry-run
npx human-handoff-linear setup --team GRV,WEB
```

Use `--all-teams` only when the API key should install the label on every team
it can see.

## Command Reference

### `doctor`

```bash
npx human-handoff-linear doctor --no-prompt
```

`doctor` validates auth by fetching the current Linear viewer and organization.
It is read-only and never creates or updates templates, labels, issues, or
relations.

Successful output includes the authenticated user and workspace:

```text
human-handoff-linear doctor - validating Linear auth (read-only).
Linear token: present.
Authenticated as Ada Lovelace in workspace Riddim (riddim).
human-handoff-linear doctor complete - no mutations performed
```

Stable failure exit codes:

| Condition | Stderr prefix | Exit |
| --- | --- | --- |
| Missing token with `--no-prompt` or non-TTY stdin | `LINEAR_API_KEY is not set` | 2 |
| HTTP 401 or GraphQL `AUTHENTICATION_ERROR` | `[auth]` | 3 |
| HTTP 403 or GraphQL `FORBIDDEN` | `[permission]` | 4 |
| HTTP 429 or GraphQL `RATELIMITED` | `[rate_limit]` | 5 |
| Network or transport failure | `[network]` | 6 |
| Other GraphQL or HTTP error | `[api]` | 7 |
| Other unknown failure | no stable prefix | 1 |

### `setup`

```bash
npx human-handoff-linear setup --team GRV --dry-run
npx human-handoff-linear setup --team GRV
```

`setup` ensures each selected team has an issue label named `human-handoff`.
Team refs can be Linear team keys or UUIDs. Existing labels are matched
case-insensitively, so `Human-Handoff` satisfies the requirement and will not
be duplicated.

Default label metadata:

| Field | Default |
| --- | --- |
| Name | `human-handoff` |
| Color | `#f59e0b` |
| Description | `Marks the project issue where human-only blockers are tracked.` |

Override the label fields when a workspace needs different metadata:

```bash
npx human-handoff-linear setup --team GRV \
  --color '#d97706' \
  --description 'Tracks human-only project blockers.'
```

### `sync-template`

```bash
npx human-handoff-linear sync-template --dry-run --no-prompt
npx human-handoff-linear sync-template --no-prompt
```

`sync-template` installs the workspace-level `Human Handoff` issue template
from `templates/human-handoff-issue-body.md`. It is idempotent:

- Creates the template when it is missing.
- Updates the template body when the bundled markdown has changed.
- Reports `no change` when Linear already matches the bundled template.

Example dry-run output:

```text
human-handoff-linear sync-template - syncing "Human Handoff" workspace template
[dry-run] Would update workspace template "Human Handoff" (id: tpl_...)
human-handoff-linear sync-template complete - update planned
```

### `bootstrap-project`

```bash
npx human-handoff-linear bootstrap-project --project <id-or-slug> --dry-run --no-prompt
npx human-handoff-linear bootstrap-project --project <id-or-slug> --no-prompt
```

`bootstrap-project` prepares one existing Linear Project for the Human Handoff
pattern:

- Looks up the project by id or slug and reads its issues.
- Resolves the target team from the project. Pass `--team <key>` when the
  project spans multiple teams.
- Reuses any existing issue in the project with the `human-handoff` label.
- Otherwise creates `Human handoff for <Project name>`, applies the
  `human-handoff` label, attaches the `Human Handoff` template, starts it in
  the team's `Backlog` or `Todo` state, and leaves the estimate unset.
- Creates missing `blocks` relations from every non-handoff sibling issue to
  the Human Handoff issue.

Run `setup` and `sync-template` first. `bootstrap-project` fails closed when
the project, label, or template is missing rather than creating partial setup.

## Help

```bash
npx human-handoff-linear --help
```

The help output lists every command, common options, auth behavior, and mutation
policy. The CLI test suite includes smoke checks for this help text so command
names and documented options do not drift silently.

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
  dryRun: true,
});

const reporter = { info: console.log, error: console.error };

const doctor = createDoctorUseCase({
  reporter,
  secretReader: { read: (name) => process.env[name] },
  workspaceFactory: ({ apiKey }) => createLinearGraphqlWorkspace({ apiKey }),
});
const auth = await doctor();
if (!auth.ok) process.exit(1);

const templateBody = await readFile('./templates/human-handoff-issue-body.md', 'utf8');

const sync = createSyncTemplateUseCase({ reporter, templateBody, workspace });
const syncResult = await sync({ dryRun: true });
// { action: 'create' | 'update' | 'no-change', templateId, mutationsPerformed, ... }

const bootstrap = createBootstrapProjectUseCase({ reporter, workspace, templateBody });
const bootstrapResult = await bootstrap({ project: 'prj_or_slug', dryRun: true });
// { humanHandoff, relations, mutationsPerformed, dryRun, ... }
```

Ports are plain objects:

- `ConsoleReporter` receives `info`, `error`, and optional `verbose` messages.
- `SecretReader` resolves secrets such as `LINEAR_API_KEY`.
- `LinearWorkspace` is the adapter boundary for Linear workspace operations.

Core use-case modules do not read environment variables, call `fetch`, or exit
the process. Those responsibilities stay in CLI and adapter code, enforced by
`tests/boundary.test.mjs`.

## Template

The bundled template lives at `templates/human-handoff-issue-body.md`. It
preserves the Human Handoff setup contract in tracker-safe wording: one
project-level handoff issue, read-only preparation, two terminal writes,
agent-actionable versus human-only checkbox classes, and append-only blocker
and verification sections.
