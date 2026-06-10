# Clean Architecture Doctrine

This document serves as the canonical source of truth for software architecture at Riddim Software. It codifies the principles described in Robert C. Martin's "Clean Architecture."

## Core Principles

- **The Dependency Rule:** Source code dependencies must point only inward, toward higher-level policies.
- **Policy vs. Detail:** High-level policies (business rules) must be decoupled from low-level details (frameworks, UI, databases).
- **Screaming Architecture:** The structure of the application should communicate its purpose, not the frameworks used.

## I. Foundations

### Design and Architecture
- **No Difference:** There is no difference between design and architecture. They are two parts of the same whole.
- **The Goal:** The goal of software architecture is to minimize the human resources required to build and maintain the system.
- **Value over Behavior:** Software has two values: behavior (what it does) and structure (how easy it is to change). Structure is the greater value. Architecture must fight for the "softness" of the software.

### Programming Paradigms
- **Structured Programming:** Imposes discipline on direct transfer of control. It allows us to recursively decompose a system into provable, testable units (Science to the rescue).
- **Object-Oriented Programming:** Imposes discipline on indirect transfer of control. Its primary power is **Polymorphism**, which allows the architect to create a **Plugin Architecture** and invert any dependency in the system.
- **Functional Programming:** Imposes discipline on variable assignment. It promotes **Immutability**, which eliminates race conditions and concurrent update issues.

## II. Design Principles (SOLID)

These principles guide the arrangement of functions and data into components.

- **SRP (Single Responsibility Principle):** A module should be responsible to one, and only one, actor. At the architectural level, this means separating components that serve different actors.
- **OCP (Open-Closed Principle):** A software artifact should be open for extension but closed for modification. This is the primary reason we study architecture. It is achieved by partitioning the system into a hierarchy of components where high-level policies are protected from changes in lower-level details.
- **LSP (Liskov Substitution Principle):** To build software systems from interchangeable parts, those parts must adhere to a contract that allows them to be substituted for one another. Violations of LSP lead to pollution with special-case logic.
- **ISP (Interface Segregation Principle):** Avoid depending on things you don't use. This prevents unnecessary recompilation and redeployment.
- **DIP (Dependency Inversion Principle):** Code that implements high-level policy should not depend on code that implements low-level details. Rather, details should depend on policies. Use Abstract Factories to manage volatile concrete dependencies.

## III. Component Principles

These principles guide the grouping of classes into components and the relationships between them.

### Component Cohesion
- **REP (Reuse/Release Equivalence Principle):** The granule of reuse is the granule of release. Components must be trackable through a release process.
- **CCP (Common Closure Principle):** Gather into components those classes that change for the same reasons and at the same times. (Component form of SRP).
- **CRP (Common Reuse Principle):** Don't force users of a component to depend on things they don't need. (Component form of ISP).

### Component Coupling
- **ADP (Acyclic Dependencies Principle):** Allow no cycles in the component dependency graph. Cycles create the "morning after syndrome" where teams break each other's code.
- **SDP (Stable Dependencies Principle):** Depend in the direction of stability. A component should only depend on components that are more stable than itself.
- **SAP (Stable Abstractions Principle):** A component should be as abstract as it is stable. Stable components should be abstract to allow for extension (OCP).

## IV. Architecture (The Big Picture)

### The Strategic Goal
- **Leaving Options Open:** A good architecture allows decisions about frameworks, databases, and other environmental issues to be deferred and delayed as long as possible.
- **Independence:** Architecture should support independent development, deployment, and operation of the system.

### Layers and Boundaries
- **Policy vs. Level:** Level is defined as "the distance from the inputs and outputs." Higher-level policies are farther from I/O and should not depend on lower-level details.
- **Boundaries:** Boundaries are lines drawn to separate components and restrict knowledge. They exist where there is an "axis of change."
- **Screaming Architecture:** Your architecture should "scream" its intent. A health care system should look like a health care system, not a Ruby on Rails application.

### Business Rules (The Core)
- **Entities:** Critical business rules and data that would exist even without a computer system. They are the most stable and independent part of the system.
- **Use Cases:** Application-specific business rules. They orchestrate the flow of data to and from Entities and ports.
- **Request and Response Models:** Use cases should use simple data structures for I/O, decoupled from both Entities and Frameworks.

### The Clean Architecture (The Circles)
- **Domain (Entities):** The innermost circle.
- **Application (Use Cases):** The next circle.
- **Interface Adapters (Controllers/Presenters):** Translators.
- **Frameworks and Drivers (DB/UI):** The outermost circle.
- **Crossing Boundaries:** All dependencies cross the circle boundaries pointing inward.

### Implementation Patterns
- **Humble Object Pattern:** Separate hard-to-test behaviors (UI/DB) from testable logic. The hard-to-test part is the "Humble Object."
- **Partial Boundaries:** Sometimes a full boundary is too expensive; use placeholders like the Strategy pattern to defer full isolation.
- **Main Component:** The "dirtiest" component. It handles the initial setup, configuration, and dependency injection.

## V. Organizational Codification (Riddim Standards)

### PR and Review Requirements
- **Dependency Inversion:** PRs that introduce dependencies pointing outward (e.g., Domain logic importing a View or DB driver) must be rejected or have a strong justification documented in an ADR.
- **Explicit Adapters:** All external APIs, SDKs, and persistence mechanisms must be isolated behind an adapter and a port.
- **Use Case Naming:** Use cases must be named after the action they perform (e.g., `SubmitReview`, `FetchParliamentarySchedule`).
- **Use Case Catalog:** Every PR that adds or changes application behavior **must** update the repo's use-case catalog (`docs/use-cases/catalog.md`).

### Ticket Shaping (Linear)
- **Architecture Impact Section:** Non-trivial tickets should specify the affected layers and intended dependency direction.
- **Use-Case-First:** Tickets should describe the behavior first, then the implementation details.

### Testing Strategy
- **Domain/Application:** 100% test coverage with fast, isolated unit tests. No network or database required.
- **Adapters:** Integration tests that verify translation logic and external interaction.
- **Main:** End-to-end smoke tests for critical paths.

## VI. Repo-Local Architecture

Each repository should have a section in its `CLAUDE.md` that maps these abstract principles to the local file structure:
- **Use Cases:** Where do they live? (e.g., `Sources/Application/UseCases/`)
- **Entities:** Where are the domain models? (e.g., `Sources/Domain/Entities/`)
- **Adapters:** Where are the infrastructure implementations? (e.g., `Sources/Infrastructure/Adapters/`)
- **Forbidden Imports:** Local linting rules to enforce boundaries.
