# Agent Context Standard

The quality standard for a repository's **primary agent-context file** — the file a fresh
LLM session reads first to become productive in that repo. Canonically `CLAUDE.md`;
`AGENTS.md` is a thin shim that points to it (see **Canonical + Shim** below).

This document is the **specification** that the `context-audit` skill and the CI
context-file validator mechanize. It is deliberately split into **deterministic checks**
(a machine can decide pass/fail) and **judgment checks** (an LLM or human decides). Keep
that split intact when you change this standard — it is what lets the same rubric run both
as a blocking CI gate and as a proactive auditor.

This standard is **reversible by design**. It is org policy, not a law of nature; amend it
with a PR when evidence says a rule costs more than it returns.

## Why this exists (the architecture lens)

The agent context layer is a **layered system with a dependency rule**, exactly like the
code we audit:

- **Always-loaded layer** — the primary context file. Small, stable, high-salience.
  Loaded into every session whether or not it is needed, so every line competes for the
  model's attention budget. Target ~100–150 lines.
- **Retrieved-on-demand layer** — `docs/`, `README.md`, architecture notes, runbooks.
  Unbounded; loaded only when a task needs it.

**The dependency rule for context:** the always-loaded layer may *point inward to* the
retrieved layer, but must not *inline* it. A 536-line "context file" is a dependency-rule
violation — the retrieved layer has leaked into the always-loaded layer and now taxes every
session. The fix is never "delete the knowledge"; it is "move it to `docs/` and leave a
pointer," the same Ratchet we apply to code.

**The canonical-source rule:** content lives in exactly one file (`CLAUDE.md`). `AGENTS.md`
depends on it (points to it); it never duplicates it. Two files with the same content are
two files that will disagree — drift debt with a due date.

**Freshness is correctness, not hygiene.** A stale context file is worse than no file,
because the agent *trusts* it. A map that names a deleted directory, or a "run `make test`"
line where no such target exists, actively routes a fresh session into a wall. This is why
the freshness checks are deterministic and gating, not advisory.

## The three pillars

A primary context file serves three jobs, each defeating a specific failure mode of an LLM
joining a repo cold. An agent reads any file instantly but pays attention-budget for
everything it loads; it pattern-matches local code well but infers global structure and
intent poorly; and it cannot see anything not written down. The pillars supply, in order,
**navigation**, **the un-inferable**, and **the machine-checkable**.

### 1. MAP — defeats "where do I even look?"

A **directory-level** map: each top-level directory (and any load-bearing nested one) with
**one line of purpose**, the entry points, and ideally a task→location routing hint
("for X, look in Y"). It is *not* a file tree — a `tree` dump is anti-context (high token
cost, near-zero signal, rots on every file move). The entire value is the one-line purpose
the directory *name alone does not convey*.

### 2. PROSE — defeats "I can read the code but not the why"

The highest-value, least-compressible pillar: what is *not* in the code. Purpose, who uses
it, production surface, the architecture / mental model, and above all **invariants and
landmines** — the locally-correct-but-globally-wrong traps. Load-bearing examples from the
current org exemplars:

- `main` is integration-safe, not release-safe. (autopilot)
- Shipped SwiftData schema enums are immutable; an endpoint change requires an OpenAPI
  change in the same PR. (epac)
- This file is generated — edit the source and regenerate, never hand-edit. (any generated file)

### 3. STRUCT — defeats "I guessed and it was wrong"

The cheap, factual, highest-frequency lookups, in a **greppable, machine-parseable** form
(see schema below): stack, package manager, build / test / lint / verify commands, Linear
team + issue prefix, canonical path. This is the pillar the validator parses directly, so
it has a fixed schema; the other two are prose under fixed headings.

## Scoring bands (0 / 1 / 2 per pillar)

Score each pillar so two reviewers agree. A pillar is **2** only when an agent could act on
it without further questions; **1** when present but an agent would still have to guess; **0**
when absent or so thin it conveys nothing.

| Pillar | 0 — absent | 1 — partial | 2 — good |
|---|---|---|---|
| **MAP** | No directory map; or only a flat file list. | Some dirs named but ≥1 top-level dir unexplained, OR purposes are one-word labels, OR a raw `tree` dump. | Every top-level (and load-bearing nested) dir has a one-line purpose; entry points named; mapped paths resolve on disk. |
| **PROSE** | No purpose/architecture; or boilerplate that restates the dir names. | Purpose present but no invariants/landmines, OR architecture stated only as "(planned)" without saying so. | Purpose + users + production surface + mental model + ≥1 concrete invariant/landmine that would prevent a real wrong change. |
| **STRUCT** | No commands and no team/path, OR commands that don't resolve. | Some fields present but ≥1 of {build, test, team, canonical path} missing, OR not in the parseable schema. | All required STRUCT fields present, in-schema, and each command's tool/target resolves. |

