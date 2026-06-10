# Org Agent Instructions

Org-level instructions for all Riddim Software work. Loaded automatically by Claude Code, and routed to Codex and other tools through generated `AGENTS.md` shims, for any session whose working directory is under `/YOUR/WORKSPACE/DIR/`. Sessions outside this directory do not load these instructions — that's intentional, so machine-wide `~/.claude/CLAUDE.md` stays scoped to truly cross-org things.

<!-- CANONICAL SOURCE OF TRUTH.
     Edit /YOUR/WORKSPACE/DIR/agent-config/CLAUDE.md and the imported fragments under /YOUR/WORKSPACE/DIR/agent-config/.
     Then run /YOUR/WORKSPACE/DIR/agent-config/scripts/sync-org-agent-instructions.sh.
     The sync script copies this manifest to /YOUR/WORKSPACE/DIR/CLAUDE.md and
     writes AGENTS.md compatibility shims for tools that do not load CLAUDE.md directly. -->

This file is intentionally lean. Always-loaded content covers safety, worktree discipline, GitHub defaults, and the routing protocol. Skills, ticket standards, workflow rules, and other deep context are loaded **on demand** — see "Skills" and "Task-specific context" below.

## Project Snapshot

- **Purpose:** Org-level agent policy, shared context files, and Symphony workflow config for Riddim Software; the canonical source for `CLAUDE.md` and its generated shims.
- **Primary users:** internal tooling — Claude Code, Codex, and Symphony agents.
- **Production surface:** infra
- **Stack:** Markdown policy/context; Bash + Python tooling.
- **Package manager:** N/A
- **Build command:** N/A
- **Test command:** `python3 -m pytest scripts/context_audit/`
- **Lint/Typecheck command:** `actionlint .github/workflows/*.yml`
- **Verify command:** `PYTHONPATH=scripts python3 -m context_audit .`
- **Linear team:** AGENT (issue prefix `AGENT-`)
- **Canonical path:** /YOUR/WORKSPACE/DIR/agent-config
- **Status:** active

## Repository Map

- `context/` — on-demand context files and the repo registry (`repositories.yaml`); the retrieved layer this file points into.
- `scripts/` — org-instruction sync, environment setup, and the `scripts/context_audit/` deterministic check library (D1–D9).
- `symphony/` — Symphony workflow manifests, shared config, and the default agent prompt.
- `mutations/` — auditable `workflow_dispatch` GitHub mutation scripts.
- `docs/` — retrieved-on-demand runbooks and deep references.
- Hooks: `hooks/` (Claude Code lifecycle) and `git-hooks/` (the global `pre-commit` actionlint gate).
- Helpers: `bin/` executables, `launchd/` plists for `symphonyd`, `agents/` personas, `schemas/` config schemas, `mcp/` client config.
- Doctrine and scorecard libraries read by the virtual-team skills — `architecture/`, `aso/`, `cx/`, `inspired/`, `krug/`, `transformed/`.
- `ui/` — org UI standards (doctrine, per-surface rules, scorecards). v1 covers CLI / script / terminal-style surfaces; web/mobile/other surfaces will be added as sibling files.
- `.github/workflows/` — CI; `pr-build` is the required gate, extended to run the `context_audit` checks via `.github/actions/context-validate`.

## Non-Interactive Shell Commands

**ALWAYS use non-interactive flags** with file operations to avoid hanging on confirmation prompts.

Shell commands like `cp`, `mv`, and `rm` may be aliased to include `-i` (interactive) mode on some systems, causing the agent to hang indefinitely waiting for y/n input.

**Use these forms instead:**
```bash
# Force overwrite without prompting
cp -f source dest           # NOT: cp source dest
mv -f source dest           # NOT: mv source dest
rm -f file                  # NOT: rm file

# For recursive operations
rm -rf directory            # NOT: rm -r directory
cp -rf source dest          # NOT: cp -r source dest
```

**Other commands that may prompt:**
- `scp` — use `-o BatchMode=yes` for non-interactive
- `ssh` — use `-o BatchMode=yes` to fail instead of prompting
- `apt-get` — use `-y` flag
- `brew` — use `HOMEBREW_NO_AUTO_UPDATE=1` env var

