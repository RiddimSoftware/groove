# Chapter 11: DIP: The Dependency Inversion Principle

## Core Principles
- The most flexible systems are those in which source code dependencies refer only to abstractions, not to concretions.
- High-level policy should not depend on low-level details. Details should depend on policies.
- Stable software architectures avoid depending on volatile concretions.

## Enforceable Rules
- Do not refer to volatile concrete classes. Refer to abstract interfaces instead.
- Do not derive from volatile concrete classes.
- Do not override concrete functions.
- Never mention the name of anything concrete and volatile in high-level business rules.

## Review Questions
- Is business logic directly instantiating concrete implementation classes for external services or databases?
- Are dependencies pointing inwards toward the abstract domain model?

## Examples
### Violation
An `Application` class directly instantiating a `ConcreteImpl` using the `new` keyword. This creates a hard source-code dependency from the application's high-level policy to a low-level concrete detail.
### Good Implementation
The `Application` class depends on a `Service` interface and a `ServiceFactory` interface. The `Main` component (the entry point) instantiates the `ServiceFactoryImpl`, which creates the `ConcreteImpl`. The `Application` obtains the service through the factory, inverting the dependency.

## Implications
### For Agents
- When adding external integrations (databases, APIs) at Riddim Software, AI agents must define an interface in the domain layer and implement the adapter in the infrastructure layer. They should use Dependency Injection (e.g., passing interfaces via constructors) rather than hardcoding instantiations.
### For Tickets/PRs/CI
- PRs should be checked (manually or via CI tools) to ensure `new` is not used for volatile services inside business logic, and that the `Main` or DI container is the only place where concrete infrastructure is wired up.