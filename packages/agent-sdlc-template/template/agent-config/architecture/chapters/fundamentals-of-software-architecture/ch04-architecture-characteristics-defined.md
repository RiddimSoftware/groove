# Chapter 4: Architecture Characteristics Defined

## Core Principles
- An **Architecture Characteristic** meets three criteria simultaneously: **(1)** specifies a *nondomain* design consideration, **(2)** *influences some structural aspect of the design*, and **(3)** is *critical or important to application success*. If a quality fails any one of the three, it is not an Architecture Characteristic — it's just a wish.
- Prefer the term **Architecture Characteristic** over "nonfunctional requirement" or "quality attribute." "Nonfunctional" linguistically discounts work that is essential; "quality attribute" implies after-the-fact assessment instead of up-front design.
- Characteristics are grouped (loosely, not canonically): **Operational** (availability, continuity, performance, recoverability, reliability, robustness, scalability), **Structural** (configurability, extensibility, installability, leverageability, localization, maintainability, portability, supportability, upgradeability), and **Cross-Cutting** (accessibility, archivability, authentication, authorization, legal, privacy, security, supportability, usability).
- **Explicit** characteristics appear in requirements; **Implicit** ones (availability, reliability, security, modularity) almost never do but must still be uncovered.
- Each characteristic supported adds design effort and almost always trades against another — improving security usually costs performance. **Never shoot for the best architecture, but rather the least-worst architecture.** Iteration beats one-shot perfection.

## Enforceable Rules
- Every Architecture Characteristic claimed for the system must pass the three-criteria test before it gets structural support; vague aspirations don't earn architecture cost.
- "Generic" architectures that try to support every characteristic are an anti-pattern — fewer characteristics, deliberately chosen, are better than many.
- Whenever a characteristic is added, name the characteristic it most likely *trades against* and confirm the trade is acceptable.

## Review Questions
- For each "-ility" claimed by this design, does it (a) sit outside the domain, (b) actually shape the structure, and (c) genuinely matter to success — or has someone added it for completeness?
- Which characteristic just got worse to make this one better? Was that trade accepted explicitly?
- Are the implicit characteristics (availability, reliability, security) acknowledged even though no ticket lists them?
- Is the team chasing the *best* architecture or the *least-worst*?

## Examples
### Violation
- A design doc lists fifteen "quality attributes" — scalability, security, performance, configurability, extensibility, portability, learnability, archivability, etc. — with no priority and no trade-offs named. The system will under-deliver on all of them because each one carries cost and they conflict.
### Good Implementation
- The team picks three top-priority characteristics (e.g. availability, scalability, security), names the implicit ones it assumes (reliability, maintainability), and explicitly accepts that performance and configurability will be merely "acceptable" rather than optimized.

## Implications
### For Agents
- When generating an implementation, do not silently add structural cost for a characteristic that wasn't named (e.g. don't introduce a plugin framework "for extensibility" when extensibility isn't a priority). When reviewing, push back on additions that protect a characteristic the system has not claimed; that's gold-plating, not architecture.
### For Tickets/PRs/CI
- Tickets that change structure should state which Architecture Characteristic the change serves and which it costs. Each repo should keep a short list of its top characteristics so PR reviewers can check alignment; characteristics not on that list are assumed to be "good enough" rather than optimized.
