# Chapter 22: The Clean Architecture

## Core Principles
- **The Dependency Rule:** Source code dependencies must point only inward, toward higher-level policies.
- **Concentric Circles:** Architecture is typically divided into concentric circles:
    - Inner: Entities (Enterprise Business Rules)
    - Next: Use Cases (Application Business Rules)
    - Next: Interface Adapters (Controllers, Presenters, Gateways)
    - Outer: Frameworks and Drivers (Web, DB, UI)
- **Data Crossing Boundaries:** Data passed across boundaries should be simple data structures.

## Enforceable Rules
- Nothing in an inner circle can know anything at all about something in an outer circle.
- Data formats declared in an outer circle must not be used by an inner circle.

## Review Questions
- Are there any imports from the `Adapters` or `Frameworks` layer inside the `UseCases` or `Entities` layer?
- Is a database row object being passed directly to a presenter or view?

## Examples
### Violation
- A Use Case directly formatting a response as JSON because it knows the outer layer is a REST API.
### Good Implementation
- A Use Case returns a simple `OutputData` structure. The `Presenter` (in the Interface Adapters layer) takes that structure and converts it to a `ViewModel` or JSON format.

## Implications
### For Agents
- This is the foundational model for all architectural work. Agents must strictly enforce the inward direction of dependencies in every PR.
### For Tickets/PRs/CI
- CI should utilize linters to statically verify that the Dependency Rule is not violated, blocking merges if an inner layer imports an outer layer.
