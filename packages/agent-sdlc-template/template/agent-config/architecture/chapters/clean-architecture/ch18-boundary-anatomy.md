# Chapter 18: Boundary Anatomy

## Core Principles
- **Boundary Crossings:** At runtime, a boundary crossing is a function call. The trick is to manage the *source code* dependencies across that crossing using polymorphism.
- **The Dreaded Monolith:** Even in a statically linked monolithic application, disciplined boundaries (source-level decoupling) are immensely valuable for independent development and testing.
- **Services:** Services are the strongest physical boundaries, but they are expensive in terms of latency and coordination. Service boundaries should still obey the Dependency Rule.

## Enforceable Rules
- In a boundary crossing from lower-level to higher-level, the dependency points with the flow of control.
- In a boundary crossing from higher-level to lower-level, dynamic polymorphism (e.g., interfaces) must be used to invert the dependency against the flow of control.

## Review Questions
- Is this communication across a process or service boundary necessary, or could it be a simpler local component boundary?
- Are we passing framework-specific data structures across a boundary instead of simple, isolated Data Transfer Objects (DTOs)?

## Examples
### Violation
- Two microservices sharing the same database table and directly reading/writing to it, creating a hidden coupling that violates the service boundary.
### Good Implementation
- A monolith where the `WebController` calls the `UseCaseInteractor` via an interface, passing a simple POJO/struct that contains no web framework request context.

## Implications
### For Agents
- Agents should default to creating strong source-level boundaries (interfaces and DTOs) even if the application is currently deployed as a single monolith.
### For Tickets/PRs/CI
- Moving from a monolith to microservices should be easier if the internal boundaries were respected. Tickets proposing new services must justify the latency and deployment cost.
