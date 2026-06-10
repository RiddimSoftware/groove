# Chapter 13: Service-Based Architecture Style

## Core Principles
- Service-based architecture is a **pragmatic distributed hybrid**: separately deployed UI, 4–12 **coarse-grained domain services**, and (typically) a shared monolithic database. It captures most of the wins of microservices without the operational tax.
- Services are **domain-partitioned** ("portions of an application") — usually one service per domain, deployed like any monolith (EAR, WAR, container). Granularity is intentionally coarser than microservices.
- Because services are coarse-grained, **ACID transactions still work inside a service**. Eventual consistency / sagas only enter the picture when the UI or API gateway orchestrates across services.
- The database can stay shared, be **logically partitioned via federated shared libraries** (one entity library per domain), or split into domain databases. The further toward partitioning, the closer to microservices and the more independent the services.
- An optional **API gateway / reverse proxy** layer handles cross-cutting concerns (auth, metrics, discovery) without dragging logic into the UI.

## When to Use
- Domain-driven applications that need agility, testability, and deployability but don't need extreme scale or per-service tech stacks.
- Teams ready for distributed deployment but not ready for the operational cost (DevOps maturity, service mesh, polyglot persistence) of microservices.
- Workloads where ACID transactions are required for most business operations and only a handful of cross-domain flows need orchestration.

## Characteristic Profile
- Strong on: agility, testability, deployability, availability, fault tolerance, reliability (4-star across the board).
- Weak on: scalability, elasticity (3 and 2 stars — coarse-grained services replicate too much when scaled).

## Enforceable Rules
- Interservice synchronous calls between domain services are forbidden by default. Orchestration belongs in the UI or the API gateway, not service-to-service.
- Each domain service exposes one API facade. Internal layering inside the service (facade / business / persistence) is the service's business, not the caller's.
- Shared entity libraries must be partitioned by domain. A single mega-library of all entities is the worst case — every schema change rebuilds every service.
- Common-domain entities (used by all services) must be locked to a database team / governance group so changes are surfaced.

## Review Questions
- Did this PR introduce a synchronous service-to-service call? Why isn't it orchestrated higher up?
- Is this database change scoped to a single domain library, or does it ripple through `common_entities_lib`?
- Is this service still coarse-grained (a domain), or has it splintered into multiple fine-grained services that need transactional coordination across themselves?
- Could this need have been served by the existing 7 services rather than a new 8th?

## Examples
### Violation
- The `OrderService` synchronously calls the `PaymentService`, which calls the `InventoryService`, all in one request — recreating microservices' transaction headaches without microservices' scaling benefits.
### Good Implementation
- `OrderService` handles place-order, generate-id, apply-payment, and decrement-inventory inside one service, in one ACID transaction. The UI calls `OrderService` once. Scaling adds an `OrderService` instance behind a load balancer.

## Implications
### For Agents
- Default to service-based when the domain decomposes into 4–12 coherent areas and the user has not specifically asked for extreme scale. Resist creating fine-grained services for their own sake. When reviewing, flag synchronous cross-service calls and propose either moving the orchestration up to the gateway/UI or merging the services back into one domain.
### For Tickets/PRs/CI
- Tickets should be scoped to a single domain service. Cross-service tickets must specify the orchestration point (UI or gateway). PRs that add a new service must justify why an existing service can't absorb the work. CI should run per-service tests independently and gate database migrations on the partitioned entity library that owns the changing tables.
