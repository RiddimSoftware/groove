# Chapter 19: Design vs. Implementation

## Premise
Requirements and user experience design belong in parallel; implementation and test belong in parallel; but user experience design and implementation must be *sequential*. Once engineering starts building, the cost — technical, psychological, and practical — of changing the user experience rises sharply, and design iteration that should take days starts taking sprints.

## Key Principles
- Requirements (functionality) and user experience design are intertwined and should be done together. The old waterfall hand-off from PM "requirements" to designer "design" is obsolete.
- Implementation and testing should likewise be done together — Agile/XP have made the case for this convincingly.
- User experience design and implementation should *not* run in parallel. This is the exception to the "do things concurrently" rule.
- A designer needs to try out dozens of ideas in a matter of days. Waiting for a two- to four-week sprint to test an idea is an order of magnitude too slow.
- Prototype software and production software are different animals. Prototype software must be truly disposable — changeable in hours. Production constraints are dead weight on a prototype, and the people who enjoy writing each are often different.
- A user experience must be designed holistically. Software can be "stubbed out" between iterations; a coherent UX cannot.
- The objective remains: discover a product definition that is *valuable* and *usable* before committing engineering capacity.

## Practices
- Sequence the work: requirements and design happen together, then implementation and test happen together.
- For Agile teams, use **sprint zero**: the product manager and UX designers stay a step or two ahead of the engineers, enriching the backlog with designed increments.
- Have at least one engineer (architect or lead) review the design work *from the start* to assess feasibility and cost, so the design process is informed by what's actually buildable.
- If designers are about to revolt, have the engineering team work on backend/infrastructure for a release cycle or two — that buys the designers time to build up a backlog of good design.

## Pitfalls
- Starting implementation simultaneously with design. The predictable failure mode: designers stressed, engineers anxious, designers make preliminary guesses to unblock engineering, finished design arrives too late ("we can get to it in the next round," but the next round has its own priorities), nobody is happy with what ships, and in the worst case the designers leave for a company that prioritizes UX.
- Treating beta or end-of-sprint output as "the prototype." It is too late and it is the wrong material.
- Assuming Agile's "embrace change" mantra means all changes are equally welcome once implementation is underway — in practice, some changes are far more welcome than others, and fundamental UX changes are the least welcome.
- Skipping designer/engineer review until the design is "done" — that misses early feasibility/cost feedback that should inform the design itself.

## Notable Frameworks / Definitions
- **The parallel-vs-sequential rule.** Requirements + design: parallel. Implementation + test: parallel. Design then implementation: sequential.
- **Sprint zero.** The mechanism by which UX design stays a step or two ahead of engineering on an Agile team, so engineers always have designed work to pull from the backlog.
- **The exception.** When engineering has significant backend/infrastructure work, that work can proceed in parallel with UX design — interdependencies exist but are manageable, and the arrangement gives designers room to build a design backlog.
