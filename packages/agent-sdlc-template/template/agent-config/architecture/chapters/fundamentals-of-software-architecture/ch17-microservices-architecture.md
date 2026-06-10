# Chapter 17: Microservices Architecture

## Core Principles
- Microservices is the physical embodiment of **Bounded Context** from Domain-Driven Design. Each service owns its domain end-to-end — code, schema, data, deployment. Coupling outside the bounded context is the cardinal sin.
- The driving philosophy is **high decoupling, even at the cost of duplication**. "Share as little as possible." Reuse buys coupling; duplication buys independence. Choose duplication.
- **Granularity is the hardest problem.** Microservices is a *label*, not a description — "micro" doesn't mean "tiny." The right granularity comes from three forces: **Purpose** (one cohesive domain behavior), **Transactions** (services that must participate in a transaction probably belong together), and **Choreography** (services that need constant chatter to function probably belong together).
- **Data Isolation:** each service owns its data. No shared schema, no shared database. Where shared truth is needed, use replication, caching, or one designated source-of-truth service — never a shared table.
- The **API Layer** is thin and optional. It is *not* an orchestration tool. All interesting logic lives inside a bounded context.
- **Operational Reuse** (logging, monitoring, circuit breakers, service discovery) is handled by the **Sidecar Pattern** and **Service Mesh**, not by sharing code between domain services. Domain duplication, operational coupling.
- **Choreography vs Orchestration**: prefer choreography (broker-EDA-style, no central mediator) to preserve decoupling. Use a local orchestrator (a mediator service) only when a workflow is inherently coupled — and accept the front-controller anti-pattern if you pile coordination logic into a "regular" service instead.
- **Transactions and Sagas**: atomic distributed transactions across services are not supported. If a transaction looks necessary, **fix the granularity first** — services that need to share a transaction probably belong in one bounded context. When a saga is truly necessary, implement it as a mediator with compensating transactions, and use it sparingly. "If sagas are the dominant feature of your architecture, mistakes were made."

## When to Use
- Domains that decompose cleanly into independent bounded contexts with different scaling, availability, or release cadence needs.
- Organizations with DevOps maturity, automation, observability, and the team structure to own services end-to-end.
- Evolutionary systems where the rate of change demands incremental, independent deployability.

## Characteristic Profile
- Strong on: scalability, elasticity, deployability, testability, evolvability, fault tolerance (when designed right).
- Weak on: simplicity, performance (network + security overhead), overall cost, ease of transactions.

## Enforceable Rules
- A service must not share a database schema or a relational table with another service. Cross-service data integration is via events, replication, or an explicit API — never a shared table.
- A service must not import code from another service. Duplicate the type; don't share the jar.
- Synchronous communication is **protocol-aware, heterogeneous, interoperable** by default. Cross-service transactions are forbidden unless a saga is explicitly justified.
- "Use synchronous by default, asynchronous when necessary." Async is a tool, not a default.
- Operational concerns (logging, metrics, tracing, circuit breakers) live in a sidecar / service mesh, not duplicated by each domain team in inconsistent ways.

## Review Questions
- Is this service truly a bounded context, or is it an entity dressed up as a service (the entity trap)?
- Does this change reach into another service's database, schema, or shared library?
- Does this workflow require a transaction across services? If yes, is the granularity wrong?
- Is this a true choreography flow, or is it a front controller acting as a mediator-in-disguise?
- Is operational logic being duplicated across services instead of going through the sidecar / mesh?

## Examples
### Violation
- `OrderService` opens a JDBC connection to `InventoryService`'s database to read stock counts. Now any schema change in inventory breaks orders. The bounded context is broken; the saga that papers over it is not the fix.
### Good Implementation
- `OrderService` publishes an `OrderPlaced` event. `InventoryService` consumes it, decrements stock, emits `StockReserved`. If payment fails, a saga mediator emits a compensating `OrderCancelled` event. Each service owns its data; no shared schema; transactional coordination is explicit and minimal.

## Implications
### For Agents
- When proposing microservices, agents must justify the bounded context, the data isolation strategy, the choreography vs orchestration choice, and any saga. When reviewing, flag every cross-service import, every shared table, every "we'll just open a connection to their DB," and every synchronous cross-service call without timeout, circuit breaker, and fallback. Default to choreography. If a saga is being added, ask first: is the granularity wrong?
### For Tickets/PRs/CI
- Tickets must scope to one service. Cross-service tickets must define event contracts, schemas, and consistency expectations. PRs that touch more than one service should be rare and well-justified. CI must enforce per-service deploy independence (each service must be releasable on its own) and contract tests at every boundary.
