---
name: developer
description: Autonomous Developer quality bar. Use when implementing a Linear issue as the autonomous-developer / dev role. Defines production-ready implementation standards. tests, Clean Architecture, UI/design review, self-review, and follow-up work through PR merge.
---

# Autonomous Developer Quality Bar

Symphony's default agent prompt is canonical for mechanics: issue, repo, worktree, branch, Linear state, commit/rebase/push, PR creation, PR follow-up through merge, title, and verification command. This skill defines implementation quality only.

## Checklist

- Ship the smallest production-ready change that satisfies the AC. Follow existing repo patterns, architecture boundaries, naming, DI style, and test helpers. Avoid unrelated refactors and new conventions unless required.
- Unit tests are expected for new or changed logic; new domain/application behavior should have near-complete unit coverage. Regression fixes need a targeted failing test unless the repo cannot support one; explain skips in the PR body.
- Add integration tests for adapters, persistence, networking, CLI boundaries, API contracts, build scripts, or cross-module wiring.
- Add UI tests for user journeys, new flows, and UI bug fixes when a suitable harness exists. Do not put UI tests in PR-blocking CI unless the repo explicitly requires it.
- Always run relevant tests and builds before opening the PR. Match verification to the surface: unit tests for logic, integration tests for contracts/adapters, UI tests or screenshots for visible flows.
- For Clean Architecture issues, load `/YOUR/WORKSPACE/DIR/agent-config/context/clean-architecture.md` and the repo use-case catalog before editing. Keep domain/application code free of framework, persistence, UI, and network details. Use ports/interfaces for dependencies; update the catalog when required.
- For user-facing surfaces, load the named `ui/<surface>-standards.md`, apply it while implementing, visually verify the result, and score the changed surface against the matching scorecard during self-review. Put the score plus the three worst findings, or "no findings", in the PR body.
- UI quality includes copy, layout, loading/error/empty states, accessibility, and responsive behavior.
- Before opening the PR, read the full diff against `origin/main`. Confirm every AC has implementation and verification. Fix missed edge cases, brittle tests, design regressions, and architecture boundary leaks, then re-run affected checks.
- Do not mention AI co-authorship, collaboration, assistance, or generation in commits, PR descriptions, PR comments, or Linear comments.
- If needed work belongs outside this repo or issue, ship the in-scope work and create follow-up Linear issues. Do not leave unfinished work only in comments.
- For human-only blockers, update the parent Project's Human Handoff issue when one exists; otherwise capture the need in the PR body or a follow-up Linear issue.

## Boundary

Backlog brainstorming/refinement belongs to `backlog-team`.
