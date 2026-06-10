# Chapter 10: Layered Architecture Style

## Core Principles
- The layered (n-tiered) style organizes components into **horizontal layers by technical role** — typically presentation, business, persistence, database. It is a **technically partitioned** architecture, so any one domain is smeared across every layer.
- The style is the default fallback for "we just started coding" — it mirrors Conway's law for UI / backend / rules / DBA teams. That makes it familiar and cheap, but also makes it the home of the **architecture by implication** and **accidental architecture** anti-patterns.
- **Layers of Isolation:** closed layers force requests to pass through each layer in order so that changes in one layer cannot leak into another. Opening a layer is a deliberate exception, not a convenience.
- The **Architecture Sinkhole Anti-Pattern** is when requests pass through layers without any layer doing real work. A sinkhole rate over ~20% (the 80/20 rule) signals the wrong style for this domain.
- Because it is a single quantum with monolithic deployment, layered architecture **does not give you scalability, elasticity, or fault tolerance** no matter how many layers you stack.

## When to Use
- Small to medium applications where simplicity, low cost, and developer familiarity dominate.
- Greenfield work where the team is still discovering requirements and doesn't yet know which style will win.
- Domains where most logic lives in one layer (business) and other layers are thin and stable.

## Characteristic Profile
- Strong on: simplicity, overall cost, ease of development (for small systems).
- Weak on: deployability, testability, scalability, elasticity, fault tolerance, performance, agility (degrades fast as the app grows).

## Enforceable Rules
- Closed layers may not be skipped. A presentation component reaching directly into persistence is a layering violation and must be rejected in review.
- Domain logic must live in the business layer, not in controllers or repositories. Sinkhole pass-through methods that just forward calls are a smell.
- Cross-cutting utilities (logging, date helpers, auditing) must live in their own layer with explicit open/closed semantics — not be smuggled into business or persistence.

## Review Questions
- Does this PR cause a request path to skip a layer it shouldn't?
- Is this new method doing real work in this layer, or is it a sinkhole pass-through?
- Has any single domain change required edits in three or more layers? If yes, is this still the right style?

## Examples
### Violation
- A UI controller imports the ORM directly to issue SQL "for performance," bypassing the business and persistence layers. Six months later the schema changes and the UI breaks.
### Good Implementation
- A presentation component calls a business service, which calls a repository in the persistence layer, which talks to the database. Each layer holds responsibilities only relevant to its role; swapping the UI framework changes nothing below it.

## Implications
### For Agents
- Default to layered when the ticket is a small, single-quantum CRUD feature with no scale or elasticity requirement. When generating code, never short-circuit a closed layer for convenience. Flag sinkhole methods during review and suggest either real logic or collapsing layers.
### For Tickets/PRs/CI
- Tickets should specify which layer the change targets; cross-layer tickets are a sign that the domain is being smeared and should be re-scoped. CI fitness functions can enforce package-direction rules (e.g., presentation may not import persistence). PRs that touch all four layers for one trivial feature should trigger a "is this still the right style?" review.
