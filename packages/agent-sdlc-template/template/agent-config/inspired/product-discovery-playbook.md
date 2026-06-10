# Product Discovery Playbook

The end-to-end discovery process distilled from *Inspired*. Discovery is the work that proves an idea is **valuable, usable, and feasible** *before* engineering commits a release to building it. Treat this as the playbook for every Linear Project before it transitions from Backlog to Todo.

## Why Discovery Exists

> "It doesn't matter how good your engineering team is if they are not given something worthwhile to build."

Every software project has two stages: **discovery** ("build the right product") and **execution** ("build the product right"). Most teams skip discovery and use the full engineering team to build "a very, very expensive prototype," with live customers as unwitting test subjects. That is how companies take three or more releases over one to two years before a product makes money — and how startups die.

Discovery's job is to produce evidence — *not opinions* — that a product is valuable, usable, and feasible, with a minimal scope, before engineering commits the build.

## The Discovery Pipeline

```
Opportunity Assessment    →    Charter Users / Personas    →    Prototype    →    Validation    →    Commit
   (problem worth          (real users in continuous       (high-fidelity,    (V/U/F evidence,   (engineering
    solving?)               dialog; persona priorities)     minimal scope)     market sanity)    builds it)
```

Each stage is gated. Don't proceed if the previous stage didn't produce evidence.

## Stage 1: Opportunity Assessment

Replace MRDs with a lightweight assessment that answers ten questions, focused on the **problem**, not the solution:

1. **Exactly what problem will this solve?** (value proposition)
2. **For whom do we solve that problem?** (target market)
3. **How big is the opportunity?** (market size)
4. **How will we measure success?** (metrics / revenue strategy)
5. **What alternatives are out there now?** (competitive landscape)
6. **Why are we best suited to pursue this?** (our differentiator)
7. **Why now?** (market window)
8. **How will we get this product to market?** (go-to-market strategy)
9. **What factors are critical to success?** (solution requirements)
10. **Given the above, what's the recommendation?** (go / no-go)

The opportunity assessment is reviewed with senior leadership before any engineering investment. A clear no-go is a win; it prevents the company from wasting time and money on a poor opportunity.

## Stage 2: Set the Context — Personas, Principles, Charter Users

Before any prototype work, lock in three contextual artifacts that will frame every later decision:

### Personas

- Identify and prioritize the personas this release serves.
- Pick a **primary persona**. Everything in the release should serve them first. The corollary: an explicit list of personas this release is *not* for.
- Personas come from observation and conversation with real users, not committee speculation.

### Product Principles

- A written, prioritized list of beliefs that will frame every tradeoff.
- Not features. Not design principles. Beliefs about what matters for *this* product line ("the community's opinions on movies are more valuable than professional reviewers'") in priority order.
- Use them to short-circuit re-litigation: when a debate starts, point to the principle that resolves it.

### Charter Users

- Recruit 8–10 target-market customers (10–15 for consumer services) at the start of the project.
- Strike an explicit deal: they get early product input, early access, and reduced/free pricing; you get continuous access, on-site visits, fast test-version deployment, and a public reference at launch *if they're happy*.
- Don't take payment upfront from charter users; that turns them into a custom build.
- Aim to end the project with at least 6 happy, live, referenceable customers.
- **If you cannot recruit charter users, your problem isn't important enough to build a business around.** This is your earliest reality check.

## Stage 3: Prototype

The prototype is the spec.

- **High-fidelity.** Realistic enough that target users can engage with it as a real product, not a wireframe.
- **Minimal.** The smallest scope that meets the business objectives with a UX users can figure out and want to use. The minimal product is defined *as a whole*; you can't later cut one more feature and assume it still works.
- **Collaborative.** Product manager, interaction designer, and an architect/lead engineer review every iteration. The engineer's job here is to size options and surface infeasibility *before* commit.
- **Engineering-estimated.** By the time the prototype is "done," engineering has produced detailed estimates of the surviving scope, scope they can commit to.

Reject paper PRDs as the primary spec. They take too long, aren't read, and answer the wrong questions.

## Stage 4: Validation

A prototype is not validated until it has been tested against four risks:

| Risk | Question | Mechanism |
|---|---|---|
| **Usable** | Can target users figure out how to use it? | Prototype testing with target users |
| **Valuable** | Will target users adopt / pay for it? | Same testing + willingness-to-pay / NPS questions |
| **Feasible** | Can engineering build it in the time/budget? | Architect involved through prototype iterations |
| **Business viable** | Does it work for sales, marketing, support, legal, finance? | Cross-functional review (Product Council) |

