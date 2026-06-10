# <Repo Name> - Agent Context

This file is the canonical source of truth for agents working in this repository. Keep it tool-neutral: Claude, Codex, Cursor, Gemini, and future coding agents should all be able to follow it. `AGENTS.md`, when present, should be a shim that points back here.

## Project Snapshot

- **Purpose:** TODO - one or two sentences describing what this repo owns.
- **Primary users/customers:** TODO, or `N/A - internal tooling`.
- **Production surface:** TODO - app, service, package, website, infrastructure, research, or `N/A`.
- **Tracker/project:** TODO - Linear team, issue prefix, or `N/A`.
- **Canonical repo path:** TODO - usually `/YOUR/WORKSPACE/DIR/<repo>`.

## Context Retrieval

Before multi-step or shared-state work:

1. Read `/YOUR/WORKSPACE/DIR/agent-config/context/README.md`.
2. Confirm this is the target repo from the user request, issue, PR, file path, or product name.
3. Read this file before editing.
4. Use `rg` to find nearby code and docs relevant to the task.
5. Read subsystem docs only after the likely files are known.
6. If the task requires another repository, pause before editing and name the repositories involved.

## Local Setup

- **Primary stack:** TODO - Swift, Node, Python, Ruby, C++, etc.
- **Package manager/build tool:** TODO, or `Unknown - inspect root files`.
- **Install command:** TODO, or `N/A`.
- **Test command:** TODO, or `Unknown - inspect repo scripts before claiming verification`.
- **Lint/typecheck command:** TODO, or `N/A`.

## Repository Map

- `TODO/` - TODO

## Engineering Rules

- Prefer existing patterns in nearby code over new abstractions.
- Keep changes scoped to the issue or user request.
- Do not introduce new dependencies without a clear reason.
- Do not edit generated files unless the generator/source is also updated.
- Do not make cross-repo changes in this repo without first confirming scope.

## Verification

Before reporting completion, run the narrowest meaningful verification available for the changed area. If verification cannot run, say exactly why and what was checked instead.

## Open Context Gaps

Use this section to track missing repo facts discovered during work. Replace TODOs above as soon as a fact is known from local evidence.

- TODO - fill in project-specific setup and verification commands.
