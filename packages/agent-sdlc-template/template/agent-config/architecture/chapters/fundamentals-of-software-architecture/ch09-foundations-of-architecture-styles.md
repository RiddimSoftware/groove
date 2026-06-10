# Chapter 9: Foundations

## Core Principles
- An **architecture style** is shorthand for an agreed topology plus a profile of which architecture characteristics it favors and which it sacrifices. Naming the style is half the design decision.
- **Avoid the Big Ball of Mud** at all costs. Lack of structure is itself a design choice — and it always degrades change, testability, scalability, and performance.
- Architecture styles split into **monolithic** (single deployment unit) and **distributed** (multiple deployment units connected by remote protocols). Distributed buys performance, scale, and availability at the cost of complexity, latency, consistency, and operational coordination.
- The **Eight Fallacies of Distributed Computing** are assumptions every distributed system silently makes and pays for: (1) The Network Is Reliable, (2) Latency Is Zero, (3) Bandwidth Is Infinite, (4) The Network Is Secure, (5) The Topology Never Changes, (6) There Is Only One Administrator, (7) Transport Cost Is Zero, (8) The Network Is Homogeneous.
- Distributed architectures inherit a second set of cross-cutting problems beyond the fallacies: **distributed logging**, **distributed transactions** (eventual consistency, sagas, BASE), **distributed monitoring**, and **contract maintenance/versioning**. Every one of these needs an explicit owner.

## Enforceable Rules
- Any PR introducing a new remote call must document the protocol, the timeout, the retry policy, and the failure mode. Calls without these are presumed to assume Fallacies #1 and #2.
- Inter-service responses must carry only the fields the caller needs. Returning entire entities across the wire (stamp coupling) is a Bandwidth Is Infinite violation.
- Distributed transactions across deployment units are not allowed by default. If atomicity across services is required, the PR must justify it and document the saga / compensating transaction.
- Every endpoint on the wire must be authenticated and authorized. There is no internal-only trust boundary.

## Review Questions
- Which of the eight fallacies does this change implicitly assume away, and is that assumption justified?
- If the network drops, lags, or changes topology between the caller and the callee, what is the user-visible behavior?
- Are we paying distributed-system tax (deploys, logs, contracts, transactions) for something that could be a single deployment unit?
- Who owns the contract between these two deployment units, and how is it versioned?

## Examples
### Violation
- A service makes a synchronous REST call to another service with no timeout, returns the entire 45-field customer object to read one field, and silently 500s when the callee is slow. Three fallacies in one call.
### Good Implementation
- A service calls a remote dependency with an explicit timeout and circuit breaker, requests only the fields it needs (or uses a value-driven contract), logs the correlation ID end-to-end, and degrades to a documented fallback when the callee is unavailable.

## Implications
### For Agents
- Before generating a remote call, agents must surface the failure mode and timeout explicitly in the code. "Assume the network is reliable" is never a default. When proposing a split into distributed services, agents must justify why a monolithic option doesn't suffice and call out which fallacies the design will need to defend against.
### For Tickets/PRs/CI
- Tickets that introduce or modify cross-process boundaries must list the eight-fallacy impact and the consistency model (ACID vs eventual). PRs adding new services must include logging, tracing, and contract test artifacts. CI should fail PRs that introduce unbounded retries, missing timeouts, or unversioned cross-service contracts.