## Worktree discipline

Any interactive coding session that will edit tracked files or open a PR must run in a dedicated git worktree off `main`, not in the repository's root checkout. Create the worktree from the latest `origin/main` before making any edits.

- Never run `git checkout` or `git switch` to a feature branch in the root repo. The root's current branch and dirty state are not your concern.
- After a PR merges, remove only the worktree you created in this session. Never remove a worktree you did not create — it belongs to another session.

## PR lifecycle

PRs in this organization auto-merge as soon as CI passes, so by the time you return to one its branch is often already merged and gone. Pushing follow-up commits to amend such a PR will likely push to an already-merged branch.

Before pushing an updated local branch, check the PR's status first. If it has already merged, do not amend it — rebase your changes onto the latest `origin/main` and open a new PR.

## Fetch latest artifact state before referencing it

**High priority.** Before you describe, summarize, quote a status, or otherwise speak about the state of a specific Linear issue or GitHub PR, fetch its current state first in the same turn — do not rely on memory, earlier context, or what the user told you. Linear issues and PRs change underneath you (status flips, merges, new comments, reassignment), so treating prior context as current is how stale claims get made.

- Linear issues, projects, comments, initiatives: fetch via the Linear MCP tools (`get_issue`, `get_project`, `list_comments`, etc.) immediately before commenting on their state.
- GitHub PRs (and issues): fetch via `gh` (e.g. `gh pr view <n> --json state,mergeStateStatus,reviews,statusCheckRollup` ) or the GitHub API immediately before commenting on their state. This overlaps with **PR lifecycle** above — a PR you opened earlier may already be merged.
- If a fetch fails or you cannot confirm the live state, say the state is unverified rather than asserting a stale one.
- Merely linking an artifact by ID/URL without characterizing its state does not require a fetch; the moment you make any claim about its status, contents, or progress, fetch first.

## GitHub defaults

@/YOUR/WORKSPACE/DIR/agent-config/github-defaults.md

## Artifact authorship

Do not mention AI co-authorship, collaboration, assistance, or generation in commits, PR descriptions, PR comments, issue comments, release notes, changelogs, file headers, docs, or other project artifacts unless the user explicitly asks for that disclosure in that specific artifact.

Never add trailers or prose such as `Co-authored-by: Claude`, `Generated with Codex`, `Implemented with Gemini`, `Built by Cursor`, or similar references to AI tools, models, assistants, editors, or agents. Keep artifact authorship focused on the human or bot identity required by the repository workflow.

## Prose standard

Write all prose — issue bodies, PR descriptions, docs, error messages, help text, release notes, and any artifact with readable text — at the level of a **smart undergraduate CS or software engineering student**: programming fundamentals assumed, deep domain expertise not. Prefer plain words over jargon, concrete examples over abstract formulations, and short sentences over long ones. The goal is broad reach: experts can skim it, newcomers can follow it.

## When no skill is invoked

Default to a single-task collaborator: do exactly what the user asks, nothing more. Do not autonomously pick up tickets, review PRs, or cut releases. If the user invokes one of the trigger phrasings in the table below, run the matching skill before any of that skill's work. If the task changes a Git repository under `/YOUR/WORKSPACE/DIR/`, follow **Worktree discipline** above: do implementation work only from a sibling worktree off `main`, never by switching the root checkout to a feature branch.

## Skills — load on invocation

Skills are not pre-loaded. When the user invokes one of the trigger phrasings below, run the matching skill before doing any of that skill's work. Each skill is self-contained and pulls in its own dependencies (linear-standards, clean-architecture, etc.) only when needed.

| Trigger phrasing | Skill to invoke |
|---|---|
| `autonomous-developer`, `dev`, "implement \<issue\>" | `developer` |
| `autonomous-backlog-team`, `backlog team`, "brainstorm / refine backlog" | `backlog-team` |
| `autonomous-aso-team`, `aso team`, "ASO scorecard for \<product\>" | `aso-team` |
| `autonomous-customer-team`, `customer team`, `cus team`, "CX scorecard for \<product\>" | `customer-team` |

