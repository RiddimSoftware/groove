# Project-Level TDD Workflow

Acceptance-Test-Driven Development at the **Linear Project** level: turn a Project's acceptance criteria into an **executable completeness spec** so a green test suite — not a human reading prose — is the authoritative "project done" signal, independent of Linear issue status.

Use this when a Project builds new behavior across multiple issues. It is the cure for the "weak foundation" failure: a real adapter wired to a port nothing feeds, or a producer constructed but never invoked — every per-unit test green, the feature dead end-to-end. (Pilot: the Symphony Coordinator project, where this caught three such bugs that all-green CI could not.)

This file is a map. The depth lives in the docs it links; read those when authoring or implementing.

## The contract (what every project running this workflow must satisfy)

These are the enforceable *properties* — the target a check asserts, not an implementation to copy (see "Contract, not scaffold" below):

1. **A test crosses the composition root.** The app has a single callable composition-root factory (`buildContainer()` / `buildServer()` / `startX()`), and ≥1 acceptance test boots it and asserts observable end-to-end output, crossing every central seam with real objects on **both** sides — including write/control paths, not just reads. Fake only the true edge; prefer a real sandboxed edge when the host allows it. → [`clean-architecture.md`](clean-architecture.md) § *Composition Root*.
2. **Fakes cannot reach production, statically.** dependency-cruiser (or equivalent) rules: nothing outside tests imports `*Fake*`/`*InMemory*`/`test/**`; adapters are instantiated only at the composition root. Runs in the required `pr-build`.
3. **The completeness gate is non-required.** A `project-acceptance` workflow runs the acceptance suite and is **NOT** in branch-protection's required checks; `pr-build` (required) **excludes** `test/acceptance/**`. This is what lets a genuinely-red acceptance test ride `main` under auto-merge without blocking the merge. This wiring is org-specific (it interacts with auto-merge + branch protection) — it is not something to re-infer per project.
4. **Tests are test-first and separate.** Each behavior's acceptance test is authored in its own **test ticket** that `blocks` the implementation ticket, committed genuinely red, and turned green by the impl ticket. → [`linear-standards.md`](linear-standards.md) (decomposition lanes; Composition wiring field).
5. **Project-level verification gates, when planned, are separate issues.** They run after implementation siblings are Done, produce a Linear verification artifact and any follow-up implementation issues, and block Human Handoff. → [`linear-standards.md`](linear-standards.md) § *Project-level verification issues*.
6. **One Human Handoff issue** carries the live/un-automatable edges. The Project is not Done until it is Done. → [`linear-standards.md`](linear-standards.md) § *Human Handoff*, [`human-handoff.md`](human-handoff.md).

## Phases

1. **Kickoff & decompose** — one deterministic verification target per issue; no 8-point tickets hiding many ACs. The `foundation` issue wires every new port's **real** adapter into the composition root immediately (throwing stubs if unimplemented) and stands up the non-required gate + dep-cruiser rules; it `blocks` the rest. Lanes: `foundation` → `parallel` → `integration` → `serial`. → [`linear-standards.md`](linear-standards.md).
2. **Write acceptance tests (test-first)** — a test ticket lands the failing test (committed red), `blocks` its impl ticket. **Keep the harness simple: a non-required whole-suite ledger + Linear blocker ordering.** Do *not* build a per-PR red/green classifier that infers test-vs-impl from git diffs — it is fragile (it misclassifies impl PRs and leaves test-ticket PRs ungated) and was the pilot's harness bug. The whole-suite ledger signal plus blocker ordering is sufficient.
3. **Implement** — the impl ticket turns its red test green. At least one test must satisfy contract property #1 (cross the composition root, enumerate the seams including write paths).
4. **Completeness signal** — `project-acceptance` green on `main` = the project is built, independent of Linear status.
5. **Project-level verification gates** — run any planned architecture, surface, or other autonomous verification issues after the implementation siblings are Done. These are Project gates, not PR reviews: they score the merged Project state against explicit standards, post the verification artifact in Linear, and file any follow-up implementation issues.
6. **Human Handoff (the ratchet)** — live-verify the un-automatable edges after implementation and Project-level verification gates have cleared. **Every bug found here is backfilled as an automated test before closeout** — a handoff finding is evidence of an un-crossed seam; close the gap so the next project's net is tighter. Prefer promoting the check to a real sandboxed edge so it becomes a standing green check rather than a recurring manual step.
7. **Closeout** — fold the durable composition-root tests into the normal `pr-build` suite (regression, kept forever); **delete** the temporary gate (`project-acceptance.yml` + any resolver); **keep** the dep-cruiser rules. Removing the gate is the final step, after the Human Handoff is ready to close.

## Contract, not scaffold

A capable developer already knows each language's conventions and can infer where tests/config go and write idiomatic boilerplate. So this workflow ships **a contract + a check + a doc**, not a pile of copied files:

- **Doc** (this file + the linked docs) — the *why*: the rationale a model can't infer (why the gate is non-required, the auto-merge interaction, why a test must cross the root).
- **Check** — a deterministic assertion (a `context-audit` rule / CI check) that the contract properties hold: gate present and non-required, `pr-build` excludes the acceptance dir, dep-cruiser rules present, ≥1 composition-root test. Enforce the *outcome*; let the developer produce any correct implementation.
- **Template only the irreducible — and prefer deleting it.** The one genuinely non-inferable, bug-prone piece was the per-PR classifier; we eliminate it (phase 2) rather than enshrine it. What remains is simple enough to infer and cheap enough to contract-check.

## Lessons baked in (from the pilot)

- **Handoff findings ratchet into tests.** All three pilot bugs (dead producer wire, unresolvable install-script path, slug-vs-`owner/name` capacity key) were un-crossed seams. Each became a test before closeout.
- **Comp-root test tickets must enumerate the seams** they exercise — read *and* write/control paths. A ticket that only asserts the read path lets a write-path bug ship green.
- **Drop the per-PR mapped-test classifier.** Ledger + blockers suffice; the classifier added fragility for little value.

## Enforcement & surfacing

- **Routing** — referenced from `CLAUDE.md` (Task-specific context) so it loads at project kickoff/decomposition.
- **Check** — a `context-audit` deterministic rule asserts the contract (see [`agent-context-standard.md`](agent-context-standard.md) for the deterministic-vs-judgment model; D-checks live in `scripts/context_audit/`).
- **Mechanism over prose** — dep-cruiser and the non-required gate run in CI; the `pre-tool-use-enforce-linear-teams.mjs` hook is the plug-point for enforcing required issue sections at authoring time. A rule that fails CI beats a rule that must be remembered.
