# Riddim Software UI Standards

This directory holds the org's standards for any **user interface** a Riddim Software product or internal tool exposes. A UI is any surface a human (or agent) interacts with and observes — not just pixels.

## Layout

- [`ui-doctrine.md`](ui-doctrine.md) — surface-agnostic principle. Read first when authoring or auditing any UI.
- [`cli-standards.md`](cli-standards.md) — terminal-style UIs: CLIs, scripts, Makefiles, `npm`/`npx` commands, shell wrappers, and any other command-line program a user invokes and watches.
- [`cli-scorecard.md`](cli-scorecard.md) — 0–10 rubric for reviewing a CLI surface.

## Scope (current)

v1 covers **CLI / script / terminal-style surfaces only.** Web, mobile, voice, and other surfaces are not yet covered here. When they are added, they get sibling files (`web-standards.md`, `mobile-standards.md`, …) and matching scorecards. `ui-doctrine.md` stays surface-agnostic so it survives that growth without rewrite.

## How agents pick this up

The developer and backlog-team skills consult this directory through two triggers:

1. **Issue body marker (primary).** When a Linear issue includes a `## User-facing surfaces` block (see [`../context/linear-standards.md`](../context/linear-standards.md)), the developer skill loads the matching `<surface>-standards.md` *before* editing any code on that surface and self-reviews against the matching scorecard before opening the PR.
2. **Task-specific table row in `CLAUDE.md` (safety net).** Any task that changes a surface a human will see — even when the issue omits the marker — routes here via the "Task-specific context — load on demand" table in [`../CLAUDE.md`](../CLAUDE.md). Judgment-based, like the existing clean-architecture row.

The Backlog Team is the source of truth for the marker. When it identifies UI scope, it must add the `## User-facing surfaces` block to the issue body. Without that, the primary trigger silently rots.

## Doctrine roots

The standards in this directory descend from two book distillations already in this repo:

- Steve Krug, *Don't Make Me Think* — captured in [`../krug/krug-doctrine.md`](../krug/krug-doctrine.md). The **reservoir of goodwill** and **"don't make me think"** laws apply unchanged to terminal UIs: silence after `npx <thing>` drains the reservoir; an honest first-byte refills it.
- Marty Cagan, *Inspired* — captured in [`../inspired/inspired-doctrine.md`](../inspired/inspired-doctrine.md). The **usable** leg of the valuable / usable / feasible triangle is non-negotiable for any surface a user touches. A CLI is a product. A developer is a user.

These are the *why*. The files in this directory are the *what we do here*.

## Evolution

Add new surface coverage by adding a sibling `<surface>-standards.md` plus its scorecard, and updating this README and the Task-specific table row in `CLAUDE.md`. Do not rename `ui-doctrine.md` when adding surfaces — the doctrine is the stable spine.

When a standard in any `<surface>-standards.md` file changes in a way that affects existing implementations, follow [`../context/factory-change-management.md`](../context/factory-change-management.md): encode the real confidence condition for the rollout, not a fixed time window.
