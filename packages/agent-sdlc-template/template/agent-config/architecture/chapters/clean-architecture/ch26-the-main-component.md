# Chapter 26: The Main Component

## Core Principles
- **The Ultimate Detail:** The `Main` component is the lowest-level policy in the system. It is the initial entry point.
- **Responsibility:** Its job is to create all the Factories, Strategies, and other global facilities, and then hand control over to the high-level abstract portions of the system.
- **Dependency Injection:** `Main` is the component that should instantiate and inject dependencies. It is the dirtiest of all the dirty components.

## Enforceable Rules
- `Main` is the only component allowed to know about everything (the concrete implementations and the interfaces).
- No other component in the system should depend on `Main`. Dependencies flow from `Main` to the rest of the system.

## Review Questions
- Is dependency injection happening inside a Use Case or Entity? (It should only happen in `Main` or a dedicated DI container configured by `Main`).
- Does `Main` contain business logic, or is it strictly wiring things together?

## Examples
### Violation
- A Use Case instantiating a concrete `SqlDatabaseRepository` directly.
### Good Implementation
- The `Main` function (or DI setup file) instantiates `SqlDatabaseRepository` and passes it to the `UseCase` constructor as an `IRepository` interface.

## Implications
### For Agents
- When tasked with wiring up a new feature, agents must make the changes in the `Main` component (or the application's DI configuration module), not in the core domain code.
### For Tickets/PRs/CI
- Think of `Main` as a plugin to the application. You can have different `Main` components for Dev, Test, and Production. PRs modifying `Main` are expected to contain concrete wiring details.
