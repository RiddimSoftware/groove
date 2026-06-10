# Inspired Doctrine

The canonical distillation of Marty Cagan's *Inspired: How to Create Products Customers Love* (SVPG Press, 2008). Use this as the source of truth for how Riddim Software thinks about product management, product discovery, and what makes a product worth shipping.

## Core Premise

**It does not matter how good your engineering team is if they are not given something worthwhile to build.** Engineering excellence is necessary but not sufficient. The work of discovering a product that is **valuable, usable, and feasible** is at least as important as the work of building it — and it is a distinct discipline.

Every release of every product has two stages:

1. **Discovery** — *build the right product.* A creative process, more art than science, that proves there is a real user need and that we can craft a solution that is valuable, usable, and feasible.
2. **Execution** — *build the product right.* A disciplined process of turning a validated spec into shipped software.

The single most common organizational failure is to collapse these two stages and use the full engineering team to build a very, very expensive prototype.

## The Three V/U/F Tests

A product idea must pass three tests before engineering commits to building it:

- **Valuable.** Will users buy / adopt / love it? Validated with target users.
- **Usable.** Can users figure out how to use it? Validated with target users.
- **Feasible.** Can engineering build it in time, with the resources available, given our constraints? Validated with engineering.

If any one fails, the idea is not ready to build.

## The Three-Part Frame: People, Process, Product

### People — who is on the team

- Product Manager is the single, accountable owner of *what* gets built. Two jobs: (1) assess product opportunities, (2) define the product to be built. Not the same job as project manager, product marketer, or product owner-as-scribe.
- Interaction designer owns the deep understanding of each persona and designs tasks/navigation/flow that are both usable and valuable.
- Engineering builds external-facing product (distinct from IT, which builds internal apps).
- Project manager owns scheduling and tracking; required on any non-trivial project.
- Product marketing owns telling the world; separate skill set from product management.
- Site operations runs the production service; first-class role for Internet services.

**Role ratios (rules of thumb).** ~1 PM per 5–10 engineers · 1 interaction designer per ~2 PMs · 1 visual designer per ~4 interaction designers · dedicated PjM for any project >5 engineers and one per release train.

### Process — how the team works

- **Opportunity Assessment** replaces the heavyweight MRD. Ten short questions, focused on the *problem* not the *solution*. (See the discovery playbook.)
- **Product Discovery** is a continuous, parallel activity that runs alongside execution: while release N is being built, release N+1 is being discovered.
- **High-fidelity prototypes** — not paper PRDs — are the spec. They are tested with target users before engineering commits.
- **Charter user programs** put real customers in continuous loop with the product team.
- **Product principles** make the team's tradeoff hierarchy explicit and stable, ahead of feature debates.
- **Personas** anchor the team to specific users with specific needs, not "everyone."
- **Measure to improve.** Real product improvement comes from analyzing actual use and driving key metrics, not from adding features customers request.

### Product — what good products do

Great products are not the sum of their features. They:

- Solve a real, articulable problem for a specific persona.
- Are differentiated in a way you can explain in 2 minutes (to an executive), 1 minute (to a smart customer), and 30 seconds (to an industry analyst).
- Win on emotion as much as function. (Apple's lesson: hardware serves software, software serves user experience, user experience serves emotion.)
- Are designed for the **emotional adoption curve** of their audience: consumer products especially need to address fear, greed, and lust as motivators, and acknowledge that most users are not technology enthusiasts.
- Favor **usability over aesthetics** when forced to choose, but ideally deliver both.
- Are tuned to their *product type*: consumer Internet, enterprise, and platform products each have distinct keys to success.

## The Top-10 Best Practices

From Cagan's own summary (Chapter 40), preserved verbatim in spirit:

1. **The role of product management.** Don't substitute project management or product marketing for true product management.
2. **The role of user experience.** Collaborate closely: PM + interaction designer + engineer.
3. **Opportunity assessments.** Lightweight 10-question replacement for the MRD.
4. **Charter user program.** Talk to real users continuously, not just at the beginning.
5. **Product principles.** Make priorities and tradeoffs explicit.
6. **Personas.** Focus your release on specific users, not "everyone."
7. **Focus on discovery.** Don't build until you have evidence the product is V/U/F.
8. **Use of prototypes.** High-fidelity prototypes force depth of thought, enable user testing, and describe the product to the team better than paper.
9. **Test prototypes with target users.** The single most important PM skill.
10. **Measure to improve.** Drive metrics from analyzing real use, not feature requests.

## The Worry List

The strong product manager continuously asks (Chapter 41):

1. Is my product compelling to our target customer?
2. Have we made this product as easy to use as humanly possible?
3. Will this product succeed against the competition that will exist when we ship — not today's?
4. Do I know customers who will really buy what we're really going to build (not what I wish we were building)?
5. Is my product truly differentiated? Can I explain it in 2 min / 1 min / 30 sec?
6. Will the product actually work?
7. Is it a *whole product* — consistent with how we plan to sell it?
8. Are the product's strengths aligned with what customers care about, and positioned aggressively?
9. Is it worth money? How much? Why? Can customers get it cheaper elsewhere?
10. Do I understand what the rest of the team thinks is good about the product — and is it consistent with my view?

## Anti-Doctrine: What Inspired Rejects

- **MRDs and paper PRDs as the primary spec.** They take too long, aren't read, and answer the wrong questions. Use opportunity assessments + high-fidelity prototypes.
- **Discovery on a fixed schedule.** Discovery is creative and cannot be slotted into "four weeks before engineering is free."
- **P1/P2/P3 feature lists.** The right shape is a *minimal product* — the smallest scope that meets the objectives, validated as a whole. Cutting a leg off a tested minimal product breaks it.
- **Specials.** Custom one-off features built for a single customer fragment the product and starve the roadmap.
- **The new old thing.** Chasing whichever shiny technology or framework is in vogue without a real user problem behind it.
- **"Cleaning it up later" in product, just as in code.** Discovery debt — shipping V0 without validation — compounds the same way technical debt does.
- **Product manager as scribe.** A PM whose work is writing requirements that engineering then "owns" has abdicated the job.

## How This Applies to Riddim Software

Inspired predates lean startup, modern continuous-discovery practice, and the AI-native product era — but its core claims age well. As Riddim Software builds AI-augmented products and adopts AI in its own production process, this doctrine remains the spine:

- **Linear issues / Projects are the modern "spec."** They must describe behavior (what and why), not implementation (how). Prototype-as-spec applies: when feasible, prefer a screen recording, mockup, or clickable prototype over prose.
- **Opportunity assessment lives in the Linear Project description.** Every Project should be able to answer Cagan's ten questions before any child issue moves to Todo.
- **Discovery happens before a Project becomes implementation-ready.** The `backlog-team` skill is our discovery function; the `developer` skill is our execution function. Do not let execution leak into discovery's territory or vice versa.
- **Charter users matter even more for AI products** — observed behavior beats stated preferences, especially when users are still learning what AI can do for them.
- **The valuable/usable/feasible triangle, for an AI product, includes a fourth implicit corner: trustworthy.** Capture that in product principles, not as an afterthought.
