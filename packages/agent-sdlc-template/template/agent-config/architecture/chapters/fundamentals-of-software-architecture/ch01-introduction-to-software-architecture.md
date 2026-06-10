# Chapter 1: Introduction

## Core Principles
- Software architecture is the combination of four things: **structure** (the style — layered, microservices, etc.), **Architecture Characteristics** (the "-ilities" the system must support), **architecture decisions** (rules), and **design principles** (guidelines). Naming only the style does not describe the architecture.
- Architecture decisions are *rules* (hard constraints); design principles are *guidelines* (preferred approaches). Decisions form the constraints of the system; principles inform the choices left to developers.
- Architects guide rather than dictate technology: prefer a decision like "use a reactive frontend framework" over "use React." Specify particulars only when a characteristic (scalability, performance, availability) demands it.
- All architectures are a product of their context. Lessons that were correct in a 2002 data center can be wrong in a 2026 cloud, and vice versa.
- **First Law of Software Architecture: everything is a trade-off.** If you think you've found something that isn't a trade-off, you haven't found the trade-off yet.
- **Second Law of Software Architecture: why is more important than how.** Capturing topology without rationale loses the architecture.

## Enforceable Rules
- Every significant architecture decision must be recorded with its rationale and the trade-offs considered, not just the topology that resulted (Architecture Decision Records).
- Variances from a documented architecture decision require explicit justification and approval, not silent override.
- Fitness functions exist for the characteristics the system claims to care about; an unverified characteristic is not really supported.

## Review Questions
- Which Architecture Characteristics ("-ilities") does this change implicitly target, and are they the ones the system actually requires?
- Is this a *decision* (rule) or a *principle* (guideline)? Is it being applied as the right kind?
- What trade-off was accepted here, and why is the rejected option worse?
- Is the "why" captured somewhere durable (ADR, ticket, design doc) — not just the "how"?

## Examples
### Violation
- A PR introduces a new service framework with no recorded rationale; the description says only "use Foo for new services." A later reviewer cannot tell which characteristic this serves, what alternatives were rejected, or whether it is a hard rule or a default.
### Good Implementation
- A PR adds an ADR: "Use asynchronous messaging between services by default (principle). REST is allowed when low-latency request/response is required (variance)." The decision names the characteristic it protects (decoupling) and the cost it accepts (operational complexity of brokers).

## Implications
### For Agents
- When generating code or reviewing a PR, do not stop at "does the structure match the style." Identify which Architecture Characteristics the change touches and whether the trade-off is recorded. Treat "why is more important than how" as a review rule: if a change has no captured rationale, ask for one.
### For Tickets/PRs/CI
- Tickets that introduce or change a structural pattern should reference or create an ADR. PR descriptions should name the characteristic protected and the trade-off accepted. CI should host fitness functions that verify the decisions named in ADRs (see Chapter 6).
