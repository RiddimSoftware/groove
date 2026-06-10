# Chapter 8: Component-Based Thinking

## Core Principles
- A **component** is the physical manifestation of a module — the unit an architect actually decides about. Components nest: from **libraries** (compile-time, in-process) through **subsystems / layers** (in-process, deployable unit), to **services** (out-of-process, networked, independently deployable). The component is the lowest level the architect directly designs; classes and functions belong to developers.
- The architect's first top-level decision is **architecture partitioning**: **technical** (layered — presentation / business / persistence / ...) vs **domain** (modular monolith / microservices — CatalogCheckout / Payment / Inventory / ...). The book strongly favors *domain partitioning* and observes a clear industry trend that way.
- **Conway's Law**: organizations produce designs that mirror their communication structures. The **Inverse Conway Maneuver** is deliberate — restructure teams around the architecture you want.
- Technical partitioning advantages: clear separation of technical concerns, easy to find "all the persistence." Disadvantage: every workflow smears across layers, every change touches multiple layers. Domain partitioning advantages: aligned to how the business changes, easy to migrate to distributed, message flow matches the domain. Disadvantage: cross-cutting concerns appear in multiple components.
- **Component Identification Flow** (iterative loop): **(1)** identify initial components, **(2)** assign requirements/stories to components, **(3)** analyze roles and responsibilities, **(4)** analyze Architecture Characteristics (this often splits a component — same function, different operational needs), **(5)** restructure. The cycle is meant to run repeatedly; first-pass component design will be wrong.
- **Discovery techniques**: **Actor/Actions** (general-purpose, good for waterfall-ish processes), **Event Storming** (DDD + messaging, pairs with microservices), **Workflow** (DDD-lite, generic). None is universally better — match the technique to the process.
- **Entity Trap anti-pattern**: building one Manager component per database entity. That's not architecture, that's an ORM — and the components will be too coarse-grained, with no guidance for developers.
- **Monolithic vs distributed** is decided by **quantum count**: if the analysis yields one quantum (one set of characteristics for the whole system), prefer a monolith. If components have meaningfully different characteristics — as in Going-Going-Gone — go distributed.

## Enforceable Rules
- Pick a top-level partitioning style explicitly (technical vs domain) and stick to it; don't mix half-heartedly. Default to domain partitioning unless there's a stated reason otherwise.
- Reject component designs that are a 1:1 mapping of database tables to "Manager" components — that's the entity trap.
- When two components share a function but need different Architecture Characteristics (e.g. scalability, reliability), split them. Going-Going-Gone splits `BidCapture` into `BidCapture` (bidders) and `AuctioneerCapture` (auctioneer) for exactly this reason.
- A new "service" must justify being a separate quantum (own data, own deploy) — otherwise it's just a component inside the existing quantum.

## Review Questions
- Is this component organized around a **domain/workflow** or a **technical capability**? Does that match the chosen partitioning style?
- Have we accidentally fallen into the entity trap — one component per table?
- Do these two components really need the same Architecture Characteristics, or should they be split?
- Should this new boundary be a component (in-process), a module, or a service (new quantum)? What does the quantum count say about monolith vs distributed?
- Has the component design gone through at least one restructuring iteration, or is it still the first draft?

## Examples
### Violation
- A new system has `CustomerManager`, `OrderManager`, `ProductManager`, `InventoryManager`, `PaymentManager`, each mapping to a table. There is no workflow component (no `Checkout`, no `Fulfillment`). The actual business activities are smeared across managers; developers have no guidance on where new behavior goes.
### Good Implementation
- The same system is partitioned by domain: `CatalogCheckout`, `OrderFulfillment`, `Promotions`, `CustomerProfile`. Each owns its persistence internally. A characteristic-driven split has separated read-heavy product browsing from write-heavy checkout — the two have different scalability profiles and live in different quanta.

## Implications
### For Agents
- When generating an initial architecture or proposing a new service, default to **domain partitioning**. Don't generate a CRUD-Manager-per-entity scaffold. When proposing a new "service," check whether it really needs its own quantum (own data, own deploy) — if not, propose it as a component inside an existing quantum. After mapping requirements to components, run the characteristic analysis: if two components share function but diverge on characteristics, recommend splitting them.
### For Tickets/PRs/CI
- New architecture tickets state the partitioning style and name the initial components. Tickets that propose a new service must justify it as a new quantum, not just "we'll call it a service." PR descriptions for component changes explain which Architecture Characteristic motivated the boundary. CI can host fitness functions enforcing the chosen partitioning (e.g. domain components must not depend on each other except through declared interfaces; no domain component may reach into another's persistence).
