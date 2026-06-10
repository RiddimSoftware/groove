# Chapter 18 — Product Delivery

Once discovery has produced a solution worth building, the team must build and deliver consistently, quickly, and reliably.

## Principle 1: Small, Frequent, Uncoupled Releases

The defining characteristic of the product model's delivery:

- **At least every two weeks** — the minimum to take care of customers and the business
- **Ideally continuous deployment** (CI/CD) — many releases per day
- **Uncoupled** — a team can release without coordinating with other teams

> "If your current people can't do that, you will need to bring in either experienced engineering leaders or engineers or a true product delivery coach to show them how."

### Why Small Releases Are Safer (Not Riskier)

Counter-intuitive to many: data overwhelmingly shows that the more changes you are delivering, **the better it is for you — and especially your customers — to release more frequently rather than less frequently**.

It is much easier to ensure a small number of changes are working properly than to group a large number of changes and release all at once (the industry term: "big-bang release").

## Principle 2: Instrumentation

Every released capability must be **instrumented** so you know:
- That the product is operating properly
- How customers are actually using the product

Pilot's analogy: a pilot depends on instrumentation to show she's on course and the plane is safe. Product teams depend on instrumentation for the same reasons.

## Principle 3: Monitoring

Continuous **monitoring** detects problems hopefully before customers do.

## Principle 4: Deployment Infrastructure

The capability to:
- Continuously deploy small releases
- Use **feature flags** ("release dark") to push capability into production without exposing it
- Run **A/B tests** to prove value before broad deployment
- Roll back when needed

This is a real engineering investment — but the payback is enormous. *Accelerate: The Science of Lean Software and DevOps* is the canonical reference.

## Related

- [Product Model Concepts](../product-model-concepts.md#concept-4-product-delivery)
- [Chapter 7 — Changing How You Build](ch07-changing-how-you-build.md)
- [Chapter 17 — Product Discovery](ch17-product-discovery.md)