If the active tool does not surface skills, the canonical skill text lives at `/YOUR/WORKSPACE/DIR/skills/<name>/SKILL.md` — read that file directly.

## Task-specific context — load on demand

Read these only when the task matches. Do not preload them.

| Task trigger | Read |
|---|---|
| Editing files under `.github/workflows/` | [`/YOUR/WORKSPACE/DIR/agent-config/context/github-workflows.md`](context/github-workflows.md) — actionlint requirement, `pr-build` gate contract, local verification rules |
| Creating or editing Linear issues, projects, comments, or initiatives | [`/YOUR/WORKSPACE/DIR/agent-config/context/linear-standards.md`](context/linear-standards.md) — required sections, Clean Architecture Shape, link format |
| Behavior-changing implementation, architecture review, or use-case-shaped issue work | [`/YOUR/WORKSPACE/DIR/agent-config/context/clean-architecture.md`](context/clean-architecture.md) |
| Designing gates, rollouts, decommissioning work, or workflow waits | [`/YOUR/WORKSPACE/DIR/agent-config/context/factory-change-management.md`](context/factory-change-management.md) — complexity over time, confidence gates, reversible change, autonomous loop stop conditions |
| Planning, decomposing, or kicking off a Linear Project for autonomous implementation; setting up project acceptance tests or the completeness gate | [`/YOUR/WORKSPACE/DIR/agent-config/context/project-tdd-workflow.md`](context/project-tdd-workflow.md) — end-to-end project-level TDD: composition-root contract, non-required acceptance gate, test-first lanes, human-handoff ratchet, contract-not-scaffold |
| Picking the target repo for an issue, or routing implementation work | [`/YOUR/WORKSPACE/DIR/agent-config/context/repositories.yaml`](context/repositories.yaml) — repo registry |
| Autopilot workflow test harness contract / Clean Architecture Shape template | [`docs/autopilot-workflow-test-harness.md`](docs/autopilot-workflow-test-harness.md) |
| Creating or editing GitHub mutations | [`mutations/README.md`](mutations/README.md) — lifecycle, naming, and templates |
| Discovering out-of-scope or blocking work in any skill invocation | [`/YOUR/WORKSPACE/DIR/agent-config/context/follow-up-protocol.md`](context/follow-up-protocol.md) — when and how to file follow-up tickets, de-dup rule, breadcrumb requirement |
| Rotating, adding, or auditing org credentials (AWS Parameter Store, GitHub org/repo secrets) | [`/YOUR/WORKSPACE/DIR/agent-config/docs/secret-management.md`](docs/secret-management.md) — canonical store, mirrored credentials table, rotation procedure, scope rules |
| Authoring, auditing, or validating a repo's `CLAUDE.md` / agent-context file | [`/YOUR/WORKSPACE/DIR/agent-config/context/agent-context-standard.md`](context/agent-context-standard.md) — three pillars (MAP/PROSE/STRUCT), parseable Project Snapshot schema, deterministic vs. judgment checks, canonical+shim contract |
| Implementing or reviewing changes a human or agent will observe — CLI output, scripts a user invokes from a shell, Makefile / `npm` / `npx` entry points, rendered UI, error messages, log streams a developer reads | [`/YOUR/WORKSPACE/DIR/agent-config/ui/README.md`](ui/README.md) — surface-agnostic doctrine and per-surface standards (CLI today; web/mobile/other to follow). Also read the per-surface `<surface>-standards.md` named by the issue's `## User-facing surfaces` block when present. |

## Agent context layer (retrieval protocol)

@/YOUR/WORKSPACE/DIR/agent-config/context/README.md

## Shared skills

Shared user-maintained skills live in `/YOUR/WORKSPACE/DIR/skills/`. Both Claude (`~/.claude/skills`) and Codex (`~/.codex/skills`) point at this directory. A skill folder uses `SKILL.md` plus optional `references/`, `scripts/`, `assets/`, `agents/`. Read a skill's body only when the task triggers it — don't bulk-load unrelated skills. Edit shared skills only when the user explicitly asks to create, install, update, fix, or maintain a skill.
