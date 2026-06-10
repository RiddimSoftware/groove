# Agent Context Layer

This directory is the shared, version-controlled context layer for agents working under `/YOUR/WORKSPACE/DIR`.
It is intentionally tool-neutral: Claude, Codex, Cursor, Gemini, and future coding agents should be able to use it by reading plain Markdown and YAML.

## Term

Use **context engineering** for the discipline: designing what context an agent sees, what it can retrieve, and how that context is scoped over a task.
Use **agent context layer** for this repository's implementation of that discipline.

## Retrieval Protocol

Before multi-step or shared-state work, build a small task brief instead of loading all org context.

1. Identify the task type: implementation, review, planning, release, research, or maintenance.
2. Infer the target repository from explicit file paths, product names, issue IDs, PR URLs, domains, package names, or the current working directory.
3. Read `/YOUR/WORKSPACE/DIR/agent-config/context/repositories.yaml` only as a routing map; do not treat it as complete project documentation.
4. Read the target repository's `CLAUDE.md` first when present. Treat it as the source of truth even when the active tool is not Claude.
5. Read `AGENTS.md` when present as a compatibility shim. If it points to `CLAUDE.md`, follow that pointer.
6. If the active tool does not automatically expand `@/absolute/path` imports in `CLAUDE.md`, read those imported files manually before acting on the related instructions.
7. Read nearby subsystem instructions such as nested `CLAUDE.md`, nested `AGENTS.md`, package README files, architecture notes, or test docs only after the likely files are known.
8. Prefer retrieval by search (`rg`, repository docs, issue/PR connectors, and local files) over preloading broad documentation.
9. If the task appears to require more than one repository, pause before editing and name the repositories involved.
10. Keep durable handoff state in `.agent-state/`, issue comments, PR comments, or branch names rather than relying on chat history.


## AGENTS.md Discipline

Keep `AGENTS.md` short — target ~100 lines — and treat it as a **table of contents**, not an encyclopedia. It should serve as a map pointing to deeper sources of truth, not the source itself.

A monolithic `AGENTS.md` crowds out task context, makes every rule equally prominent (meaning no rule is salient), rots quickly as rules go stale, and cannot be mechanically validated. Agents end up pattern-matching locally instead of navigating intentionally.

Structure deeper knowledge as:
- Structured `docs/` subdirectories (design docs, product specs, architecture, references)
- Separate focused docs pointed to from `AGENTS.md`
- Optional `docs/agent/` files for task-specific context such as debugging playbooks or runbooks

Anything that lives only in Slack threads, calendar invites, or people's heads is invisible to agents. If a team decision or architectural pattern is not discoverable in the repository, it effectively does not exist for any agent run. Capture it in a version-controlled artifact.

## Context Budget

Keep always-loaded instructions small. Put stable rules in org instructions, repo-specific rules in each repo, and detailed design or operational knowledge in retrievable docs.

Good always-loaded context:
- Worktree and git safety rules
- Role boundaries
- Context routing protocol
- Shared tool conventions

Good retrieved-on-demand context:
- Project architecture
- Product-specific background
- Release procedures
- Debugging playbooks
- Historical decisions
- Long checklists

Read [`factory-change-management.md`](factory-change-management.md) when designing gates, rollouts, decommissioning work, autonomous-loop stop conditions, or any plan that would traditionally say "wait N days." The factory default is to encode the real confidence condition instead of inheriting human-org elapsed-time ceremony. Linear Projects should preserve one human-intervention surface, the Human Handoff issue, while every other issue remains autonomously implementable.

Read [`follow-up-protocol.md`](follow-up-protocol.md) when you observe concrete, actionable work outside your current ticket's scope and need to decide whether and how to file a follow-up Linear ticket.

## Operational Credentials

Use the AWS CLI profile `your-aws-profile` for agent-run Riddim Software operations that need org AWS access, including credential lookups from AWS Parameter Store. Prefer explicit commands such as `AWS_PROFILE=your-aws-profile aws ...` when running AWS commands from an agent session.

