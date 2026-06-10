## Linear Issue Standards

**The single most critical rule of this standard:** any Linear item created or edited — by an agent or by a human — must be self-contained enough that a different team (internal or external) can pick it up and complete every requirement autonomously, without ever asking the writer. Every other section here exists to support that rule.

**The bar:** read the issue cold. If you would have a question before starting, the issue is not done.

### Autonomous implementability default

Linear artifacts are written for autonomous execution by default. The implementer does not have the writer's chat context, unstated assumptions, local memory, Slack thread, or ability to ask clarifying implementation questions. It receives the issue and the repository context, then must complete the work.

Every non-`human-handoff` issue must contain only work an autonomous agent can perform with the tools and context available to it: repository files, tests, docs, scripts, Linear/GitHub context, MCP tools, CLIs, cloud credentials, API credentials, generated assets, PR evidence, and deterministic verification. The agent is expected to use those tools aggressively; the writer is responsible for naming the access, tool, dependency, and environment requirements needed for success.

Each Linear Project may have **one** issue that requires human intervention: the Project's `human-handoff` issue. All human-only work for that Project belongs there. Do not create implementation issues whose completion depends on a human decision, manual approval, live UI-only action, vendor selection, account provisioning, legal/product sign-off, or other unavailable context.

### Linear items are implementation work by default

Except for the narrow Project-level verification issue category below and the single Project-level `human-handoff` issue, every Linear issue is **implementation work** that lands a versioned artifact in the repository through a pull request gated by CI. Investigative, research, proof-of-concept-only, "spike," or finding-only issues are **prohibited** — there is no `spike` label and no spike issues. Investigation is the issue writer's pre-work: it happens *before* the implementation issue exists (in a working branch, a throwaway prototype, or analysis), and any question that genuinely needs a human decision goes to the Project's Human Handoff issue — never a tracked investigative item.

Why: the software factory takes requirements in, does the work, and emits software. The human sits at the **start and end** of the line — spawning requirements and consuming output, then spawning fresh requirements from that output — never inside "doing the work." Outside the explicit verification exception, a ticket whose deliverable is a finding rather than merged code puts a human back in the middle of the line, so it is not allowed. When an issue can't yet be specified as implementation, the gap is the writer's to close before the issue exists, or a human decision to record on the Human Handoff issue.

### Project-level verification issues (narrow exception)

A Project may include narrowly-scoped verification issues after implementation and before Human Handoff. These are autonomous Project gates, not PR reviews: they do not approve, block, or relitigate individual pull requests. They run only after the implementation siblings they verify are `Done`, reconstruct the merged Project state from source-of-truth artifacts, evaluate that state against explicit standards, and produce either a closeout artifact or concrete remediation work.

Dependency wiring is part of the contract:

- Each verification issue is `Blocked by` every implementation sibling it must evaluate.
- The Project's `human-handoff` issue is `Blocked by` every verification issue, so Human Handoff remains the final human-facing closeout gate.
- If a verification issue discovers implementation work, it files follow-up implementation issues in the owning Linear team/repository rather than turning the verification issue into an implementation PR.

Valid outputs are limited to:

- A Linear verification comment or scorecard on the verification issue, parent Project, or other explicitly named Linear artifact.
- Zero or more follow-up implementation issues with autonomous AC, target repository ownership, and normal estimate/mergeability fields.
- Optional links back to sibling issues, merged PRs, diffs, screenshots, scorecards, or other source artifacts used during verification.

Verification issues remain different from prohibited spikes because the question is already closed enough to verify: they evaluate already-written code or artifacts against named standards and produce a finite closeout artifact or concrete remediation. They must not ask open-ended product, architecture, vendor, or feasibility questions; discover requirements for future implementation without a scoring standard; prototype alternate approaches; or depend on human judgment except through the Project's Human Handoff issue.

Required issue-body content for a Project-level verification issue:

- **Target repo(s)** — every repository whose merged state is in scope. If remediation is needed, each follow-up implementation issue still targets one owning repository.
- **Source-of-truth inputs** — parent Project, sibling issue identifiers, merged PRs, branch or commit range, files, generated artifacts, prior scorecards, and any comments or links the verifier must treat as authoritative.
- **Diff reconstruction instructions** — exact steps for reconstructing what changed, such as fetching `origin/main`, reading final merged PR diffs, comparing a named base commit to `HEAD`, or using a Project-specific ledger. The verifier must not infer the diff window from memory.
- **Standards to load** — every architecture, design, UI, context, security, release, or product standard the verifier must score against.
- **Stop conditions** — the finite checklist that ends the verification run, including what to do when a required input is missing, when no findings remain, and when findings require follow-up issues.
- **Estimate** — required like any other autonomous, non-`human-handoff` issue. The estimate reflects verification complexity: breadth of repos/artifacts, standards depth, diff reconstruction difficulty, and ambiguity in the scoring rubric.

### Initial status

All new Linear artifacts (issues, projects, initiatives) must be created with status **`Todo`** unless explicitly instructed otherwise. This is the default queue status for work awaiting assignment or pickup.

### Required fields — every issue

- **Title** — imperative verb phrase, ≤ 80 characters, no unexplained abbreviations.
- **Context / background** — 2–4 sentences: what is the situation, why is this being done now, what adjacent work is related? Link to the parent Linear Project (the org's epic-equivalent), Initiative, and any prerequisite issues.
- **Root cause analysis** — required for bug issues. The ticket writer must investigate before writing the issue, list plausible root-cause candidates, attach concrete evidence for or against each candidate (logs, repro steps, code references, screenshots, traces, failing tests, deploy/config changes, or user reports), and choose the best-supported candidate as the likely root cause. Aim for 100% confidence before handing the issue to a developer; if certainty is not possible, the issue is not ready — keep investigating as pre-work (in a branch or throwaway prototype, or by routing the open question to the Project's Human Handoff issue when it needs a human decision) until the root cause is established. Do not file a separate investigative issue. The fix developer should not need to spend time hunting for the root cause.
- **Acceptance criteria** — unambiguous and testable. Use Gherkin (`Given / When / Then`) for complex logic; a checkbox list for simple cases. No "and"-chains — split into separate criteria. Edge cases must be included.

  **External data source AC (required when the issue introduces or modifies a URL the app fetches at runtime):** Any issue that adds a new data source URL or changes an existing one — new adapter, new service method, changed endpoint, changed path — must include both of the following AC items:

  - `[ ]` **Alive check (required):** `curl -s -A "Mozilla/5.0" "<URL>"` returns HTTP 2xx and the response contains at least one expected data item (e.g. `grep -i "<keyword>"`). Paste the command and its output as evidence in the PR description. If the source requires auth or a non-default User-Agent, document the working invocation.
  - `[ ]` **Simulator verification (ideal):** Build and run the app in the iOS Simulator. Navigate to the screen that renders data from the source. Confirm at least one real item appears. Include a simulator screenshot in the PR description.

  The alive check is a hard requirement — a PR that introduces a new data source URL without verifying the URL returns data is not mergeable. The simulator check is strongly preferred; skip it only when the surface is not yet wired to a visible UI, with an explicit note.

  **Autonomous-only rule:** AC must be limited to work an autonomous developer can complete or verify from repo changes, tests, docs, config, metadata files, generated assets, scripts, APIs, CLIs, cloud/provider credentials, or PR evidence. If a criterion requires a human to act — translation review, App Store Connect submission, legal/product sign-off, vendor selection, live environment observation, account provisioning, or manual GitHub UI verification — it is not an AC item. Move it to the Project's `human-handoff` issue.

- **External validation gates** — autonomous readiness checks or references to human/release/vendor work that must happen before the product or release is complete, but that the autonomous developer cannot perform in this issue. This section must not turn the implementation issue into a human-dependent ticket. If the gate needs human action, write it in the Project's `human-handoff` issue and reference that issue here with the owner and exact checkbox name.

  Examples that belong in the Human Handoff issue: human translation review accepted, App Store Connect build submitted and approved, live listing spot-checked, legal/product sign-off received, manual GitHub UI picker verified, production rollout observed.

  For rollout, switchover, decommissioning, or traffic-drain gates, read [`factory-change-management.md`](factory-change-management.md). Do not default to inherited wall-clock waits such as "wait 7 days" when the real requirement is telemetry confidence, bounded blast radius, rollback readiness, or a human-owned production action. If the next action is observation rather than code, keep it out of the autonomous developer queue.

  > **Example — autonomous AC item:**
  > - [ ] Given the release notes generator runs, when a new tag is pushed, then `CHANGELOG.md` is updated and the diff appears in the PR.
  >
  > **Example — external validation gate (App Store scenario):**
  > - [ ] Human Handoff issue contains `App Store Connect build submitted and accepted` (owner: release manager — not required for PR merge).
  >
  > **Example — external validation gate (GitHub UI scenario):**
  > - [ ] Human Handoff issue contains `Branch-protection rule for main manually verified in GitHub Settings` (owner: eng lead — not required for PR merge).

- **Out of scope** — explicit non-goals. Anything related but not committed to this issue.
- **Inputs / dependencies** — data shapes (with JSON examples for APIs), design file links, upstream issue identifiers, environment or credential requirements. Anything the implementor needs before they can start. Name required tools, CLIs, MCP connectors, cloud profiles, secrets, API scopes, local services, fixtures, and verification commands. If access is not already available to the autonomous agent, the work belongs in the Project's Human Handoff issue or behind a prerequisite issue that provisions access. The issue's Linear team determines its target repository (see `context/repositories.yaml`). Issues that require changes in a repository owned by a different team must be split into separate issues in the correct owning team — cross-team repository overrides are disallowed.
- **Risks / notes for implementer** — hidden constraints, gotchas, prior incidents, non-obvious decisions that would surprise someone coming in cold.
- **Definition of Done** — concrete and testable. "Done when …" — not vague.
- **Architecture Impact** — for non-trivial tickets: affected layers, intended dependency direction, new/changed boundaries, framework/database/API assumptions, and test strategy by layer.
- **Mergeability / change ownership** — required for implementation issues. State the issue's single reason to change, primary code owner, expected hot files/modules, sibling issues likely to touch the same area, conflict-risk level (`low` / `medium` / `high`), and sequencing lane (`foundation`, `parallel`, `serial`, or `integration`). If there is no meaningful conflict risk, write `Conflict risk: low — <one-line reason>` rather than omitting the section.
- **Estimate** (Linear field, not a description section) — **hard requirement** on every shippable issue, with the single `human-handoff`-labeled exemption noted below. Represents **complexity** of the work — how capable an implementer (human or model) needs to be — NOT effort hours. Uses the five-level ladder `1, 2, 4, 8, 16`. **Maximum is 16 — anything larger must be split before estimating.** Full guidance — per-point descriptors, how to pick between adjacent points, when to split, common pitfalls — lives in the [§ *Estimating issues*](#estimating-issues) section below. **An issue cannot transition from `Backlog` to `Todo` without this field set.**
### Use-case-shaped issues

For behavior-changing work, the issue should name the application behavior before naming the screen, handler, table, SDK, or framework detail. A strong title usually contains a verb phrase that could become a use-case artifact in code, such as `RecognizeSong`, `IngestScreenshot`, `SearchHansard`, `SubmitReview`, or `RegisterDevice`.

Add a **Clean Architecture Shape** section when an issue creates or changes app/service behavior:

- **Use case** — named application behavior; mark as new, existing, or changed.
- **Entities / value objects** — domain concepts the behavior reads or changes.
- **Ports** — interfaces the use case needs for external capabilities.
- **Adapters** — concrete frameworks, SDKs, databases, APIs, or UI surfaces expected to implement those ports.
- **Boundary rule** — imports or concrete details that must not cross inward.
- **Catalog update** — whether the repo's use-case catalog must be added or updated in the implementation PR.
- **Composition wiring** — for each new or changed port, name the real adapter that must be instantiated in the composition root, and state whether this issue wires it (or wires a throwing stub a later issue fills in). A port whose adapter is never wired into the root, or is wired but never invoked, is a dead feature that passes every per-unit test — see `clean-architecture.md` § *Composition Root*. If a Project introduces new ports, exactly one issue must add (or be blocked by a test issue that requires) a **composition-root integration test** that boots the real graph and asserts end-to-end output; name that issue here.

If the issue is purely copy, metadata, release, dependency, visual polish, infrastructure wiring, or an adapter-only change, write `N/A - <reason>` for the Clean Architecture Shape rather than inventing fake use cases. For deeper guidance, retrieve `/YOUR/WORKSPACE/DIR/agent-config/context/clean-architecture.md` only while writing/refining behavior-changing issues or architecture work.

### User-facing surfaces

Add a **User-facing surfaces** section when an issue changes anything a human or agent will *observe* — a CLI command's output, a script a user invokes from a shell, a Makefile / `npm` / `npx` entry point, an iOS or web screen, an error message, an email, a log stream a developer will read while debugging. This is the routing signal that tells the implementer which `ui/<surface>-standards.md` file (and matching scorecard) to load before editing and to self-review against before opening the PR.

Format:

- **Surfaces** — bullet list of every surface this issue touches, named by surface type. Allowed values today: `CLI` (or `script`), `iOS`, `web`. Add new values when this repo's `ui/` directory adds a sibling `<surface>-standards.md`.
- **Standards to load** — explicit list of which `ui/<surface>-standards.md` files the implementer must load. The implementer self-reviews against the matching `<surface>-scorecard.md` before opening the PR; attach the score and the three worst findings (or "no findings") to the PR body.
- **Non-goals on these surfaces** — anything the issue intentionally does *not* change on the listed surfaces. Use this to bound visual polish, copy, or accessibility scope you're deferring.

If the issue does not change any user-observable surface — pure backend logic with no log changes, generated code with no output changes, internal refactors invisible to the runtime — write `N/A — <reason>` rather than omitting the section. "Internal refactor with no behavior or output change" is a valid reason; "I didn't think about it" is not.

Backend issues that *will* change an existing surface's output (a new log line a developer reads, a new error message, a changed exit code) are user-facing and must list those surfaces. The bar is observation, not pixels.

For deeper guidance on what each standard requires, retrieve [`/YOUR/WORKSPACE/DIR/agent-config/ui/README.md`](../ui/README.md) only while writing or refining a UI-touching issue.

### Issues — sizing and scope discipline

Implementation issues must be sized to fit in one PR to one repository. **Each implementation issue belongs in the Linear team that owns its target repository** — the team determines the repo; no `## Routing` block or per-issue repo override is needed or permitted. If an implementation issue requires changes to more than one repo, split it at issue-writing time into one issue per repo, each in the Linear team that owns that repo, all children of the same parent Project. Project-level verification issues may inspect multiple target repositories only as a read-only gate; any remediation they discover must be split into follow-up implementation issues in the owning team/repository. This ensures each PR can be reviewed, tested, and merged independently.

If an issue appears to target a repository owned by a different Linear team, that is a signal to move or split the issue, not to add a routing override. Cross-team repository overrides are disallowed. See `context/repositories.yaml` for the canonical team → repo ownership map.

Use the Single Responsibility Principle at the work-item level: one implementation issue should have one reason to change and one primary code owner, usually a use case, adapter, module, migration, or generated artifact family. SRP does **not** mean "one file per issue"; it means the PR can be reviewed, rebased, and merged as a coherent change without overlapping another ready issue's primary owner.

When a Project has multiple child issues in the same repository, the Project description must include a **Mergeability plan**: a change-collision map listing each child issue, target repo, primary code owner, expected hot files/modules, conflict risk, and sequencing lane. No two `Todo` / ready implementation issues in the same Project should intentionally edit the same primary hot file concurrently unless the Project marks them as `serial` and encodes the dependency with Linear `Blocks` / `Blocked by`.

For Projects that adopt the acceptance-test-driven completeness workflow (executable "project done" signal, test-first tickets, non-required acceptance gate, human-handoff ratchet), see [`project-tdd-workflow.md`](project-tdd-workflow.md) — these lanes are how its phases map onto issues.

Preferred decomposition pattern for conflict-heavy Projects:

1. `foundation` — introduce stable contracts, ports, data shapes, generated code boundaries, or extension points that later PRs can consume. When the Project adds new ports, the foundation issue wires their **real** adapters into the composition root immediately — as throwing stubs if unimplemented — so the object graph is complete from the start (see `clean-architecture.md` § *Composition Root*).
2. `parallel` — add independent use cases, adapters, screens, schemas, fixtures, or tests that touch disjoint primary owners.
3. `integration` — wire the parallel pieces through the shared entry point after the parallel PRs merge, and prove the assembled application with a **composition-root integration test** that boots the real graph (faking only edge externals) and asserts end-to-end output. A Project whose pieces are each unit-tested against fakes but never exercised together can ship green and do nothing.
4. `serial` — use explicit dependencies for unavoidable hot files such as registries, routers, package manifests, schema snapshots, workflow files, and generated lockfiles.

### Estimating issues

Every shippable issue **must** carry an `Estimate` field before it leaves `Backlog` for `Todo`. This is the backlog → ready gate: an issue without an estimate is not ready for the Autonomous Developer or any agent that selects work by complexity. The single exemption is the `human-handoff`-labeled issue (see § *Human Handoff issue* below); every other shippable issue is in scope.

This rule binds **every writer** of Linear artifacts — humans, the `backlog-team` skill, the `aso-team` skill, and any ad-hoc agent session that calls `save_issue`. Whether the issue is being newly created in `Todo`, refined inside `Backlog`, or transitioned out of `Backlog`, the field must be set before the transition lands.

**The ladder is `1, 2, 4, 8, 16` (five levels). Maximum is 16 — no issue may be estimated above 16.** It measures **complexity** — how capable an implementer needs to be to ship the issue — not effort hours. How the estimate routes to a specific model is a downstream deployment concern owned by the orchestrator (symphonyd reads `symphony/shared.yml`); issue writers do not pick models, they pick complexity.

**When in doubt, upgrade one tier.** Running an over-capable implementer is far cheaper than a too-weak one failing the implementation; the cost asymmetry is heavy.

**Signals that push an issue up:** AC has unstated edge cases the implementer must infer; the change touches code the team has never modified; spans multiple architectural layers (UI + service + data + infra); strict deadline or business risk; prior similar work failed and the cause isn't fully understood.

**Signals that pull an issue down:** direct copy of an existing pattern in the same codebase; single well-scoped file change; AC includes exact wording, values, file paths, or API shapes.

**Anything that would estimate above `16` must be split at issue-writing time** into smaller children, each estimated on the same ladder. Issues should also be split *before* estimating — not at the implementer's end — when any of the following are true:

- The work would span more than one git repository. See § *Issues — sizing and scope discipline* above.
- The work has more than one **primary code owner** (more than one reason to change).
- The work names more than one use case or domain behavior.
- The acceptance criteria still have substantial gaps. Close those gaps as the writer's pre-work *before* the issue leaves `Backlog` — investigation is not a tracked item, and an issue with open investigative questions is not ready.

**Common pitfalls** to avoid:

- *Estimating effort instead of complexity.* The `Estimate` field on this ladder is **complexity only** — how capable an implementer must be, not hours-to-ship. Effort or duration is not tracked in this field.
- *Sandbagging to `8` whenever unsure.* `8` is "standard," and using it as a default hides real complexity from the orchestration layer that routes work to implementers. When unsure, apply the push-up signal list above and upgrade one tier; do not fall back to `8`.
- *Splitting only by file count.* "5 files = `16`, 2 files = `4`" is the wrong axis. A single-file change with novel reasoning can be `16`; a five-file mechanical rename is `2`. Complexity = novel reasoning + AC ambiguity + architectural surface, not file count.
### Linear Projects (epic-equivalent) additionally require

Objective (outcome-oriented, not feature-oriented), why-now rationale, Cagan four-risk assessment (value / usability / feasibility / business viability), architecture or design notes, sequencing and dependencies, mergeability plan / change-collision map, success metrics, and the planned child issue list.

### Project Completeness Contract

A Project write-out is not complete until every planned child issue is also written, linked to the Project, and Definition-of-Ready-passing in the **same session** — by whichever agent or human authored the Project. This applies to every writer (ad-hoc agents, the Backlog Team skill, humans), not just one role.

- Never push a Project to Linear without its full child hierarchy.
- A Project with no children, placeholder children, or `TBD` issues is incomplete. Keep working until the full breakdown is done in this session.
- If scoping uncertainty genuinely prevents writing complete children, the Project is not ready — resolve the uncertainty as pre-work (writer investigation, or a Human Handoff item when a human decision is required) before creating the Project's children. Do not create an investigative child issue.
- "I'll add the child issues later" is not a valid completion state. Finish the breakdown now — there is no investigative-issue escape hatch.

This contract follows directly from the most-critical rule above: an incomplete Project hierarchy forces the picker-up to come back to the writer for the missing pieces — exactly what the standard exists to prevent.

### Human Handoff issue (Project-level human work aggregator)

Every Project includes exactly one final child issue labeled `human-handoff` that aggregates all human-touch work across the Project: anticipated demos and sign-offs, blockers discovered during dev / review that only a human can resolve, and post-merge verification that needs human eyes (visual QA, real-data behavior, integration smoke tests). This is the only issue in the Project allowed to require human intervention.

The full spec — when to create it, what goes in it, how each skill interacts with it — lives in [`context/human-handoff.md`](human-handoff.md). The Backlog Team writes the Human Handoff issue at Project creation by applying the canonical body at [`context/templates/human-handoff-issue-body.md`](templates/human-handoff-issue-body.md) (mirrored into the Linear UI as workspace-level template `Human Handoff`, ID `135dbbd2-68cc-46bc-873b-8b74788ea130`) — the canonical body carries the verbatim **Autonomous prep instructions** contract that the prep agent runs against, so nothing in the contract block should be hand-written or paraphrased. The Backlog Team then layers in the per-Project `## Context` and `## Anticipated human work` sections and wires Linear `Blocked by` relations to every sibling implementation issue and Project-level verification issue; verification issues are blocked by the implementation siblings they evaluate. Once every closeout prerequisite is `Done`, the `Blocked by` chain clears and HH becomes dispatch-eligible; a read-only **autonomous prep agent** picks it up, builds the warm context the human will resume into, and transitions HH to `In Review`. The human then resumes that session (`claude --resume <session-uuid>`), works the checkboxes, and moves the issue to `Done`. **A Project is not Done until its Human Handoff issue is Done.**

Projects that genuinely need no human touch still get the issue — it closes with "No human work required." That closure is signal about where the factory is fully autonomous, and the input for what to automate next.

`human-handoff`-labeled issues are the **only** shippable-issue category exempt from the Required-fields `Estimate` rule (the `1, 2, 4, 8, 16` complexity ladder). They are dispatched, but the absence of an estimate is itself the routing signal: symphonyd routes no-estimate issues to the cheapest capable model (Opus 4.8 Low today), which matches the fetch-heavy rote shape of the prep agent's work. See [`context/human-handoff.md`](human-handoff.md) § Authoring rules → Estimation and § Autonomous pre-closeout prep for the full contract.

### Applies everywhere

This standard applies to every `save_issue`, `save_project`, and `save_comment` call — new Projects, new issues, sub-issues, and blocker comments that another person or agent will act on. Skipping sections because an issue "seems obvious" is not permitted. If a section genuinely does not apply, write "N/A — <one-line reason>" rather than omitting it.

The AC / `External validation gates` split is required on every implementation issue that could enter the autonomous developer loop. If there are no external gates, write `External validation gates: none`. Never leave human-only work embedded in AC, and never create a second non-handoff issue that requires human action.

### Linear ↔ GitHub integration

The Linear ↔ GitHub integration auto-links a PR to its issue when the issue identifier (e.g. `RID-123`) appears in the branch name, PR title, or PR body, and auto-transitions the issue on PR open and merge per the team's workflow config. Agents do **not** need to write Linear-side transition code in GHA workflows — rely on the integration. Branch naming is `claude/<issue-id-lowercased>[-short-slug]` and PR titles use the prefix `[RID-123]: …`.

### Linear link format

When providing Linear issue, project, initiative, or document links to the user, use Linear desktop-app deep links only. Convert normal web URLs by replacing the `https://` scheme with `linear://`, preserving the rest of the URL exactly.

Example:

```text
linear://linear.app/riddimsoftware/issue/WEB-92/add-system-default-dark-mode-with-a-theme-toggle
```

Do not include the parallel `https://linear.app/...` link unless the user explicitly asks for a browser link.