### Prototype Testing Protocol

1. **Find test subjects.** Charter users; Craigslist; user email lists; trade shows; offices; malls. Screen on the phone. Avoid early adopters (they tolerate things your real market won't). Expect 30% no-show rate; a personal phone call the day before drops it to 5–10%.
2. **Prepare the test.** Define the primary tasks. Use the one-time first-visitor opportunity wisely: ask how they think about the problem *today* before opening the prototype. Plan a post-test conversation including the NPS / willingness-to-pay question.
3. **Set the environment.** A Starbucks table and three chairs is fine. Customer offices are excellent. The PM administers (or takes notes if a researcher administers). Engineers and designers benefit from attending.
4. **Run the test.**
   - Tell the user: this is a prototype (not real), they won't hurt your feelings, you're testing the prototype not them.
   - **Parrot, don't lead.** Reflect actions and questions back; suppress the urge to help.
   - Note three outcomes per task: (1) clean, (2) struggled but completed, (3) frustrated enough to abandon.
   - Watch what users *do*, not what they *say*.
5. **Iterate.** Fix obvious issues after 2–3 users; don't wait for a full round of 6–8.
6. **Done condition.** ~6 consecutive users understand the value, get through the key tasks, and would recommend the product.

### When the Test Says No

Shelving a product idea after testing is **not** a failure — it's saving the cost of building and shipping a loser. Reframe it that way for leadership.

## Stage 5: Commit

Once V/U/F evidence is in hand and the Product Council (or equivalent decision body) signs off:

- Engineering commits to the estimated scope.
- The product manager shifts to **execution mode** for this release.
- Discovery work for the *next* release begins in parallel. The innovation engine never stops.

## Continuous Discovery (Post-Launch)

Discovery doesn't end at launch.

- **Charter users stay engaged.** They are now reference customers and a continuous feedback source.
- **Instrument the product.** Define key metrics tied to product principles. Improvement comes from analyzing real use, not feature requests.
- **Gentle deployment.** Stage rollouts to small cohorts; rapid response on issues.
- **Always have release N+1 in discovery** while release N is in execution. New exec asks land in the discovery release, not the one in the oven.

## Common Discovery Failure Modes

- **No charter users.** "We don't have time to talk to customers" → you're guessing.
- **Discovery on a calendar.** "Engineering is free in four weeks; have a spec ready" → you ship whatever you happened to have at the four-week mark, regardless of evidence.
- **Paper PRD as spec.** Engineering interprets; users never validated.
- **P1/P2/P3 negotiation.** Spec is a wish list; minimal product was never identified.
- **Discovery work done by committee.** Product council reviews replace user evidence.
- **Specials.** Discovery hijacked by a single customer's check; product fragments.
- **Testing too late.** Validation lands after engineering has built it; "course correction" is now a re-build.

## The Discovery Mindset

- **Talking to users, prototyping, and testing don't matter if you don't adjust based on what you learn.** Discipline > activity.
- **Get past being too close to the product to test.** Expect to get it wrong initially. Testing is the fastest path to a product worth shipping.
- **Discovery is creative work.** It cannot be scheduled like construction. Manage expectations with leadership accordingly.

## Riddim-specific Mapping

This playbook adapts cleanly to how Riddim Software runs:

- **Opportunity assessment ⇄ Linear Project description.** The ten questions are the required shape of a Project before it leaves Backlog.
- **Personas + principles ⇄ Project context section.** Identify the primary persona and the principles that frame tradeoffs.
- **Charter users ⇄ early-access cohort.** For each product (Bettrack, etc.), maintain a small standing cohort with the explicit charter deal.
- **Prototype ⇄ clickable mock / TestFlight / staging.** Validate the experience before child issues move to Todo.
- **Validation ⇄ pre-Todo gate.** A Project is implementation-ready only when V/U/F evidence is captured in its description or a linked doc.
- **Execution ⇄ developer skill / dev-bot.** Once committed, the build is a separate discipline; do not let discovery leak into execution-mode tickets.
- **Continuous discovery ⇄ post-release backlog grooming.** ASO reviews, charter-user feedback, and product analytics flow back into the next Project's opportunity assessment.
