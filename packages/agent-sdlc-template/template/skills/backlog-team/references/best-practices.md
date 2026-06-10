# Backlog Best Practices — Reference

Frameworks the Backlog Team applies. Sourced from the canonical literature and influential industry voices. Each entry: framework, source, definition, how the skill uses it.

---

## 1. Hierarchy & decomposition

### Epic → Story → Subtask (Atlassian, SAFe, Mike Cohn)

| Layer | Definition | Typical scope | Contract |
|---|---|---|---|
| **Epic** | Strategic initiative spanning multiple sprints; significant customer-facing capability or business objective | 2–6 months | Must decompose into stories; defines *why* the work matters |
| **Story** | Sprint-sized user requirement capturing end-to-end functionality | 1–2 sprints (< 40 hours) | Must deliver measurable value; completable in one sprint |
| **Subtask** | Implementation-level action that breaks a story into execution steps | Hours–days | Must be atomic; enables story completion; no further decomposition |

**Boundary insight:** Epic ↔ Story is the strategic-to-tactical boundary; Story ↔ Subtask is the tactical-to-execution boundary. Skill use: every Project must produce Issues with this contract intact, every Issue must decompose into child Issues an implementor can execute without the Issue author present.

Source: [Atlassian: Epics, Stories, Initiatives](https://www.atlassian.com/agile/project-management/epics-stories-themes), [SAFe](https://framework.scaledagile.com/).

**Mapping to Linear (the org's tracker):** Linear has no Epic or Sub-task issuetype. The conceptual Epic ↔ Story ↔ Subtask hierarchy maps to **Project → Issue → child Issue (`parentId`)** in Linear's data model. Above Project, Linear has a workspace-level **Initiative** that groups Projects across teams (the "Theme / Initiative above Epic" row below).

### Theme / Initiative above Epic
Use when 3+ Projects align toward a single business outcome, work spans 6+ months, or strategy must ripple coherently across the roadmap. Skill use: in Linear, this is the workspace-level Initiative construct; signaled by the user wanting "an initiative for X". Otherwise stay at Project.

---

## 2. Story-quality criteria

### INVEST (Bill Wake)

| | Definition | Skill takeaway |
|---|---|---|
| **Independent** | Can be scheduled in any order without overlap | Avoid serialized dependencies; refactor cross-cutting concerns into separate stories |
| **Negotiable** | Details emerge through conversation; story is a starting point | Description = conversation starter, not specification |
| **Valuable** | Delivers measurable benefit | Slice vertically through layers; avoid dev-only stories unless they unblock value |
| **Estimable** | Team has enough context to size | If you can't estimate, the story is too vague — refine or split |
| **Small** | < one sprint | If > 2 weeks, decompose |
| **Testable** | Clear acceptance criteria; testable before implementation | Gherkin verifies testability |

Sources: [XP123](https://xp123.com/invest-in-good-stories-and-smart-tasks/), [Agile Alliance](https://agilealliance.org/glossary/invest/).

### DEEP backlog (Roman Pichler / Mike Cohn)

- **Detailed appropriately** — near-term stories heavily refined; far-future ones sketched.
- **Estimated** — every backlog item has a rough size.
- **Emergent** — backlog evolves with feedback; deprecated items removed.
- **Prioritized** — total order, no "nice to have" tiers.

Skill use: when refining the backlog, only deeply detail items the team is likely to pull in the next 1–2 sprints; lighter touch on items further out.

Source: [Roman Pichler: Make the Product Backlog DEEP](https://www.romanpichler.com/blog/make-the-product-backlog-deep/).

### Definition of Ready vs Definition of Done

| | DoR | DoD |
|---|---|---|
| When | Before pull / pickup | After implementation |
| Items | AC clear, dependencies mapped, designs available, team agrees on scope, testable | Code reviewed, tests pass, docs updated, deployed to staging, security check |
| Owner | Product + team | Development team |

Skill use: every Issue the Backlog Team writes must meet DoR before it leaves the skill (writer checklist — not in the issue body), AND must include a concrete **Definition of Done** section in the issue body per the Linear Issue Standards. DoR is the gate the Backlog Team applies; DoD is the gate the Developer role enforces — but the DoD wording is the Backlog Team's responsibility.

Source: [Atlassian: Definition of Ready](https://www.atlassian.com/agile/project-management/definition-of-ready).

### Single Responsibility Principle for work items

SRP applies to backlog decomposition as much as code: every implementation Issue should have one reason to change and one primary code owner. The owner may be a use case, adapter, module, migration, generated artifact family, schema, screen, or workflow, depending on the repo's architecture.

Skill use: when a Project creates multiple implementation Issues in the same repo, the Backlog Team writes a Mergeability plan before publishing children. The plan maps child Issues to target repo, primary code owner, expected hot files/modules, conflict risk, and sequencing lane.

Mergeability lanes:

| Lane | Use when | Merge-conflict posture |
|---|---|---|
| **Foundation** | Shared contracts, ports, extension points, generated boundaries, data shapes, or repo layout must exist before others can work safely | Merge first; later Issues consume it |
| **Parallel** | Child Issues touch disjoint primary owners after the foundation is in place | Safe to run concurrently |
| **Serial** | Two Issues must edit the same hot file/module/lockfile/registry/router | Encode `Blocks` / `Blocked by`; do not run concurrently |
| **Integration** | Shared entry point wiring, deletion of old path, or final registry cleanup happens after parallel work lands | Merge after dependent Issues |

Default strategy: prefer vertical value slices when they have disjoint owners; prefer foundation → parallel → integration when a vertical slice would make several PRs edit the same shared entry point; prefer serial dependencies when the collision is unavoidable.

---

## 3. Story format & acceptance criteria

### "As a <role>, I want <capability>, so that <benefit>" — Standard User Story
- **Works for:** consumer/user-facing features with a clear persona and discrete value path.
- **Breaks for:** B2B integrations, internal tooling, context-dependent behavior, experimentation.

### Gherkin / Given-When-Then (BDD)
Format: `Given <precondition>, When <action>, Then <observable outcome>`.
- One story may have 3+ scenarios.
- Skill use: default for complex logic, multi-state flows, regulatory/compliance requirements. Plain checklist for simple AC.

Source: [Business Analysis Experts: Gherkin Scenarios](https://www.businessanalysisexperts.com/gherkin-user-stories-given-when-then-examples/).

### Job Story (Alan Klement, JTBD)
Format: `When <situation>, I want to <motivation>, so I can <outcome>`.
- Focuses on causal chain (situation → motivation → goal). Avoids persona assumptions.
- Skill use: default for B2B / platform / internal-tools / API consumers.

Source: [Alan Klement on JTBD](https://jobstobedone.org/radio/alan-klement-on-jobs-stories/), [Intercom: Job Stories Design](https://www.intercom.com/blog/using-job-stories-design-features-ui-ux/).

### Hypothesis-driven (Barry O'Reilly)
Format: `We believe <X> will achieve <Y>. We'll know we're right when <measurable signal>.`
- Frames work as experiment; success criteria explicit upfront.
- Skill use: feature experiments, A/B tests, unproven markets. Pairs with metrics/instrumentation tasks.

Source: [Barry O'Reilly: Hypothesis-Driven Development](https://barryoreilly.com/explore/blog/how-to-implement-hypothesis-driven-development).

---

## 4. Discovery & strategy

### Marty Cagan — Four Big Risks (SVPG)

| Risk | Question | Primary gate |
|---|---|---|
| **Value** | Will customers buy/use it? | Discovery + analytics |
| **Usability** | Can users figure it out? | UX testing, metrics |
| **Feasibility** | Can engineering build it? | Prototype / writer pre-work |
| **Business Viability** | Does it work for sales / legal / finance / brand? | Stakeholder alignment |

Most teams over-invest in feasibility, under-invest in value and viability. Skill use: every Project must explicitly address all four risks in the description.

Source: [SVPG: Four Big Risks](https://www.svpg.com/four-big-risks/).

### Teresa Torres — Continuous Discovery & Opportunity-Solution Tree
- **Continuous Discovery:** weekly customer touchpoints; product team owns research, doesn't outsource.
- **Opportunity-Solution Tree:** root = desired outcome → opportunities (customer needs) → solutions → assumption tests (validate before building).

Skill use: when a Project targets a desired outcome, sketch the OST in the Project description so the work is visibly grounded in customer needs, not feature lists.

Source: [Product Talk: OST](https://www.producttalk.org/opportunity-solution-trees/).

### Jeff Patton — User Story Mapping
- **Spine:** left-to-right user activities/goals (the narrative flow).
- **Walking skeleton:** minimum stories that complete the entire spine end-to-end (MVP).
- **Vertical slices:** rows = releases; top rows = must-haves for the next sprint.

Skill use: for any multi-step user journey, sketch the spine in the Project; Issue decomposition follows the vertical-slice principle so each release is end-to-end shippable.

Source: [Jeff Patton Associates](https://jpattonassociates.com/the-new-backlog/).

### Roman Pichler — GO Product Roadmap
Goal-oriented, not feature-driven. Each entry = Date + Name + Goal (outcome) + Features + Metrics.

Skill use: when user asks for a roadmap (vs. a backlog), produce GO-style entries linked to Project IDs, with measurable goals at each tier.

Source: [Roman Pichler: GO Product Roadmap](https://www.romanpichler.com/blog/goal-oriented-agile-product-roadmap/).

---

## 5. Prioritization frameworks

| Framework | Source | Mechanism | Best for | Limitation |
|---|---|---|---|---|
| **RICE** | Sean McBride / Intercom | Reach × Impact × Confidence ÷ Effort | Single team, data-rich | Estimates can hide bias |
| **WSJF** | SAFe | Cost of Delay ÷ Job Size | Portfolio scale (20+ items) | Overkill for single team |
| **MoSCoW** | DSDM | Must / Should / Could / Won't | Deadline-locked scope, stakeholder negotiation | Binary; loses nuance |
| **Kano** | Noriaki Kano | Functional/dysfunctional survey → Must-be / Performance / Delighter | Feature portfolio research | Requires user research |
| **North Star + OKRs** | Multiple | NSM (constant) anchors quarterly OKRs | Cross-org alignment | Risk of metric gaming |

Skill default: RICE for a single team, WSJF if the project follows SAFe, MoSCoW under deadline, Kano if doing satisfaction research. Always name the framework you used.

Sources: [RICE (Intercom)](https://www.intercom.com/blog/rice-simple-prioritization-for-product-managers/), [WSJF (SAFe)](https://framework.scaledagile.com/wsjf), [MoSCoW (DSDM)](https://www.agilebusiness.org/dsdm-project-framework/moscow-prioritisation.html), [Kano (Product School)](https://productschool.com/blog/product-fundamentals/kano-model).

---

## 6. Self-contained / handoff-ready issues

Checklist an issue must pass before it leaves the Backlog Team:

- [ ] Acceptance criteria in Gherkin or unambiguous plain language
- [ ] Design mockups linked (UI work) or technical spec (APIs)
- [ ] Dependencies listed (Linear `Blocks` / `Blocked by` relations or `parentId` set)
- [ ] DoR met: estimated on the complexity ladder, team would agree on scope
- [ ] Definition of Done section written in the issue body (concrete, testable)
- [ ] Clean Architecture Shape filled in for behavior-changing issues, or `N/A — <reason>` for non-behavioral work
- [ ] Mergeability / change ownership filled in for implementation issues
- [ ] Sibling implementation Issues do not intentionally edit the same primary hot file/module in parallel
- [ ] Edge cases documented (what *not* to do; error states)
- [ ] Success metric / test signal defined
- [ ] No external knowledge required to implement (links to relevant ADRs / existing issues)

**Three Amigos** practice (Agile Alliance): Product + Developer + QA align on an issue in refinement. The Backlog Team simulates this internally — the PM voice, CTO voice, and Data voice each test the issue before it's marked ready.

Source: [Agile Alliance: Three Amigos](https://agilealliance.org/glossary/three-amigos/), [Atlassian: Definition of Ready](https://www.atlassian.com/agile/project-management/definition-of-ready).

---

## 7. Defensible stances on common disagreements

| Tension | Position A | Position B | Skill stance |
|---|---|---|---|
| **INVEST vs. Job Stories** | User stories promote independence + testability | Job stories capture causality + context | Use INVEST for consumer features; Job Stories for B2B / platform / internal tools. Both valid. |
| **Story Points vs. No-Estimates** | Points enable forecasting | Points create false precision | The org has settled this: Linear `estimate` is required and represents complexity of the work (novel reasoning, AC ambiguity, architectural surface), not effort hours. Use the complexity ladder defined in [`context/linear-standards.md` § *Estimating issues*](https://github.com/YourGithubOrg/agent-config/blob/main/context/linear-standards.md#estimating-issues); the Backlog Team sets complexity only. |
| **Gherkin vs. Plain AC** | Gherkin is testable + machine-parseable | Plain language is faster + team-friendly | Gherkin for complex logic; plain checklist for simple cases. Hybrid is fine. |
| **Investigative tickets** | Track unknowns as their own research issue | Resolve unknowns before the issue exists | The org has settled this: no investigative / finding-only tickets and no `spike` label. Feasibility investigation is the writer's pre-work; a testable hypothesis becomes an implementation issue with a metric (`experiment`); a question needing a human decision goes to the Project's Human Handoff issue. |

---

## 8. Non-software artifacts in the same backlog

Standard hierarchy works for non-code work. Keep each artifact type as its own Project (don't bury under software Projects):

- **Design** — Issue decomposition: wireframes → mocks → interactive prototype → handoff. AC: Figma file linked, design tokens defined, edge states present.
- **Marketing** — themes (quarters) → Projects (campaigns) → Issues (assets / launch phases). Workflow: ideation → brief → approval → launch → analyze.
- **Content** — blog / docs / video / scripts. Use `As a [reader], I want [topic], so that [outcome]`. INVEST applies.
- **Evidence / test runs** — frame as hypothesis Issues: `We believe <research> will validate <assumption>; we'll know when <data signal>`.

Detail in `artifact-types.md`.

Sources: [Planyway: Templates for non-software work](https://planyway.com/jira/templates/jira-for-marketing), [Ricksoft: Non-software backlog management](https://www.ricksoft-inc.com/post/how-to-manage-your-product-backlog-in-jira-in-five-steps/) (concept articles; tooling specifics differ from Linear).
