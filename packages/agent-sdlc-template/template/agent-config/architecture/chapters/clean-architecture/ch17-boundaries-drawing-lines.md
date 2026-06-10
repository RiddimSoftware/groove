# Chapter 17: Boundaries: Drawing Lines

## Core Principles
- **Plugin Architecture:** The system should be designed so that details (UI, Database, external services) plug into the core business rules. The core should not plug into the details.
- **Axis of Change:** Boundaries are drawn where there is an axis of change. Components on one side change at different rates and for different reasons than components on the other side.
- **Defer Decisions:** Drawing boundaries allows you to delay and defer decisions, saving enormous amounts of time and avoiding premature commitment to tools.

## Enforceable Rules
- Source code dependencies must point across the boundary toward the core business rules, never away from them.
- Interfaces (Ports) must be defined by the component that needs the service (the core), and implemented by the component providing the service (the detail).

## Review Questions
- Does the core domain import anything from the UI, database, or external API layers?
- If we wanted to swap out the database for a different technology, how many core business files would need to change? (Ideally, zero).

## Examples
### Violation
- The `OrderProcessor` (business rule) imports the `StripePaymentGateway` (detail) directly to process a payment.
### Good Implementation
- The `OrderProcessor` depends on an `IPaymentGateway` interface. The `StripePaymentAdapter` implements this interface and plugs into the system at runtime.

## Implications
### For Agents
- Agents must always define a Port (interface) when the core domain needs to talk to the outside world, rather than calling the outside world directly.
### For Tickets/PRs/CI
- PRs that cross architectural boundaries in the wrong direction should be automatically flagged or rejected by CI dependency linters.