**Composite tiers** (for triage, not for gating):
- **Exemplar (≥5/6, all pillars ≥1, within budget, shim present):** template-worthy.
- **Partial (file exists, any pillar at 0 or the canonical/shim contract broken):** fix the missing pillar.
- **Stub/Missing (no primary context file, or only `WORKFLOW.md`, or near-empty):** create from template.

`WORKFLOW.md` is Symphony orchestration config, **not** agent context. A repo whose only
markdown is `WORKFLOW.md` scores as **Missing**.

## Deterministic checks (the validator + CI gate)

A machine decides each of these pass/fail with no judgment. These are the blocking CI gate
and the first pass of the audit skill.

| ID | Check | Pass condition |
|---|---|---|
| `D1` | **Primary exists & non-empty** | `CLAUDE.md` exists and is > 10 non-blank lines (or repo is explicitly `inactive` in the registry). |
| `D2` | **No placeholder shipped** | No unfilled `TODO`/`TBD`/`Unknown`/`FIXME` intake markers from the template remain (count = 0). |
| `D3` | **Shim points home** | If `AGENTS.md` exists, it is ≤ 15 lines AND contains a link to `CLAUDE.md`. It must not duplicate canonical content. |
| `D4` | **Budget** | Primary file ≤ 150 lines (warn at > 120). Over-budget ⇒ content belongs in `docs/`. |
| `D5` | **STRUCT schema present & parseable** | The `## Project Snapshot` block parses against the schema below; all required keys present. |
| `D6` | **Mapped dirs resolve** | Every directory path named in the Repository Map exists on disk (or is tagged `(planned)`). |
| `D7` | **Commands resolve** | Each `build`/`test`/`lint`/`verify` command's tool or script target exists (e.g. a `make <t>` target, an npm script, a `Package.swift`). |
| `D8` | **Registry agreement** | Every file in this repo's `context_files` in `repositories.yaml` exists; the repo's `linear_team` matches the STRUCT `linear_team`. |
| `D9` | **Canonical-path truthful** | The STRUCT `canonical_path` equals the repo's actual path in the registry. |

`D6`/`D7`/`D8`/`D9` are the **freshness** gate — the checks that catch a context file lying
about a repo that moved underneath it.

## Judgment checks (the LLM audit layer)

These require reading the repo and deciding. They are the audit skill's LLM pass and a
human reviewer's job; they do **not** belong in a blocking CI gate (they are not
deterministic).

| ID | Check |
|---|---|
| `J1` | **Map still accurate** — do the one-line purposes still describe what those dirs actually contain after recent merges? |
| `J2` | **Prose still true** — are the stated invariants/landmines still real? Any new invariant introduced by recent work that should be captured? |
| `J3` | **Missing landmines** — is there a foot-gun an agent would hit that the file doesn't warn about (generated files, irreversible migrations, release-vs-integration semantics)? |
| `J4` | **Right altitude** — is anything inlined that should be a `docs/` pointer (budget pressure), or pointed-to that is so load-bearing it should be inline? |

## STRUCT schema (`## Project Snapshot`)

The STRUCT pillar lives in a fixed, parseable block so the validator can read it without an
LLM. Use a bullet list of `**Key:** value` pairs under a `## Project Snapshot` heading
(matches the existing template; no new file format to learn). Required keys are checked by
`D5`.

```markdown
## Project Snapshot

- **Purpose:** <one or two sentences>
- **Primary users:** <who, or "internal tooling">
- **Production surface:** <app | service | package | website | infra | research | N/A>
- **Stack:** <language(s) + framework(s)>
- **Package manager:** <npm | pnpm | SwiftPM | bundler | pip/uv | … | N/A>
- **Build command:** <command, or N/A>
- **Test command:** <command, or N/A>
- **Lint/Typecheck command:** <command, or N/A>
- **Verify command:** <the narrowest meaningful pre-PR check, or N/A>
- **Linear team:** <KEY> (issue prefix `<KEY>-`)
- **Canonical path:** /YOUR/WORKSPACE/DIR/<repo>
- **Status:** active | inactive
```

Required for `D5` pass: `Purpose`, `Production surface`, `Stack`, `Build command`,
`Test command`, `Linear team`, `Canonical path`, `Status`. `N/A` is a valid, honest value
and passes (an explicit `N/A` is a known fact; a blank is a gap). `Status: inactive` exempts
a repo from `D1`/`D4`/`D6`/`D7` (but not from registry agreement).

