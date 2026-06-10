# Product Review Checklist

Use this checklist when reviewing a Linear Project before it leaves Backlog, when reviewing a release before it ships, or when auditing an existing product line against *Inspired*. Anything left unchecked is a hole the team should be able to articulate and accept.

## Project Readiness (Pre-Implementation)

The Project answers Cagan's ten opportunity-assessment questions.

- [ ] Exactly what problem will this solve? (clear, crisp value proposition — not a feature list)
- [ ] For whom do we solve it? (named target market and primary persona)
- [ ] How big is the opportunity? (market size, even if conservative bottoms-up)
- [ ] How will we measure success? (specific metrics or revenue model — not "users will love it")
- [ ] What alternatives are out there now? (competitive landscape, including the offline / status-quo alternative)
- [ ] Why are we best suited to pursue this? (our differentiator)
- [ ] Why now? (market window — what changed)
- [ ] How will we get this to market? (go-to-market strategy, including channel)
- [ ] What factors are critical to success? (solution requirements, dependencies, constraints)
- [ ] Given the above, what's the recommendation? (go / no-go, with reasoning)

## Persona & Principles

- [ ] The Project names its **primary persona**, not just an audience.
- [ ] The Project names the personas it is deliberately **not** for.
- [ ] The personas trace to real-user observation, not speculation.
- [ ] The product principles that frame this Project's tradeoffs are stated or linked.
- [ ] Priorities are ordered (1, 2, 3 …) — not grouped into "critical / very important".

## Discovery Evidence

- [ ] A high-fidelity prototype (clickable mock, TestFlight build, staging URL, or screen recording) exists and is referenced from the Project.
- [ ] The prototype has been tested with ≥6 target-market users who got through the primary tasks.
- [ ] Test outcomes are recorded per-task (clean / struggled / abandoned).
- [ ] A willingness-to-pay or NPS-style value-gauge question was asked and answered.
- [ ] An architect / lead engineer has reviewed the prototype for feasibility and produced commit-ready estimates.
- [ ] Cross-functional review covered business viability — sales, marketing, support, legal, finance — and surfaced no killers.

## Charter Users / Early-Access Cohort

- [ ] At least one named target-market customer / early-access user is engaged with this Project.
- [ ] The charter "deal" is explicit: what the customer gets, what we get.
- [ ] Charter users are not paying upfront in a way that turns the relationship into a custom build.
- [ ] We are on track to have ≥6 referenceable customers (or applications, for platform work) at launch.

## Scope: Minimal Product

- [ ] The Project describes a **minimal whole** — the smallest scope that meets the objectives.
- [ ] There are no P1/P2/P3 annotations on features. Cutting any feature breaks the whole.
- [ ] Engineering estimates are based on the prototype, not on a paper list.
- [ ] The slip-vs-cut policy is clear: when estimates miss, the date slips. The minimal scope already had the cuts applied.

## Spec Discipline

- [ ] The spec describes **behavior**, not implementation.
- [ ] The spec is **the prototype**, not a paper PRD. Written narrative is supplementary.
- [ ] Edge cases, error states, and exception flows are addressed in the prototype, not deferred to engineering interpretation.
- [ ] Release criteria are spelled out. "When are we done?" has a written answer.

## Product Quality (Pre-Launch)

- [ ] **Differentiation test.** A team member can explain how this product is different from alternatives in 2 minutes (to a company executive), 1 minute (to a smart customer), and 30 seconds (to an industry analyst).
- [ ] **Whole product.** The end-to-end experience (onboarding → core use → support → upgrade) is consistent and consistent with how customers buy.
- [ ] **Emotion check** (consumer-facing). The product addresses the user's emotional motivators (fear, greed, lust, status, identity), not just a functional need.
- [ ] **Usability over aesthetics**, but visual design has been treated as first-class — it creates the emotion that inspires use.
- [ ] **Product type fit.** Specific keys to success applied for consumer / enterprise / platform — buyer-vs-user separation, channel design, developer experience, viral mechanics, etc. — as relevant.
- [ ] **No specials.** No one-off customer-specific features in scope; any customer-specific value is delivered via configuration or SI extension.
- [ ] **No new-old-thing chasing.** Technology choices serve a real user problem; "framework du jour" is rejected.

## Launch & Post-Launch

- [ ] **Gentle deployment plan.** Staged rollout to a small cohort or region before general release; not big-bang.
- [ ] **Rapid response** capacity for the first days/week post-launch. The team is on standby with a clear cadence (daily standup, on-call rotation, on-site for enterprise).
- [ ] **Instrumentation** in place to measure the success metrics declared in opportunity assessment.
- [ ] **Reference customers** are live and happy before public launch.

## Continuous Discovery

- [ ] A release N+1 discovery is already underway alongside release N's execution. New exec asks have a natural home that isn't the in-flight release.
- [ ] Charter users remain in continuous dialog — they did not become "customers" only at launch.
- [ ] Improvement plans are driven by analyzing real use, not by adding customer-requested features.

## Worry-List Sanity Check

Before signing off, the product manager can answer "yes" to each of Cagan's worry-list questions:

- [ ] Compelling to our target customer?
- [ ] As easy to use as humanly possible?
- [ ] Going to succeed against the competition that exists *when we ship* (not today)?
- [ ] Do we know customers who will really buy what we're really going to build?
- [ ] Truly differentiated, explainable in 2 min / 1 min / 30 sec?
- [ ] Will it actually work?
- [ ] Whole product, consistent with how we sell it?
- [ ] Strengths aligned with what customers care about, and positioned aggressively?
- [ ] Worth money, with a defensible price relative to alternatives?
- [ ] Aligned view with the rest of the team on what's good about it?

## Red-Flag Quick-Checks

Any of these is enough to send the Project back to discovery:

- The team can't recruit charter users. (Problem isn't important enough.)
- "We don't have time to talk to customers."
- Spec is being written *during* engineering.
- Engineering is "almost done with the prototype" and it's now the product.
- One customer's check determines the release scope.
- Differentiation cannot be articulated in plain English.
- The minimal product was never identified — there's a P1/P2/P3 list instead.
- Validation was skipped because "we know our users."
- The release is big-bang because "we've already slipped twice."

## How to Use This Checklist

- **Before transitioning a Project from Backlog to Todo.** All Project-readiness, persona, and discovery-evidence items checked.
- **At spec-freeze / pre-implementation review.** Scope, spec discipline, and product-quality items checked.
- **At release-readiness review.** Launch / post-launch items checked, reference customers live, instrumentation green.
- **At post-launch retrospective.** Continuous-discovery and worry-list items reviewed.
- **As a quarterly audit instrument** for existing product lines.

The checklist is **not a gate** — it is a tool for surfacing risk. Unchecked items should produce conversation, not denial. The cost of an honest "we skipped this and here's why" is small; the cost of pretending the checklist is green when it isn't is the entire product.
