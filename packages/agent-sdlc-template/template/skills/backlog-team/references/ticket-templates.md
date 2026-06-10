# Templates

Two templates: **Project** (Linear's epic-equivalent) and **Issue**. Each is a markdown shape the skill writes into the Linear `description` field via `save_project` and `save_issue`. Linear has no Sub-task primitive — when work needs to be broken further, create child Issues with a `parent` relation.

Both templates follow the org-wide Linear Issue Standards (`/YOUR/WORKSPACE/DIR/agent-config/context/linear-standards.md`). Read those once per session — they are the source of truth for required sections; this file shows how to populate them in the Backlog Team's voice.

The skill checks the project's existing issues (read 2–3 via `get_issue` and `get_project`) to:
- Match the project's section conventions (some teams use `## Acceptance criteria`; others put AC in a sub-heading).
- Match the team's relation conventions (parent/child vs `Blocks`/`Blocked by`).
- Match the project's heading style (markdown vs. h2 prefix, etc.).

---

## Project template (Linear's epic-equivalent)

```markdown
## Objective
<One-paragraph statement of the desired outcome — what changes for users / the business when this is done. Outcome-oriented, not feature-oriented.>

## Why now
<What changed that makes this the right time? Strategic shift, customer signal, technical readiness, deadline. If "we always wanted to," that's not a reason — push back.>

## Four risks (Cagan)
- **Value** — <will customers care? what evidence?>
- **Usability** — <will users figure it out? where's the friction?>
- **Feasibility** — <can engineering build this in the available time? what's the architecture impact?>
- **Business viability** — <does sales / legal / finance / brand align? any compliance issues?>

## Scope (in)
<Bulleted list of capabilities this Project delivers. Outcome-oriented bullets, not feature lists.>

## Out of scope
<Explicit non-goals. Anything tangentially related but not committed.>

## Architecture & data model
<For software Projects: high-level design, data shapes, integration points, ADRs to write or update. For non-software Projects: replace with the equivalent — design system tokens, marketing channels, evidence sources. For behavior-changing Projects, name the use cases the Project creates or changes; child Issues fill in the per-use-case Clean Architecture Shape.>

## Mergeability plan
<For software Projects: change-collision map for the child Issues. For each child, list target repo, primary code owner, expected hot files/modules, conflict risk (`low` / `medium` / `high`), sequencing lane (`foundation` / `parallel` / `serial` / `integration`), and dependency notes. For non-software Projects: write `N/A — no implementation PRs.`>

## Sequencing & dependencies
<Order of child Issues. `Blocks` / `Blocked by` relationships. Linked Project IDs.>

## Success metrics
<How we'll know this worked. Specific, measurable, tied to North Star or OKR.>

## Risks & mitigations
<Top 3 risks. For each: likelihood, impact, mitigation, owner.>

## Definition of Done
<Concrete, testable. "Project is done when …" — not vague.>

## Child issues
<List the planned child Issue identifiers + summaries. Filled in during creation; updated as Issues are added. Per the SKILL's Project completeness contract, never publish a Project without its full child hierarchy.>
```

**Field choices (`save_project`):**
- `name` — imperative, concise (≤ 80 chars). e.g. `Schema engine — JSON-driven parser registry`.
- `priority` — Urgent / High / Medium / Low / No priority based on RICE / WSJF rank.
- `state` — `backlog` or `planned` for work the Backlog Team is shaping (never `started`, `completed`, `canceled`).
- `teamIds` — single team for single-team Projects; multiple for cross-team Projects.
- `leadId` — leave unassigned by default.
- Linear has no Project-level labels; capability tagging happens on child Issues.

---

## Issue template

```markdown
## Context
<2–4 sentences. What's the situation? Why this issue now? Link to parent Project and any prerequisite issues.>

## User story
<One of:
- "As a <role>, I want <capability>, so that <benefit>." — consumer / user-facing
- "When <situation>, I want to <motivation>, so I can <outcome>." — B2B / platform / internal
- "We believe <X> will result in <Y>. We'll know we're right when <signal>." — experiment>

## Inputs / dependencies
<What the implementor receives: data shapes (with JSON examples for APIs), upstream issues, design files, content briefs. Be precise. For cross-repo work, name the target repo explicitly.>

## Acceptance criteria
<Either Gherkin scenarios or a checkbox list:
- [ ] Specific, observable, testable.
- [ ] No "and"-chains — split if needed.
- [ ] Edge cases included.

Or:
**Scenario: <name>**
- Given <precondition>
- When <action>
- Then <observable outcome>>

## Out of scope
<Explicit non-goals for THIS issue. Avoid scope creep.>

## Mergeability / change ownership
Reason to change: <single responsibility this PR owns>
Primary code owner: <use case / adapter / module / generated artifact family / UI surface>
Expected hot files/modules:
- <path or module>
Sibling collisions:
- <issue id or "none">
Conflict risk: <low / medium / high> — <one-line reason>
Sequencing lane: <foundation / parallel / serial / integration>
Dependency notes: <Linear `Blocks` / `Blocked by` relation to add, or `none`>

## Risks / notes for implementer
<Anything non-obvious. Hidden constraints, gotchas, prior incidents to avoid repeating.>

## Clean Architecture Shape
<Required for behavior-changing issues. Write `N/A — <reason>` for copy / metadata / release / dependency / visual-polish / infrastructure-wiring / adapter-only work.

- **Use case** — named application behavior (verb phrase, e.g. `RecognizeSong`, `IngestScreenshot`); mark as new / existing / changed.
- **Entities / value objects** — domain concepts the behavior reads or changes.
- **Ports** — interfaces the use case needs for external capabilities.
- **Adapters** — concrete frameworks, SDKs, databases, APIs, or UI surfaces expected to implement those ports.
- **Boundary rule** — imports or concrete details that must not cross inward.
- **Catalog update** — yes / no: must the repo's use-case catalog be added to or updated in the implementation PR?>

## Definition of Done
<Concrete, testable completion criteria for THIS issue. "Done when …" — not vague. Distinct from acceptance criteria: AC is per-scenario; DoD is the holistic gate (tests written, docs touched if relevant, evidence captured).>
```

**Writer checklist before publishing (Definition of Ready — not in the issue body):**
- [ ] Acceptance criteria unambiguous
- [ ] Designs / specs linked (if applicable)
- [ ] Dependencies listed and linked
- [ ] Mergeability / change ownership section filled in for implementation issues
- [ ] No two ready sibling issues intentionally edit the same primary hot file/module unless serialized
- [ ] Estimable
- [ ] No external knowledge required to implement

**Field choices (`save_issue`):**
- `title` — imperative, concise (≤ 80 chars). For behavior-changing work, lead with the use-case verb phrase (e.g. `Implement RecognizeWagersFromBookmakerScreenshot for bet365`).
- `projectId` — set to the parent Project's ID.
- `parentId` — set when the issue is a child of another Issue (Linear's parent/child relation; replaces the legacy "subtask" concept).
- `priority` — inherits from Project unless prioritization framework says otherwise.
- `estimate` — required on every shippable issue. Use the complexity ladder defined in [`context/linear-standards.md` § *Estimating issues*](https://github.com/YourGithubOrg/agent-config/blob/main/context/linear-standards.md#estimating-issues). This is complexity of the work (novel reasoning, AC ambiguity, architectural surface), not effort hours. When in doubt, upgrade one tier. Issues that would estimate above the ladder maximum must be split at issue-writing time.
- `labels` — capability tags (`schema-engine`, `ios`, `growth`); never status. There is no `spike` label and no investigative / finding-only issues — every issue is implementation work that lands a versioned artifact via a PR gated by CI; a testable hypothesis is an implementation issue with a metric (`experiment`). Apply `bug` / `experiment` where applicable.
- `stateId` — `Backlog` only. Never `Todo` / `In Progress` / `In Review` / `Done`.
- `assigneeId` — leave unassigned by default. The Backlog Team does not pick up work.
- Cross-issue dependency: use Linear's `Blocks` / `Blocked by` relation, not a custom link type.

**Single repo per issue (required for implementation issues):** Every implementation issue lands in exactly one target repo. If the work spans multiple repos, split it into repo-scoped child issues — each implementable in its own repo — before writing. Multi-repo coordination belongs at the Project level.

**Mergeability / change ownership (required for implementation issues):** Every implementation issue must name one reason to change and one primary code owner. Use the Project's Mergeability plan to decide whether the issue is `foundation`, `parallel`, `serial`, or `integration`. If two child issues would edit the same hot file/module, add a Linear dependency instead of treating both as parallel-ready work.

---

## Worked example 1 — Software Project + child issue

**Project — `Schema engine — JSON-driven parser registry`** (BAP team)

```markdown
## Objective
Replace the hand-written C++ parsers with a JSON-driven schema engine so adding a new bookmaker takes 1 day, not 1 week, and the resulting parsers are testable in Swift without round-tripping through a screenshot pipeline.

## Why now
17 hand-written parsers shipped; the cost-of-change has crossed the threshold where adding a new sportsbook is dominated by parser maintenance, not feature work. Compounds with the upcoming Android port — a JSON-driven engine ports cleanly; C++ doesn't.

## Four risks (Cagan)
- **Value** — High. Unblocks 3 in-flight bookmakers and reduces parser-bug volume by ~60% based on review-loop data.
- **Usability** — Internal-only; no end-user impact. Internal "user" = parser author; usability gain is the whole point.
- **Feasibility** — Medium. Schema design and Vision-coordinate handling are the hard parts. Feasibility was settled as pre-work; the schema spec landed as a versioned artifact in BAP-150.
- **Business viability** — High. Reduces engineering time per new bookmaker by ~80%, directly tied to expansion roadmap.

## Scope (in)
- JSON schema format spec for bookmaker parsers
- Schema engine that consumes a schema + screenshot and returns structured wagers (changes `RecognizeWagersFromBookmakerScreenshot` use case — adapter swap)
- Swift test harness that drives the engine off recorded screenshots
- Migration of all 17 existing My Bets parsers (one Issue per parser)
- Retirement of the C++ parser registry

## Out of scope
- Receipt-screen parsers (separate Project — BAP-173)
- Android port (separate Project — its own story map)
- Schema authoring UI

## Architecture & data model
Schema engine is a new adapter for the existing `RecognizeWagersFromBookmakerScreenshot` port. Domain layer (`Wager`, `Bookmaker`, `ParseResult`) unchanged. Vision-coordinate handling stays in the adapter; the use case continues to depend only on the port.

## Mergeability plan
- BAP-156 (engine implementation): YourGithubOrg/bap; owner `SchemaDrivenBookmakerParser`; hot files `SchemaEngine/`, parser port tests; risk medium; lane `foundation`; blocks per-bookmaker migrations.
- BAP-157…BAP-173 (per-bookmaker migrations): YourGithubOrg/bap; owner one schema file + one fixture set per bookmaker; hot files `Schemas/<bookmaker>.json`, `Fixtures/<bookmaker>/`; risk low; lane `parallel` after BAP-156.
- BAP-176 (C++ retirement): YourGithubOrg/bap; owner parser registry + build config; hot files parser registry/build files; risk high; lane `integration`; blocked until all migrations merge.

## Sequencing & dependencies
1. Schema spec (BAP-150) — DONE
2. Engine implementation — this Project
3. Per-bookmaker schema migrations (17 Issues, parallelizable)
4. C++ retirement (BAP-176) — blocked until all 17 migrated

## Success metrics
- Time-to-add-bookmaker < 1 day (was ~1 week)
- Parser-related defect rate ↓ ≥ 50% within 30 days of full rollout
- All 17 existing parsers migrated with no regression in BAP-288 eval suite

## Risks & mitigations
- Vision coordinate drift across iOS versions → versioned schemas + regression suite (BAP-478 visual snapshot harness)
- Schema bloat → enforce DRY via schema fragments / shared snippets
- Migration drag → time-box per parser to 1 day; if it exceeds, split into a dedicated Issue

## Definition of Done
- All 17 My Bets parsers running off the schema engine
- C++ parsers deleted
- BAP-288 eval accuracy ≥ baseline on the schema engine
- Docs updated in repo `docs/schema-engine.md`

## Child issues
BAP-156 … BAP-172 (one per bookmaker), BAP-176 (C++ retirement)
```

**Sample child Issue — `Implement schema-driven parser for bet365`**

```markdown
## Context
Migrate the bet365 My Bets parser from hand-written C++ to the new schema engine (parent Project: schema engine — JSON-driven parser registry). Bet365 is the highest-volume parser and the most likely to surface schema-spec gaps; doing it second after a representative simpler bookmaker is intentional.

## User story
As a parser author, I want a JSON schema that captures the bet365 My Bets layout so that adding a new bet365 surface (e.g. cashout flow) only requires editing a schema fragment, not C++.

## Inputs / dependencies
- Parent Project: schema engine
- Schema spec: BAP-150 (DONE)
- Reference recording set: `recordings/bet365/` (24 screenshots covering single, parlay, cashout-eligible, settled)
- Existing C++ parser: `Parsers/Bet365MyBets.cpp` — read for behavior reference, do not modify

## Acceptance criteria
**Scenario: parse a single straight bet**
- Given a bet365 single-wager screenshot from the reference set
- When the schema engine runs against `bet365.json`
- Then the resulting `Wager` matches the C++ parser's output exactly

**Scenario: parse a 4-leg parlay**
- Given a bet365 4-leg parlay screenshot from the reference set
- When the schema engine runs against `bet365.json`
- Then leg count, leg outcomes, and total stake/return match the C++ parser's output

- [ ] Eval suite (BAP-288) runs green for bet365 against the new schema
- [ ] No regression in the 24-screenshot reference set
- [ ] Schema fragments shared with at least one other bookmaker (DRY)

## Out of scope
- bet365 receipt-screen parser (separate Project)
- Cashout settlement detection (separate Issue, blocked on this one)

## Mergeability / change ownership
Reason to change: migrate the bet365 My Bets parser onto the schema engine.
Primary code owner: bet365 schema adapter.
Expected hot files/modules:
- `Schemas/bet365.json`
- `Fixtures/bet365/`
- bet365 parser regression tests
Sibling collisions:
- none after BAP-156 lands; BAP-176 touches the shared parser registry later.
Conflict risk: low — this PR owns one bookmaker schema and fixture set.
Sequencing lane: parallel
Dependency notes: blocked by BAP-156; BAP-176 blocked by this issue.

## Risks / notes for implementer
- Vision-coordinate drift between iOS 17 and iOS 18 was a problem on the C++ parser; the snapshot harness in BAP-478 catches this — run it locally before pushing.
- The "Each Way" stake field on bet365 is rendered in two different positions depending on screen height — schema must support coordinate ranges, not absolute coords.

## Clean Architecture Shape
- **Use case** — `RecognizeWagersFromBookmakerScreenshot` (changed — adapter swap, not a new use case)
- **Entities / value objects** — `Wager`, `BookmakerId`, `ParseResult`
- **Ports** — `BookmakerParser` (existing; signature unchanged)
- **Adapters** — new: `SchemaDrivenBookmakerParser` (consumes `bet365.json`); retiring: `Bet365MyBetsCppParser`
- **Boundary rule** — domain entities and the use case must not import UIKit, Vision, or any C++ bridging type. Coordinate translation stays in the adapter.
- **Catalog update** — yes. Update `docs/use-cases.md` to note the adapter swap for bet365.

## Definition of Done
- `bet365.json` schema committed under `Schemas/`
- Eval suite green for bet365 (BAP-288)
- C++ bet365 parser deleted in the same PR
- Use-case catalog updated
```

Estimate: `8` (multi-file change, established pattern, clear AC, no novel reasoning beyond bet365's quirks).
Labels: `schema-engine`, `ios`, `bookmaker:bet365`.

---

## Worked example 2 — Marketing Project

**Project — `Beta launch campaign — first 100 users on s2sbets.app`** (BAP team)

```markdown
## Objective
Acquire 100 active users on s2sbets.app within 30 days of beta launch, with retention ≥ 40% at day 7. Validate that organic + paid channels can sustain a $20 CAC.

## Why now
App is feature-complete for sports vertical; BAP-26 sets a 30-day acquisition window starting 2026-04-23. Marketing must run concurrently — this Project is the marketing arm of that launch.

## Four risks (Cagan)
- **Value** — Medium. Sports-bet tracking is a known need; differentiation is "no manual entry." Need to prove acquisition channels.
- **Usability** — Channel-specific. Organic SEO + paid social have different UX assumptions; covered per-issue.
- **Feasibility** — High. Standard digital marketing playbook.
- **Business viability** — High at $20 CAC; risk if CAC > $40 — this Project includes a kill-switch issue to pause paid if CAC exceeds.

## Scope (in)
- Channel mix definition + budget allocation
- Landing page conversion optimization (links to Designer Project for Figma deliverables)
- Paid social campaign (TikTok, Instagram)
- SEO content calendar (links to BAP-195 SEO Foundation)
- Influencer outreach (sports betting micro-influencers)
- Analytics + attribution setup (links to Data Project for instrumentation)

## Out of scope
- Web app build (separate Tech Project)
- Long-tail SEO past 30-day window (post-launch optimization)

## Sequencing & dependencies
1. Analytics setup (blocking) — must precede any channel spend
2. Landing page (blocking) — must precede paid acquisition
3. Channels in parallel: paid social, influencer, SEO
4. Weekly review issue (recurring): adjust mix based on CAC

## Success metrics
- 100 active users at day 30 (active = ≥ 1 wager tracked)
- D7 retention ≥ 40%
- CAC ≤ $20 (paid only); blended CAC including organic ≤ $10
- Conversion rate from landing → install ≥ 8%

## Risks & mitigations
- CAC overrun → kill switch at $40, weekly review issue enforces it
- Apple App Tracking Transparency limiting attribution → pre-decision: use SKAdNetwork + survey-based attribution
- Influencer no-shows → 2× the outreach pipeline vs. needed bookings

## Definition of Done
- 100 users acquired OR 30 days elapsed (whichever first)
- Post-mortem issue written with channel performance + CAC table
- Recommendations for sustained-growth budget posted to roadmap

## Child issues
- Set up GA4 + Mixpanel + SKAdNetwork postbacks
- Launch landing page v1 (links to Designer Project for Figma)
- Run TikTok creator campaign — first 5 creators
- Influencer outreach pipeline (recurring weekly)
- SEO content sprint — 4 articles, top-of-funnel
- Weekly review + mix adjustment (recurring)
```

Child issues use the Issue template. For each, the **Clean Architecture Shape** section reads `N/A — marketing campaign issue, no app/service behavior change.` Estimates apply normally (most marketing issues land at `2`–`8`).

---

## Worked example 3 — Human Handoff issue

Every Project ends with a `human-handoff`-labeled child issue. This is the only category of issue the Backlog Team writes that does not follow the standard implementation-issue template — its body is read by both the autonomous prep agent (under symphonyd) and the human closing the Project, and its leading block is a contract, not free prose.

Full spec: [`/YOUR/WORKSPACE/DIR/agent-config/context/human-handoff.md`](https://github.com/YourGithubOrg/agent-config/blob/main/context/human-handoff.md).

### Canonical body lives in agent-config; Linear template mirrors it

The HH issue body is no longer inlined in this doc. It lives in a checked-in Markdown file and is mirrored into a workspace-level Linear issue template so both LLM and human creation paths use the same contract.

- **Canonical source (Markdown):** [`agent-config/context/templates/human-handoff-issue-body.md`](https://github.com/YourGithubOrg/agent-config/blob/main/context/templates/human-handoff-issue-body.md)
- **Linear UI mirror:** workspace-level template `Human Handoff` (template ID `135dbbd2-68cc-46bc-873b-8b74788ea130`, `team: null`) — surfaces in every team's create-issue template menu.
- **Sync from canonical → Linear:** `python3 /YOUR/WORKSPACE/DIR/agent-config/scripts/sync-hh-template.py` after edits. Idempotent.

The split exists because Linear stores template bodies as a ProseMirror AST (`descriptionData`), not Markdown — there's no clean round-trip back to Markdown. So the Markdown file in agent-config is the source of truth; the Linear template is a one-way mirror updated by the sync script.

### How to apply the template

**Humans (Linear UI):** when creating an HH issue, pick `Human Handoff` from the template menu. The body, including the verbatim Autonomous prep instructions contract, is pre-filled.

**Backlog Team skill (Linear MCP `save_issue`):** the Linear MCP `save_issue` tool does not currently expose `templateId`, so the body must be written explicitly. **Read the canonical body file from disk** and pass it as `description`:

```python
# Inside the skill's HH creation step
body = open("/YOUR/WORKSPACE/DIR/agent-config/context/templates/human-handoff-issue-body.md").read()
# Then substitute the two placeholder blocks (## Context, ## Anticipated human work) with
# per-Project content. Leave the leading `## Autonomous prep instructions` block,
# `## Discovered blockers`, `## Verification checklist`, and `## Closing evidence`
# blocks exactly as the template provides them.
```

Then layer in per-Project fields:

- Fill `## Context` (2–4 sentences, link to parent Project).
- Fill `## Anticipated human work` (project-specific checkboxes derived from the brief). Tag every checkbox with its class: `(prep-agent)` for items the prep agent can do via the Linear API/MCP or other tooling under the prep contract's "writes elsewhere are permitted" clause (post-backs, filing follow-ups, wiring relations/attachments, running a CLI verification command); do not tag these `(owner: factory operator)`. Use `(owner: <human role>)` only for genuinely human-only items such as live demos, real-device verification, browser-only vendor portals with no API/CLI path, telemetry/product judgment, legal/brand sign-off, physical access, or partner procurement. **Project-specific verification steps (commands to run, files to spot-check, sign-offs) belong here — NOT in the prep instructions block. At item creation time, the Backlog Team must draft or specify the exact verification command(s) (e.g., `python3 verify_handoff.py` or test commands) as `(prep-agent)` checkboxes. This establishes the deterministic verification contract that developers must implement/satisfy, allowing both the implementor agent and the prep agent to run the script to prove the handoff state is healthy and all required tasks in the HH ticket are complete.**
- Leave `## Discovered blockers`, `## Verification checklist`, and `## Closing evidence` with their template-default placeholders. The Developer and the closing human fill them later.

**Never paraphrase, trim, or substitute the `## Autonomous prep instructions` block.** It is the contract the prep agent runs against. The whole point of moving it to a canonical .md is so the body has one source — read it, don't retype it.

### Field choices (`save_issue` for the HH issue)

- `title` — `Human handoff for <Project name>`.
- `projectId` — the parent Project's ID.
- `labels` — must include `human-handoff` (create via `create_issue_label` once per team if absent).
- `estimate` — **omit** (the only shippable-issue exemption from the estimate rule; symphonyd uses no-estimate as the routing signal to Opus 4.8 Low).
- `stateId` — `Backlog` (Backlog Team default).
- `priority` — inherit from Project.

### Linear relations to wire after `save_issue` succeeds

- Add a `Blocked by` relation from this HH issue to **every** sibling implementation issue created in the same Project. This is the dispatch gate — without these relations, HH could be picked up before its siblings are done, and the prep agent would walk into a half-implemented Project. The Project Completeness Contract is incomplete until these relations are wired.

---

## Field-mapping cheatsheet

When `save_issue` / `save_project`-ing, the body content goes into the `description` field. For other fields:

| Template element | Linear field on `save_issue` | Notes |
|---|---|---|
| Title line | `title` | Imperative, ≤ 80 chars |
| Project ↔ Issue link | `projectId` | Replaces the legacy "Epic Link" relation; one Project per Issue |
| Issue ↔ child Issue link | `parentId` | Native parent/child relation; replaces the legacy "Sub-task" issuetype |
| Cross-issue blocking | Linear `Blocks` / `Blocked by` issue relation | First-class relations; no separate link-types call |
| Priority | `priority` | Urgent / High / Medium / Low / No priority |
| Estimate (complexity) | `estimate` | First-class field; complexity ladder defined in [`context/linear-standards.md` § *Estimating issues*](https://github.com/YourGithubOrg/agent-config/blob/main/context/linear-standards.md#estimating-issues) |
| Labels | `labelIds` (resolved from label names) | Lowercase, hyphenated; capability + intent tags (`bug`, `experiment`) |
| Workflow state | `stateId` | `Backlog` only for Backlog Team writes — never `Todo` |
| Team | `teamId` | Resolve once per session via `get_team` |
| Cycle | `cycleId` | Backlog Team leaves unset |

For Projects, equivalent fields on `save_project`: `name`, `description`, `priority`, `state` (`backlog` / `planned`), `teamIds`, `leadId`.

Always run `get_team` and `list_issue_labels` once per session to discover team-specific label IDs and required fields. For Initiatives (workspace-level groupings of Projects), use `list_initiatives` / `save_initiative` — Initiatives are above Projects, not below them.
