# Chapter 22: Making Teams Effective

## Core Principles
- An architect's job is to set **boundaries** — the box developers work inside. Too tight (control-freak) frustrates and de-skills the team; too loose (armchair) forces developers to do architecture work they aren't equipped for. The effective architect calibrates.
- How much control to exert depends on five factors: **team familiarity, team size, overall experience, project complexity, project duration**. Re-evaluate as the project evolves — the right amount of control at month one is rarely the right amount at month six.
- Watch for the three team warning signs: **process loss** (Brooks' Law — more people means more merge conflicts and less throughput than the headcount predicts), **pluralistic ignorance** (everyone privately disagrees but publicly conforms because they think they're missing something), **diffusion of responsibility** (no one acts because everyone assumes someone else will).
- **Checklists work.** Use them for error-prone work without strict procedural order — Atul Gawande's *Checklist Manifesto* showed it for surgery; the same applies to software. Keep them small, automate anything that can be automated, and don't make everything a checklist (diminishing returns).
- Three high-leverage checklists: **Developer Code Completion** (definition of done, things outside automated checks), **Unit and Functional Testing** (edge cases the team has historically missed), **Software Release** (every cause of a past failed deploy gets a line item).
- Provide guidance through **design principles** — the box developers can decide inside. For example, third-party libraries categorized as special-purpose (developer decides), general-purpose (developer proposes, architect approves), framework (architect decides).

## Enforceable Rules
- Every repository owning a non-trivial deliverable SHOULD have a checked-in code-completion checklist, a release checklist, and a testing checklist. Items that can be automated MUST be — checklists are for what tooling cannot reliably enforce.
- New entries on the release checklist MUST be added every time a deploy fails for a reason the checklist did not catch; checklists are living documents.
- Team-size / merge-conflict frequency should be visible — sustained, frequent merge conflicts on a small file set are a process-loss signal and warrant a parallelism or modularity intervention, not more headcount.
- Decisions about framework-level libraries (persistence, IoC, web framework) require architect/ADR approval; general-purpose libraries require justification + overlap analysis; special-purpose libraries can be developer-discretion.

## Review Questions
- Are the checklists in this repo still useful, or have they grown into things developers ignore? If the latter, what should be automated or removed?
- Has the team grown past the size where the current module boundaries support parallel work without constant merge conflict?
- In the last design discussion, did any quiet team member look unconvinced? Did anyone follow up?
- Is this PR adding a framework-level dependency that should have gone through an ADR?

## Examples
### Violation
A release checklist with 47 items, half procedural ("submit form then verify the table"), half things the CI already checks. Developers tick all 47 boxes in 10 seconds without reading them; the next failed deploy is caused by an item that was on the list.
### Good Implementation
A 6-item release checklist covering only error-prone, non-automated steps (third-party library version bumps, config server updates, DB migration scripts). Every prior failed-deploy root cause that wasn't already on the list got added in a post-mortem. Anything mechanically verifiable was moved into CI.

## Implications
### For Agents
- The org already maintains PR and review checklists. Treat them as living — when a new failure mode surfaces (e.g. a regression CI didn't catch, a missed Linear-status update), propose an addition to the relevant checklist rather than only fixing the immediate instance.
- When operating as a reviewer agent, prefer extending automated checks over growing the human checklist. The chapter is explicit: anything that can be automated should be.
- When implementing as a developer agent, honor the box: special-purpose dependencies are usually fine to add inline; framework-level dependencies require an ADR and reviewer sign-off, not a unilateral install.
### For Tickets/PRs/CI
- Linear issue templates carry the equivalent of a developer-code-completion checklist (acceptance criteria + DoR/DoD).
- PR templates should ask: tests added, ADR linked if needed, no new framework-level dependency without approval. CI should enforce what it can; the checklist covers the rest.
- Recurring "team health" cadence (review of process-loss signals, pluralistic-ignorance signals, diffusion-of-responsibility signals) is worth scheduling — it's the human-process counterpart of fitness functions.
