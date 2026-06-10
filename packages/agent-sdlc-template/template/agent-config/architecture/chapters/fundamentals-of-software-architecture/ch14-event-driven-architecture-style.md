# Chapter 14: Event-Driven Architecture Style

## Core Principles
- Event-driven architecture (EDA) is a distributed, **asynchronous** style of decoupled event processors. Use the **event-based** model for action-driven, reactive flows; keep the **request-based** model for deterministic, data-driven CRUD.
- Two topologies. **Broker** has no central coordinator — processors publish and subscribe via a broker, maximally decoupled. **Mediator** has a central orchestrator that owns workflow state, error handling, restart, and recovery. Broker buys responsiveness and decoupling; mediator buys control.
- **Responsiveness is not performance.** Async messaging makes the user-perceived latency vanish; it does not make the work faster. The trade-off is error handling complexity.
- **Error handling** in async flows uses the **Workflow Event Pattern**: the consumer delegates errors to a workflow processor that repairs the message or routes it to a human dashboard, and the consumer immediately moves on. Order preservation for retried messages is the architect's problem.
- **Preventing data loss** requires three concrete techniques in combination: persisted queues + synchronous send (producer → broker), client-acknowledge mode (broker → consumer), and Last Participant Support (consumer → DB).
- Synchronous request/reply is implemented with a **correlation ID** plus message-selector blocking wait (preferred) or a **temporary reply queue** (simpler but expensive at scale).
- **Broadcast** is the highest form of decoupling — publishers have no idea who consumes the event. It is essential for eventual consistency, CEP, and downstream extensibility.

## When to Use
- Reactive, action-driven domains (auctions, bidding, real-time pricing, IoT, fraud detection).
- High-scale, high-performance workloads where eventual consistency is acceptable.
- As a *component* of hybrid architectures — event-driven microservices, event-driven space-based, event-driven microkernel.

## Characteristic Profile
- Strong on: performance, scalability, fault tolerance, evolutionary change (5-star each).
- Weak on: simplicity, testability, certainty over outcomes (non-deterministic event trees are hard to test and debug).

## Enforceable Rules
- Async publishers must use persisted queues + synchronous send; consumers must use client-acknowledge + LPS where data must not be lost.
- Every consumer must have a documented error path. Silently dropping errors in async flows is a critical violation.
- Request/reply must use a correlation ID and a selector-based blocking wait, not naive "read the next message off the queue."
- Mediator workflows must persist event state so recovery and restart are possible. Broker workflows must accept that recoverability is not built in.

## Review Questions
- Is this flow truly event-driven, or is it a synchronous request dressed up in a queue?
- Where does an error in step N go? Is there a Workflow Event Pattern processor or a dashboard, or does the error vanish?
- If the broker / consumer crashes mid-flow, what state is lost? Have we applied persisted queues, client-ack, and LPS where needed?
- Should this be broker (more decoupled) or mediator (more controllable)? Did we justify the choice?

## Examples
### Violation
- A consumer pulls a message off the queue in auto-acknowledge mode, processes it, and silently swallows exceptions. On crash, the message is gone. There is no record of what failed and no way to replay.
### Good Implementation
- An `OrderPlacement` consumer reads in client-ack mode, delegates parse errors to a `TradePlacementError` workflow processor that programmatically fixes malformed payloads and resubmits to the original queue, and only acknowledges the broker after the DB commit (LPS). Order is preserved per-account through a per-account holding queue.

## Implications
### For Agents
- When generating async code, agents must wire up persisted queues, client-ack, LPS, and a workflow-event-pattern error path by default — not as a TODO. Distinguish "responsiveness" from "performance" in PR descriptions. When proposing event-driven flows, justify broker vs mediator explicitly.
### For Tickets/PRs/CI
- Tickets that introduce async flows must specify topology (broker / mediator), error handling strategy, idempotency, and ordering guarantees. PRs must include the workflow-event-pattern wiring or document why it's not needed. CI should include chaos-style tests that drop messages and crash consumers to verify no data loss.
