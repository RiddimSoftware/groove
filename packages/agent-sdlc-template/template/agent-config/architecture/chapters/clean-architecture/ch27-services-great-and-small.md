# Chapter 27: Services: Great and Small

## Core Principles
- **Services vs. Architecture:** Services are not an architecture in themselves; they are a deployment topology. They are essentially just expensive function calls.
- **The Decoupling Fallacy:** Services are not necessarily decoupled just because they are in different processes. They can be strongly coupled by the data they share or by shared resources.
- **The Independent Development/Deployment Fallacy:** Services can only be independently developed and deployed if they are truly decoupled. If they share a cross-cutting concern, development and deployment must be carefully coordinated.
- **Component-Based Services:** Services should be built using the SOLID principles and component architecture internally, allowing new features to be added as plugins (e.g., new classes/jars) without modifying existing service code.

## Enforceable Rules
- Do not assume that breaking a system into services automatically creates a good architecture.
- Cross-cutting concerns must be managed by designing internal component architectures that follow the Dependency Rule within the services themselves.

## Review Questions
- Does adding this new feature require modifying and deploying multiple services simultaneously? (If yes, the services are coupled).
- Is this service internally structured with clear boundaries between its business logic and its I/O/database layers?

## Examples
### Violation
- A "TaxiAggregator" system built of microservices (`UI`, `Finder`, `Selector`, `Dispatcher`) where adding a new "Kitten Delivery" feature requires modifying the source code of every single service.
### Good Implementation
- A component-based architecture where the common logic is in base classes, and "Taxi" and "Kitten" features are implemented as polymorphic plugins that extend the base classes, following the Dependency Rule.

## Implications
### For Agents
- Agents should not blindly recommend microservices as a solution to architectural problems. They should focus on decoupling at the component level first.
### For Tickets/PRs/CI
- If a ticket requires touching multiple microservices, it indicates a failure to manage cross-cutting concerns. The architecture should be refactored to isolate that concern.
