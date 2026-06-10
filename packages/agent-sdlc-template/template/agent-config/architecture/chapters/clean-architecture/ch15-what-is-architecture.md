# Chapter 15: What Is Architecture?

## Core Principles
- **Maximize Programmer Productivity:** The primary purpose of architecture is to support the life cycle of the system (development, deployment, operation, and maintenance), minimizing lifetime cost.
- **Leave Options Open:** A good architecture makes the system easy to change by making decisions about details (frameworks, databases, UI) irrelevant to the policy, allowing those decisions to be delayed and deferred.
- **Device Independence:** Policy should not depend on the mechanisms of delivery or storage.

## Enforceable Rules
- High-level business rules must not contain dependencies on specific databases, web frameworks, or other I/O mechanisms.
- Commitments to specific third-party frameworks for core business logic should be avoided or delayed.

## Review Questions
- Does this PR force a decision about a database or framework that could be delayed?
- Is the business logic tightly coupled to how it is delivered (e.g., HTTP request/response objects inside a use case)?

## Examples
### Violation
- Hard-coding SQL queries or ORM annotations directly into the domain entities.
### Good Implementation
- Creating a repository interface in the domain layer that the database layer implements, keeping the domain agnostic of SQL.

## Implications
### For Agents
- Agents should prioritize building the core domain and use cases before wiring up the web or database layers, keeping the implementation agnostic.
### For Tickets/PRs/CI
- Tickets should focus on implementing business rules independently of the delivery mechanism. CI should be able to run core tests without standing up a database.