Do not assume product-named profiles such as `bettrack` are the correct agent credential profile; those may exist as legacy local aliases only.

See [`../docs/secret-management.md`](../docs/secret-management.md) for the org-wide policy: which credentials live in AWS vs. GitHub, which are mirrored across both, and the rotation procedure.

Gemini Code Assist wrappers that need local multi-seat profile rotation should use the profile registry contract in
[`docs/gemini-profile-registry.md`](../docs/gemini-profile-registry.md). The contract keeps local auth state under
`GEMINI_PROFILE_ROOT` and keeps secrets out of the repository.

To launch Gemini CLI with a specific profile, use `bin/run-gemini`:

```sh
run-gemini --profile primary            # interactive
run-gemini --profile primary -p "..."   # non-interactive
GEMINI_PROFILE=primary run-gemini       # via env var
```

`run-gemini` reads `$GEMINI_PROFILE_ROOT/registry.json` to validate the
requested key and resolve the local directory. See `bin/run-gemini --help` for
the full option reference.

## Repository Catalog

`repositories.yaml` is a routing map, not an architecture database. It should stay compact enough that agents can scan it at session start without dragging the whole organization into context.

Recommended fields:
- `name`, `path`, `remote`, and `default_branch`.
- `aliases` for product names, domain names, issue prefixes, and common shorthand.
- `context_files` for the first files to read after selecting the repo.
- `bootstrap_markers` for factual root-level files that hint at the stack, such as `package.json`, `Gemfile`, `Package.swift`, or `pyproject.toml`.
- `active: false` to mark inactive repos (stale trees with no agent-context files); omit for active repos. Inactive repos are skipped by D1/D4/D6/D7 presence checks in the context-audit skill and the AGENT-51 check library.

Avoid putting full build commands, architecture summaries, release checklists, or long project histories in the catalog. Put those in repo-local `CLAUDE.md`, `AGENTS.md`, `README.md`, or `docs/agent/` files.

## Cross-Tool Contract

Each repo should expose context through plain files:

- `CLAUDE.md` for the canonical source of truth. Despite the name, keep baseline repo context tool-neutral.
- `AGENTS.md` as a compatibility shim that points agents to `CLAUDE.md`.
- `README.md` for human and agent project overview.
- Optional nested `CLAUDE.md` files for large subsystems, with nested `AGENTS.md` shims when useful.
- Optional `docs/agent/` files for deeper task-specific context.

Avoid requiring a plugin, MCP server, or proprietary memory feature to understand the baseline project context. Those can improve retrieval, but the source of truth should remain version-controlled text.

## Execution Plans

For complex multi-step work, checked-in **execution plans** are preferable to chat-thread alignment. Plans checked into the repo are visible to all agents across context resets, accumulate a decision log future agents can audit, and survive the end of any single model session.

Suggested layout within a repo:
- `docs/exec-plans/active/` — in-progress plans with progress and decision logs
- `docs/exec-plans/completed/` — archived plans (preserved for audit trail)
- `docs/exec-plans/tech-debt-tracker.md` — intentionally deferred known debt

Use lightweight inline plans (a few bullet points in a Linear comment or PR description) for small changes. Graduate to a checked-in plan when the work spans multiple sessions, involves non-obvious sequencing, or requires alignment across more than one agent role.

## Minimum Repo Context

Do not create empty `CLAUDE.md` files. If a repo does not yet have canonical agent context, start from `/YOUR/WORKSPACE/DIR/agent-config/context/templates/minimum-repo-CLAUDE.md`.

The template is intentionally a small context intake form. Fill only facts supported by local evidence; leave explicit `TODO` or `Unknown` entries where the repo still needs discovery. This is better than inventing architecture or commands.

The **quality bar** a filled-in context file must meet — the three pillars (MAP / PROSE / STRUCT), the parseable `## Project Snapshot` schema, the deterministic vs. judgment checks, and the canonical+shim contract — is defined in [`agent-context-standard.md`](agent-context-standard.md). That standard is the spec the `context-audit` skill and the CI context-file validator mechanize; read it when authoring, auditing, or validating a repo's `CLAUDE.md`.
