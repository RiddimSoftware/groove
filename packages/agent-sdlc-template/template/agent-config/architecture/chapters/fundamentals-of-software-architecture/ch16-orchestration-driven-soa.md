# Chapter 16: Orchestration-Driven Service-Oriented Architecture

## Core Principles
- Orchestration-driven SOA is the late-1990s / early-2000s enterprise architecture that emerged from expensive commercial OSes, expensive databases, and a top-down mandate to **reuse everything**. Understand it as a cautionary tale, not a target.
- Services are organized in a strict taxonomy: **Business Services** (no code, just contracts: `ExecuteTrade`, `PlaceOrder`), **Enterprise Services** (fine-grained shared building blocks: `CreateCustomer`, `CalculateQuote`), **Application Services** (one-off, single-team), **Infrastructure Services** (logging, monitoring, auth), all wired together by an **Orchestration Engine** / ESB.
- All requests flow through the orchestration engine, which also owns transactions and message transformation. The engine is the heart — and the political bottleneck (Conway's law in action).
- The driving philosophy was **enterprise-wide reuse**. The hidden cost was **enterprise-wide coupling**. Extracting `Customer` once for the whole company meant every change to `Customer` rippled to every consumer, forcing coordinated deployments and holistic testing.
- It is the most aggressively **technically partitioned** general-purpose architecture ever attempted. A single domain concept like `CatalogCheckout` was ground to dust across dozens of services and a shared schema. Adding "a new address line" became a multi-team, multi-tier change.

## When to Use
- Almost never as a new build. Reach for service-based, microservices, or microkernel instead.
- Legacy environments that still run on an ESB and need targeted modernization, not greenfield work.

## Characteristic Profile
- Strong on: enterprise-wide reuse (the original goal — even though it was a pyrrhic win).
- Weak on: simplicity, cost, performance, deployability, testability, evolvability, agility. Manages to combine the disadvantages of both monolithic and distributed architectures.

## Enforceable Rules
- Do not propose orchestration-driven SOA for new systems. If a user explicitly asks for it, surface the trade-offs and propose service-based or microservices as alternatives.
- Reuse is not a free win. Any "extract this concept enterprise-wide" proposal must list the coupling cost.
- Central orchestration engines that own transactions across services are an architectural smell. Local mediators are acceptable; an enterprise-wide one is not.

## Review Questions
- Did this PR add a canonical enterprise concept that now multiple unrelated teams depend on? Have we counted the coordinated-deployment cost?
- Is logic accumulating in an orchestration / mediation tier that should live inside a bounded context?
- Are we adding a transaction boundary that spans multiple services controlled by a central engine?

## Examples
### Violation
- A bid to consolidate three divisions' `Customer` data into one enterprise `Customer` service. Auto insurance now sees driver's license fields it doesn't care about; disability insurance now blocks on schema changes from auto. Every release becomes a coordinated deploy.
### Good Implementation
- Each domain owns its own `Customer` representation. Where genuinely shared concepts exist, they are integrated through events, contracts, or local mediators — not a central orchestration engine that owns transactions across all of them.

## Implications
### For Agents
- Treat any proposal that smells like orchestration-driven SOA (central ESB, enterprise-wide canonical entities, transactions managed by a mediator across services) as a structural anti-pattern. When reviewing legacy systems built this way, propose incremental decoupling toward service-based or microservices, not a deeper investment in the engine.
### For Tickets/PRs/CI
- Tickets that propose "shared X service for the whole company" must enumerate every consumer and the coordination cost. PRs to a central orchestration engine should be rare and well-justified. CI cannot save this architecture — its problems are structural, not testing gaps.
