# Chapter 27: Succeeding with Waterfall Processes

## Premise
Waterfall is still the most common product development process — usually under a friendlier name — and its core flaw is that real validation arrives too late, after most of the investment is already sunk. If you cannot replace the process, the product manager's job is to front-load discovery: prove the product is valuable, usable, and feasible with a validated prototype before the requirements and design phases close out.

## Key Principles
- Waterfall is rarely called "Waterfall" anymore — look for it under Successive Refinement, SDLC, Phase-Gate, Stage Review, Staged Contracts, or Milestone-based.
- Management likes Waterfall because the phases produce documents that *feel* like progress, even though paper specs cannot be executed or tested the way software can.
- Validation arrives too late: there is typically no working software until near the end, so you don't know if it's useful until most of the cost has been spent.
- Changes after a phase has closed are costly and disruptive, and coding/testing routinely surfaces requirement and architecture defects that force expensive rework.
- The high documentation overhead means even small post-release changes take a long time, which raises the bar on getting the first spec right.
- Waterfall is "an idealistic but naive view" of software development — it assumes the team can anticipate every key issue up front, which is almost never true in product software.
- The Waterfall process is often deeply entrenched; the realistic goal for the PM is to prevent the predictable failures, not to overhaul the process.

## Practices
- Before the expensive design and implementation phases begin, build a prototype and test it on actual target users — the spec that goes to engineering should be one that has already been validated.
- Have engineering resolve major technical feasibility risks *before* architectural design and implementation start.
- When a change is genuinely needed mid-process, weigh the cost of fixing it now against the cost of the follow-on release required to correct it later — often the sooner fix is cheaper.
- Stay close to the product team post-release so course corrections happen as quickly as the process allows.
- Treat the requirements and design phases as the time for true product discovery — identifying something valuable, usable, and feasible — not as a documentation exercise.

## Pitfalls
- Believing the schedule's apparent predictability — it only holds if requirements and technology are fully understood and never change, which is rarely the case.
- Letting impressive specifications and design diagrams substitute for evidence that the product is actually valuable.
- Treating the spec as final at handoff so that mid-stream user feedback gets dismissed as scope creep.
- The standard end-state: ship later than planned because of changes, then run expensive follow-on releases once real users finally see the product.

## Notable Frameworks / Definitions
- **The two-phrase definition of conventional Waterfall.** (1) *Phased development* — software progresses through a well-defined series of phases: written requirements, user experience design, high-level architectural design, low-level detailed design, code, test, and deployment. (2) *Phase review* — each phase ends with a review of its deliverables, sign-off, and an explicit transition to the next phase.
- **The PM's three structural concerns with Waterfall.** Validation occurs too late in the process; changes are costly and disruptive; responding to the market is slow because of the documentation overhead — all of which converge on the same fix: validate the product spec with a prototype on real users before the implementation phase begins.
