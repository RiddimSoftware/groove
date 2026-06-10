# Chapter 5: Object-Oriented Programming

## Core Principles
- OOP is not simply "the combination of data and function" or "modeling the real world."
- While encapsulation and inheritance are associated with OOP, they existed in C. OOP's true defining power is **safe and convenient polymorphism**.
- Polymorphism allows architects to achieve **Dependency Inversion**. 
- With Dependency Inversion, the source code dependency (the `import` or `#include`) can point in the opposite direction of the flow of control. Any source code dependency, no matter where it is, can be inverted.
- This allows high-level policies (business rules) to be completely independent of low-level details (UI, Database), leading to independent deployability and developability.

## Enforceable Rules
- Source code dependencies should not blindly follow the flow of control.
- High-level policies must not depend on low-level details. Use interfaces to invert the dependencies so details depend on policies.

## Review Questions
- Does the core business logic depend on the UI, the Database, or any external framework? (It shouldn't).
- Are interfaces used correctly to invert dependencies and create a plugin architecture?
- Can the business rules be compiled and tested without the database or UI components?

## Examples
### Violation
- A `CalculatePay` business rule function explicitly imports a `MySQLDatabase` class to fetch employee records, tying the business rule inextricably to a specific database technology.
### Good Implementation
- The `CalculatePay` function depends on an `EmployeeRepository` interface. The `MySQLDatabase` module implements this interface. The dependency is inverted: the database depends on the business rule's interface, making the database a plugin.

## Implications
### For Agents
- Agents must architect code so that core business logic is completely isolated from frameworks, IO, and databases via Dependency Inversion. When adding features, Agents should define interfaces in the core and implement them in the details layer.
### For Tickets/PRs/CI
- Dependency analysis tools in CI should verify that domain/business modules do not import UI or database packages. PR reviewers must flag any direct coupling from high-level to low-level modules.
