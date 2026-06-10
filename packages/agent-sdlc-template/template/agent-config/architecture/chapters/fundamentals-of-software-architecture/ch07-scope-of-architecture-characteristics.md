# Chapter 7: Scope of Architecture Characteristics

## Core Principles
- The traditional axiom — characteristics apply *system-wide* — is obsolete. In a microservices or modular world, characteristics have **scope**, and the scope is the **Architectural Quantum**.
- **Architectural Quantum**: *an independently deployable artifact with high functional cohesion and synchronous connascence.* Three required parts:
  - **Independently deployable** — includes everything needed to run, including its data store. A monolith on a shared database is one quantum; a microservice with its own database is its own quantum.
  - **High functional cohesion** — the contained code is unified in purpose, typically matching a DDD bounded context, not a grab-bag utility.
  - **Synchronous connascence** — components inside a quantum are connected by synchronous calls; that forces them to share operational characteristics (a slow callee bounds the caller).
- Connascence at architecture scope adds two dynamic forms beyond the code-level list: **synchronous** (caller waits — operational characteristics must align) and **asynchronous** (fire-and-forget — characteristics can diverge).
- An async link is a *connascence weakener* across a quantum boundary — it lets two systems differ in scalability, performance, and availability without coupling their fates.
- **Going-Going-Gone** case study (online auction): a single system genuinely needs different characteristics for **bidder feedback** (availability, scalability, performance), the **auctioneer** (availability + reliability + scalability + elasticity + performance + security), and **bidder** (reliability, availability, scalability, elasticity). System-wide characteristic scoping would either over-engineer the bidder side or under-engineer the auctioneer side. Quantum-level scoping reveals that this *should* be a hybrid, distributed architecture.
- The quantum is the **unit of granularity** for design decisions: deployment, data ownership, coupling, communication style, and choice of monolith vs distributed.

## Enforceable Rules
- Architecture Characteristics are scoped to a quantum, not the system. State which quantum each characteristic applies to.
- Any synchronous call across what was meant to be a quantum boundary is suspect — it imports the callee's operational profile into the caller.
- A "service" with no independent data store, or that cannot be deployed without another service, is not its own quantum; treat it as one.
- Async messaging is the default across quanta with divergent characteristics; sync calls require justification.

## Review Questions
- What is the architectural quantum this change lives in? Does it include its own data store and deploy independently, or does it share fate with something else?
- Is this synchronous call inside the same quantum, or has it accidentally bound two quanta together?
- Do the two endpoints of this call need the same operational characteristics? If not, why is the call synchronous?
- If we mapped each component to a quantum, would we see the same characteristics across all of them — or different ones that argue for splitting?

## Examples
### Violation
- A "microservices" architecture has 12 services, all writing to the same shared database. There is one quantum, not 12. Operational characteristics (scaling, availability, performance) bind every service together — the team has the cost of microservices and the constraints of a monolith.
### Good Implementation
- The auction system splits the auctioneer surface (high reliability, security) from the bidder surface (high elasticity, scalability) into separate quanta, each with its own data store. They communicate asynchronously where their operational profiles differ, synchronously only within a quantum.

## Implications
### For Agents
- When generating new services or boundaries, do not call something a "service" or a "microservice" unless it is independently deployable with its own data. When reviewing, identify the quantum count of the change — if a PR adds a "new service" that still writes to the shared DB, flag it as a boundary that doesn't really exist. Use async communication by default across quanta with different characteristics.
### For Tickets/PRs/CI
- Architectural tickets name the quantum they affect. PRs that cross quantum boundaries need a check: sync call (and why) or async (and through what). CI fitness functions can verify that intra-quantum and inter-quantum coupling rules are respected (e.g. "this module may not synchronously call across the quantum boundary").
