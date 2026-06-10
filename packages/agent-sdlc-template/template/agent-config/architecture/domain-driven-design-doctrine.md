# Domain-Driven Design Doctrine

This document serves as the canonical source of truth for software architecture at Riddim Software when applying Domain-Driven Design (DDD) principles. It codifies the concepts described in Eric Evans' "Domain-Driven Design: Tackling Complexity in the Heart of Software."

## Core Principles

- **Focus on the Core Domain:** The heart of the software is the domain. Most effort should be spent on understanding and modeling the core domain.
- **Ubiquitous Language:** The team must use a shared, common language that is rigorously aligned with the domain model. This language must be used in conversations, code, and tests.
- **Model-Driven Design:** The software implementation must tightly map to the domain model. If the model is not reflected in the code, the model is useless.

## I. Putting the Domain Model to Work

### Knowledge Crunching
- **Domain Experts and Developers:** Development is an iterative process of knowledge crunching where developers and domain experts collaborate to distill a shared understanding into a model.
- **Continuous Learning:** The model is never perfect. It must continuously evolve as the team learns more about the business.

### Ubiquitous Language
- **No Translation:** There should be no translation between business language and technical language. The terms used by the business must be the names of classes, methods, and variables.
- **Linguistic Integrity:** If a term is ambiguous, the team must clarify it. The code must reflect the clarified term.

### Binding Model and Implementation
- **Hands-on Modelers:** Anyone modeling the domain must write code. Anyone writing code must understand the model. There is no separation between "architects" who model and "coders" who build.

## II. The Building Blocks of a Model-Driven Design

### Isolating the Domain
- **Layered Architecture:** The domain layer must be strictly isolated from the UI, application, and infrastructure layers. This ensures the domain model is not polluted by technical concerns.

### Expressing the Model
- **Entities:** Objects defined by a thread of continuity and identity, not their attributes.
- **Value Objects:** Objects that describe some characteristic or attribute but carry no concept of identity. They must be immutable.
- **Services:** Operations or actions that do not naturally belong to an Entity or Value Object. They are stateless.
- **Modules:** High-level logical groupings of related concepts. They should have high cohesion and low coupling.

### Life Cycle of a Domain Object
- **Aggregates:** Clusters of associated objects that are treated as a single unit for data changes. Every Aggregate has a single **Root Entity**. External objects can only hold references to the Root. Aggregates define transactional boundaries.
- **Factories:** Complex object creation should be encapsulated in Factories, ensuring that objects are created in a valid state.
- **Repositories:** Provide a facade for accessing Aggregates, mimicking a collection-like interface while hiding persistence mechanisms.

## III. Refactoring Toward Deeper Insight

- **Making Implicit Concepts Explicit:** Hidden domain concepts often manifest as awkward code. Refactoring should bring these concepts to the forefront.
- **Supple Design:** The design should be easy to work with. Use intention-revealing interfaces, side-effect-free functions, and standalone classes to make the domain model expressive and flexible.

## IV. Strategic Design

### Maintaining Model Integrity
- **Bounded Context:** A model only makes sense within a specific context. Explicitly define the boundaries within which a particular model applies.
- **Context Map:** A global view of the different Bounded Contexts in the system and the relationships (e.g., Shared Kernel, Anticorruption Layer, Open Host Service) between them.

### Distillation
- **Core Domain:** Identify the most valuable part of the system and assign the best developers to it.
- **Generic Subdomains:** Outsource or use off-the-shelf solutions for generic concerns (e.g., billing, auth) that are not the primary competitive advantage.

### Large-Scale Structure
- **Responsibility Layers:** Group Bounded Contexts into layers based on their responsibilities to manage large systems.
