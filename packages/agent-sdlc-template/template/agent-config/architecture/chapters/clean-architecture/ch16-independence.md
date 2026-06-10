# Chapter 16: Independence

## Core Principles
- **Decoupling Layers:** Separate things that change for different reasons. UI, business rules, and databases change at different rates and should be decoupled.
- **Decoupling Use Cases:** Use cases change for different reasons than each other. They are narrow vertical slices that cut through horizontal layers and should be decoupled from one another.
- **Decoupling Modes:** Systems can be decoupled at the source level (monolith), deployment level (jars/dlls), or service level (micro-services). A good architecture leaves the mode open to change over time.

## Enforceable Rules
- Use cases must not share UI formatting logic or database schemas just because they look similar initially (accidental duplication).
- Dependencies must allow the system to be developed and deployed independently.

## Review Questions
- Are these two use cases sharing code because they are fundamentally the same, or just because their screens currently look similar?
- Can we test this use case independently of the UI and the database?

## Examples
### Violation
- Passing a database row object directly up to the UI view to display it, tying the database schema directly to the screen layout.
### Good Implementation
- Creating a `ViewModel` for the UI and a separate `Entity` for the business rules, with a presenter or adapter mapping between them.

## Implications
### For Agents
- Agents should resist the urge to deduplicate code across different use cases if the reasons for that code changing might diverge in the future.
### For Tickets/PRs/CI
- Tickets should clearly define the boundaries of a use case. PRs should not introduce tight coupling between distinct use cases just to save a few lines of code.
