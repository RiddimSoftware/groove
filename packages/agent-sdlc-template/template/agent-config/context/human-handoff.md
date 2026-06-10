# Human Handoff Pattern

Every Project that ships through the autonomous factory has *some* human-touch surface — work an autonomous agent fundamentally cannot do, not because the work is ambiguous but because it requires human action: live demos, account provisioning, App Store UI work, design / legal / brand sign-offs, real-device verification, judgment calls. The **Human Handoff issue** is a first-class artifact that aggregates all of that work into one place per Linear Project, so the human knows exactly when and how to pick up.

This pattern was validated in [FAC-30](https://linear.app/riddim/issue/FAC-30): an autonomous feature build with a clean, named human-side acceptance pass at the end. Codifying it generalizes that experience.

## Why a Project-level issue rather than only per-issue gates

The per-issue **External validation gates** section in [`linear-standards.md`](linear-standards.md) names autonomous readiness checks or points to the matching Human Handoff checkbox for human work an individual issue produces (e.g. "App Store Connect submission" for a release issue). It keeps the developer-bot's loop focused on code and deterministic verification.

But Projects also produce human work that:

- Is *cross-issue* — the demo at the end of the Project covers all child issues together, not any single one.
- Is *discovered during dev / review*, not anticipated at issue-writing time — e.g. a developer hits a credential it cannot create and needs the human to provision it.
- Is *verification-shaped* — visual QA, real-data behavior, integration smoke tests that only matter once the code is merged.

Without an aggregator, these end up scattered across Linear comments, Slack threads, and the writer's head. The Human Handoff issue is the aggregator. The per-issue gates and the Project-level Human Handoff are complements: gates on implementation issues can point to the relevant human checklist item, while the Human Handoff owns the action itself plus the closing acceptance pass.

## Shape

Exactly one Human Handoff issue per Linear Project. Created at Project creation as the final child issue. Labeled `human-handoff`. Title format: `Human handoff for <Project name>`.

This is the only issue in the Project that may require human intervention. Every other issue must be autonomously implementable: the agent can read the issue cold, use the available repo context and tools, complete the work, verify it, and either open the required implementation PR or produce the authorized Project-level verification artifact without asking the writer a question.

The HH issue is also blocked by every sibling that must complete before human closeout: implementation issues and any Project-level verification issues. Verification issues are themselves blocked by the implementation siblings they evaluate. This is what gates the autonomous prep agent (below): HH becomes dispatch-eligible only after implementation is Done and the autonomous verification gates have produced their Linear artifacts and any follow-up implementation issues. Wiring the relations is the Backlog Team's responsibility at Project-creation time.

Required sections in the issue body:

- **Autonomous prep instructions** — leading instructional block, applied verbatim from the canonical body file [`context/templates/human-handoff-issue-body.md`](templates/human-handoff-issue-body.md), read by the autonomous prep agent. Names the read-only scope on this issue, the bounded prep checklist, the transition condition, and the override of the symphony default developer prompt (no PR, no commit). The Linear UI mirror lives at workspace-level template `Human Handoff` (template ID `135dbbd2-68cc-46bc-873b-8b74788ea130`); humans creating an HH issue in the Linear app pick that template from the menu and get this block automatically, while the Backlog Team skill reads the canonical .md from disk when creating HH issues programmatically. Run [`scripts/sync-hh-template.py`](../scripts/sync-hh-template.py) after editing the canonical .md to push the new body into the Linear template. Humans and agents do not edit this block on an existing HH issue during the Project's life — it is the contract the prep agent runs against. See § *Autonomous pre-closeout prep* below.
- **Anticipated human work** — seeded by the Backlog Team at Project creation, derived from the brief. One checkbox per item, each tagged with its class: `(prep-agent)` for items the prep agent can do via permitted writes-elsewhere (post-backs, follow-ups, relation/attachment wiring, CLI read-backs), or `(owner: <human role>)` for genuinely human-only items. Examples: "Run live demo of the recording-to-transcript flow" `(owner: product)`, "Submit App Store build for review" `(owner: release)`, "Update SIBLING-123 with a back-reference" `(prep-agent)`.
- **Discovered blockers** — appended during implementation when the developer encounters human-required work. Each entry: date, source (PR # or session), what's needed, suggested owner. Append-only — checking an item off is the resolution; the entry stays for the audit trail.
- **Verification checklist** — appended by the Developer when its self-review surfaces a check that needs human eyes after merge: visual QA items, real-data behavior checks, integration smoke tests.
- **Closing evidence** — written when the issue moves to `Done`. Names the human session (date, who, any LLM collaborator) and links to artifacts: demo recording, screenshots, sign-off message. This is what makes the closeout legible to anyone reading the Project later.

The issue's Definition of Done is: every checkbox is checked or explicitly waived, and the closing comment is present.

## Autonomous pre-closeout prep

Before the human sits down to close the Project, an autonomous **prep agent** runs against the Human Handoff issue and builds the warm-context session the human will resume into. The prep agent does not do human work — it does not check boxes, does not write to the HH issue body, does not post comments on the HH issue. Its only output is a fully-loaded conversation context (the session JSONL persisted on disk) that the human attaches to by `claude --resume <session-uuid>`.

### Why this exists

Closing a Project cold is expensive: the human re-fetches the Project, every sibling's AC and comments, every linked PR's diff, every follow-up filed during implementation. The prep agent eats that fetch cost on the cheap model so the human session starts informed.

### Trigger

`Blocked by` relations from every sibling cause the HH issue to remain ineligible for dispatch until every sibling reaches `Done`. The moment the last sibling moves to `Done`, the HH issue's `Blocked by` chain clears, the issue becomes dispatch-eligible, and symphonyd picks it up on its next tick. No cross-issue orchestration is required — the Linear dependency graph is the trigger.

### Prep agent contract

The prep agent runs under symphonyd with these rules, all encoded in the HH issue body's leading **Autonomous prep instructions** block:

- **Read-only on this issue, with two permitted terminal writes.** The agent may not edit the HH issue's description, title, or body checklist items, and may not post comments on it. All label edits on this issue are forbidden except the one permitted below. The two permitted terminal writes on this issue, executed in order at the very end of prep, are: (1) add the `hh-prepared` label to this issue — this is the symphonyd dispatch gate that prevents the ticket from being re-dispatched after prep completes — and (2) transition the issue's Linear state exactly once from `In Progress` to `In Review` as the "ready for human" signal. Writes elsewhere — filing follow-up tickets, commenting on sibling issues to flag late-discovered gaps, wiring relations/attachments, posting back-references — are permitted and follow the normal developer rules.
- **Two checkbox classes; execute the agent-actionable ones.** Checkboxes carry a class tag. `(prep-agent)` items are doable now via the Linear API/MCP or other tooling under the "writes elsewhere are permitted" clause — post-backs, filing follow-ups, wiring relations/attachments, running a CLI verification command. The prep agent's default is to **execute** every `(prep-agent)` item during the run, not hold it; it just cannot check the box off (that edits the HH issue), so it holds the evidence and the human checks the box at closeout. `(owner: <human role>)` items are genuinely human-only — telemetry inspection, product decisions, demos, sign-offs — and the agent holds a readiness assessment for the human. This is an ownership-labeling distinction, not a capability gate: the read-only constraint applies only to *this* issue, never to permitted writes elsewhere. Agent-doable items must **not** be tagged `(owner: factory operator)`. **Legacy HH issues** created before this two-class convention landed carry only the old single-owner labeling (every item tagged `(owner: factory operator)`); a prep agent running against one of those finds no `(prep-agent)` items and safely holds everything for the human, exactly as before. That is the intended fallback — existing HH issues are not retro-tagged, and the human self-serves the agent-actionable items at closeout as they did previously.
- **No PR, no commit, no branch push.** The symphony default-agent-prompt is implementation-shaped (creates a commit, opens a PR). The HH body's leading block explicitly overrides those instructions. There is no code change in a prep session.
- **Bounded checklist.** The work is a finite, enumerated fetch list — not "explore until satisfied." The agent works through the list, then stops. The checklist is the stop condition.
- **Model: Opus 4.8 Low (cheap, predictable for fetch-heavy work).** Routed by symphonyd's no-estimate policy: the HH issue carries no `estimate` field (per the exemption in `linear-standards.md`), and symphonyd routes no-estimate issues to the cheapest capable model. Max-tier models are over-capable for rote fetching and prone to running away on open-ended checklists.
- **Turn budget: the standard `agent.max_turns` in `symphony/shared.yml` (currently 20).** Parallelize fetches per sibling within a single turn (AC + comments + linked PR + merged diff in parallel) to fit larger Projects in the budget. If a Project genuinely cannot be prepped in 20 turns, that is a signal the Project was too large; reshape rather than raise the cap.

### Checklist contents

The prep agent works through these in order. The Backlog Team writes the exact list into the HH issue body's leading block at Project creation; this is the canonical reference for what that block must contain:

1. Fetch the parent Linear Project and its recent status updates.
2. For each sibling issue in the Project (every non-HH child): fetch AC, all comments, every linked PR (description + final diff for merged PRs), and any verification scorecard or follow-up issue links.
3. Read the target repo's `CLAUDE.md` (and any nested `CLAUDE.md` for subsystems the Project touched) plus any active execution plan under `docs/exec-plans/active/` named after the Project.
4. Read any follow-up tickets filed during implementation (typically linked from sibling-issue comments or from PR descriptions).
5. Walk every checkbox in this issue's `Anticipated human work`, `Discovered blockers`, and `Verification checklist` sections. Execute every `(prep-agent)`-tagged item now (the writes-elsewhere it needs are permitted) and hold the result/evidence; for each `(owner: <human role>)` item, hold an answer or readiness assessment. Do not write into the HH issue body — the agent cannot check boxes off; the held context travels to the human, who checks them at closeout.
6. Add the `hh-prepared` label to this issue (creates it in the Linear team if it does not yet exist, via `create_issue_label`), then transition this issue's Linear state from `In Progress` to `In Review`, then exit.

### Human resume

When the prep agent exits, the persisted session JSONL is the handoff artifact. The human starts the closeout session with `claude --resume <session-uuid>` against that JSONL, then `/model claude-opus-4-8-low` (or whatever speed/cost tier they prefer for the live session — the expensive synthesis is already done). The first message is typically "walk me through what you found." The prep agent's loaded context answers it.

### Symphony-side dependencies

The following symphonyd policy bits support this contract:

- `dispatch_excluded_labels: [hh-prepared]` in `symphony/shared.yml` — prevents re-dispatch of HH tickets after prep completes. The `hh-prepared` label is added by the prep agent as the last step before state transition.
- A no-`estimate` → Opus 4.8 Low routing rule in the symphonyd LLM routing config routes HH issues (which carry no `estimate` field) to the cheap model.
- The symphony default-agent-prompt trusts the HH issue body's leading **Autonomous prep instructions** block to override its implementation-shaped instructions (no PR, no commit, no branch push). Explicit prompt branching on the `human-handoff` label remains a defense-in-depth improvement that can be added independently.

## Lifecycle

1. **Project creation (Backlog Team)** — create the Human Handoff issue as the final child of the Project. Apply the canonical body — humans pick the workspace-level `Human Handoff` template from the Linear UI menu, the Backlog Team skill reads [`context/templates/human-handoff-issue-body.md`](templates/human-handoff-issue-body.md) from disk and passes it as `description` (see `backlog-team/references/ticket-templates.md` § *Worked example 3 — Human Handoff issue* for the exact flow). Then fill `## Context` and seed `Anticipated human work` from the brief. Apply the `human-handoff` label (create the label once per Linear team via `create_issue_label` if it does not exist). Create Linear `Blocked by` relations from this issue to every sibling implementation issue and Project-level verification issue in the Project so HH is not dispatch-eligible until implementation and verification are `Done`.
2. **During implementation (Developer)** — when the agent hits a blocker that requires a human, append a bullet to `Discovered blockers` with date, PR/session source, and what's needed. The agent then either continues past the blocker (if the implementation can advance without it) or surfaces it as a hard blocker on the originating issue per the standard blocker flow. When its self-review surfaces a verification that needs human eyes after merge, the agent appends a bullet to `Verification checklist` rather than blocking the PR on it.
3. **Autonomous pre-closeout prep (prep agent)** — once every sibling is `Done`, HH becomes dispatch-eligible. The prep agent picks it up under symphonyd, transitions it `Todo` → `In Progress`, executes the bounded checklist in the issue body's leading block, then adds the `hh-prepared` label (the dispatch gate — prevents re-dispatch after prep) and transitions `In Progress` → `In Review`, then exits. The session JSONL persists for human resume. (See § *Autonomous pre-closeout prep* above for the contract.)
4. **At Project closeout (human)** — the human resumes the prep session via `claude --resume <session-uuid>`, drops the model to a faster tier for the live conversation, and runs through every checkbox in one focused session. When every item is checked or waived, write the closing-evidence comment and move the issue to `Done`. The Project is not Done until this issue is Done.

## When the Human Handoff issue is genuinely empty

Some Projects need no human touch — typically infrastructure refactors, dead-code removal, or pure dependency bumps. The issue still exists. At closeout, it gets a closing comment "No human work required" and moves to `Done`.

This is signal, not waste. It tells the org which Project shapes are fully autonomous and which still need humans. That distribution is the input for what to automate next.

## Authoring rules

- **Do not weaken implementation-issue AC** by moving human work back into it. The Human Handoff issue is the correct surface for human-only work; implementation issue AC must stay verifiable by an autonomous developer (per [`linear-standards.md`](linear-standards.md) Autonomous-only rule).
- **Do not create additional human-dependent issues.** If a Project appears to need two or more tickets that require human intervention, consolidate that work into this issue. Split autonomous repo work into separate implementation issues, but keep human decisions, approvals, access provisioning, and manual production actions here.
- **Discovered blockers are append-only** during the Project's life. Resolving an item means checking it off, not editing or removing the entry. The full history is the audit trail for "what did this Project need from a human?" — and the input for spotting recurring friction worth automating away.
- **Blocked by every closeout prerequisite.** At Project creation, the Backlog Team wires Linear `Blocked by` relations from this issue to every sibling implementation issue and every Project-level verification issue. Verification issues are blocked by the implementation siblings they evaluate, so the dependency graph is the dispatch gate for the autonomous prep agent (see § *Autonomous pre-closeout prep*); no separate orchestrator logic checks "is HH the only non-Done issue?" — Linear's `Blocked by` already encodes it. A Project that ships an HH issue without these relations bypasses the gate and may dispatch HH before its siblings or verification gates are done.
- **Autonomous prep instructions block is sourced from the canonical .md, not free-form.** The canonical body lives at [`context/templates/human-handoff-issue-body.md`](templates/human-handoff-issue-body.md); the Linear UI mirror lives at workspace-level template `Human Handoff` (template ID `135dbbd2-68cc-46bc-873b-8b74788ea130`), updated by running [`scripts/sync-hh-template.py`](../scripts/sync-hh-template.py) after .md edits. Humans creating an HH issue pick the template from the Linear UI; the Backlog Team skill reads the .md from disk. Humans and agents do not edit this block on an existing HH issue during the Project's life. The block is the prep agent's contract — divergence breaks the contract. Project-specific verification steps (commands to run, files to spot-check, sign-offs) belong in `Anticipated human work`, not in the prep instructions block.
- **Estimation — exempt from the estimate field.** The HH issue carries no `estimate` field. Under the autonomous prep contract, symphonyd routes no-estimate issues to the cheapest capable model (Opus 4.8 Low today), which is the right tier for fetch-heavy rote prep work. This is the only category of shippable issue exempt from the complexity-estimate requirement; human-side effort is tracked on the human's calendar, not in the Linear estimate field.

## Relationship to per-issue External validation gates

These are complements, but the Human Handoff issue is the single source of truth for human action:

- **Per-issue External validation gates** on implementation issues should name autonomous readiness checks or point to the matching checkbox in the Human Handoff issue.
- **Project-level verification issues** own autonomous architecture, surface, or other standards checks that run after implementation and before Human Handoff; they post a verification artifact and file follow-up implementation issues when needed.
- **Project-level Human Handoff** owns the human action itself, including cross-issue and discovered work plus the closing acceptance pass.

In practice at Project creation: the Backlog Team writes implementation issues so they can be completed autonomously, writes any Project-level verification issues as autonomous gates blocked by the implementation siblings, and writes the Human Handoff issue as the only human-intervention surface blocked by those gates. A per-issue gate may say "see Human Handoff: App Store submission checkbox," but it must not make the implementation issue depend on the human completing that checkbox before the PR can be opened.

## Naming and label summary

- **Labels**: `human-handoff` (applied at creation, one per Linear team, created on demand) and `hh-prepared` (applied by the prep agent at the end of the prep run as the symphonyd dispatch gate).
- **Issue title**: `Human handoff for <Project name>`.
- **Position in Project**: always the final child issue, after every implementation issue.
- **Dependency wiring**: `Blocked by` every sibling implementation issue and Project-level verification issue; each verification issue is blocked by the implementation siblings it evaluates.
- **Status flow**: `Backlog` (Backlog Team writes) → `Todo` (promoted when ready, like any other issue) → `In Progress` (prep agent picks it up once unblocked) → `In Review` (prep agent adds `hh-prepared` label, completes the prep checklist, and exits) → `Done` (human resumes via `claude --resume <session-uuid>`, runs through the human checkboxes, posts closing-evidence comment).