## Canonical + Shim contract

- `CLAUDE.md` is the single canonical source. Keep it **tool-neutral** despite the name —
  Codex, Cursor, Gemini, and future agents read it too.
- `AGENTS.md`, when present, is a **thin shim** (≤ 15 lines) that points to `CLAUDE.md` and
  carries no unique content. The reference shim:

  ```markdown
  # Agent Instructions

  This repository's canonical agent context lives in [`CLAUDE.md`](./CLAUDE.md).

  Read `CLAUDE.md` before multi-step work, regardless of which coding agent or tool is active.
  ```

- Large subsystems may carry their own nested `CLAUDE.md` (+ nested `AGENTS.md` shim),
  scored by the same rubric.

## Recommended anatomy

```
# <Repo> — Agent Context           (canonical; AGENTS.md shim points here)

## Project Snapshot     [STRUCT]   the parseable schema block above
## Repository Map       [MAP]      top-level dirs, one-line purpose each, entry points
## Architecture & Invariants [PROSE] the mental model + the landmines that bite
## Local Setup / Verification [STRUCT/PROSE] how to build, test, and prove a change
## Engineering Rules    [PROSE]    repo-specific only (generated files, "never edit X")
## Deeper context       [POINTERS] → docs/… (link; do not inline)
```

## Enforcement (graduate doc-only rules to gates)

A rule that isn't mechanically enforced will drift the moment an agent can't see or run it.
This standard is enforced in two complementary places:

1. **Reactive — CI validator** (blocking, per PR): runs the **deterministic checks**
   (`D1`–`D9`) against the touched repo's primary context file. Catches drift at the moment
   a merge would introduce it. Failure messages must be **agent-legible remediation**, e.g.
   _"Repository Map names `apps/foo/`, which does not exist. Update the map or restore the
   path. See context/agent-context-standard.md#deterministic-checks."_
2. **Proactive — `context-audit` skill** (scheduled / on-merge): runs `D1`–`D9` **plus** the
   judgment checks `J1`–`J4`, and emits a fix PR per repo that drifted. Must no-op cleanly
   (zero PRs) on a clean day, dedup against an already-open drift PR, cap PRs per run, and
   cite the triggering evidence in every PR body.

The proactive layer is a **backstop heartbeat** for the semantic drift (`J1`–`J4`) the
reactive gate structurally can't catch. Prefer the real trigger (a merge changed something
the context file describes) over a pure calendar cadence; a daily routine is an acceptable
v1 *only because* it no-ops cleanly when nothing drifted.

## Known smells in the current fleet (evidence for remediation)

From the 2026-05-31 read-only audit (full scorecard archived in the remediation Project).
Listed here as the architectural smell inventory; implementation issues are owned by the
backlog-team decomposition, routed to each repo's owning Linear team.

- **Registry drift (freshness, `D8`):** `aso` declares `context_files: [CLAUDE.md, README.md]`
  — neither exists. `reach` declares `[CLAUDE.md, AGENTS.md, README.md]` — none exist.
  `chill` declares `AGENTS.md` — absent. The registry promises files the retrieval protocol
  then fails to find.
- **Team-label drift (`D8`):** registry `s2s.linear_team: S2S` vs the in-file label `KAN`.
- **Shipped product, ~zero context (highest risk):** `portal-door` (App Store id 6758596602)
  has a 10-line README and no `CLAUDE.md`.
- **Canonical/shim violations:** `evidence` and `riddim-release` carry all the knowledge in a
  README with no `CLAUDE.md` and no shim; `riddim-website` has no `AGENTS.md` shim and no MAP.
- **Budget violations (dependency-rule leak):** `riddim-release` README is 536 lines;
  `sonnio` (230) and `bubble-bop` (190) primaries are over the 150-line budget.
- **Stub/Missing:** `baseball` (2-line README), `doubledozen` (`WORKFLOW.md` only).
- **Inactive, mislabeled as active:** `reach` (stale 2024 iOS tree), `gyrohero2`
  (`remote: null`, old experiments) — should be marked `Status: inactive` and trimmed from
  active expectations.

## Exemplars (copy these)

- **autopilot** — all three pillars in ~86 lines; thin shim; deep prose in `README` +
  `docs/architecture/`; the "integration-safe not release-safe" landmine.
- **epac** — every deep topic is a one-line pointer into `docs/`; hard invariants stated;
  estimate ladder by reference, not copy.
- **mcp** — models the codebase as a Clean-Architecture dependency chain and names the
  mechanical guard (`npm run test:boundary`) that keeps it true.
- **software-factory** — best annotated map: each `src/<context>/` line states its purpose
  *and what must not leak into it*.
