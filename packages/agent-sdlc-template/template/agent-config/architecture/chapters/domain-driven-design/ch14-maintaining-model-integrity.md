# Chapter 14: Maintaining Model Integrity

## Overview
This chapter shifts to Strategic Design. It addresses the reality that in a large enterprise, it is impossible to have a single, unified domain model. Instead, we must manage multiple models and define the relationships between them.

## Key Concepts

### Bounded Context
- A model only makes sense in a specific context. A "Customer" means something different to the Support team than it does to the Billing team.
- A Bounded Context explicitly defines the boundaries within which a particular model applies.
- Code within a Bounded Context must be strictly consistent.

### Context Map
- A document or diagram that outlines the different Bounded Contexts in an organization and the relationships between them.

### Relationships Between Contexts
- **Shared Kernel:** Two teams share a subset of a domain model. Changes must be coordinated.
- **Customer/Supplier:** One team (supplier) provides a service to another (customer). The customer's needs drive the supplier's planning.
- **Conformist:** The downstream team simply adopts the upstream team's model, even if it's not ideal, to simplify integration.
- **Anticorruption Layer (ACL):** The downstream team creates an isolating layer to translate between the upstream model and its own model. This protects the downstream model from being polluted.
- **Separate Ways:** Teams decide not to integrate at all, as the cost outweighs the benefit.
- **Open Host Service:** A context defines a formal protocol (API) to give access to its services.
- **Published Language:** A well-documented, shared language used for communication between contexts (e.g., an industry-standard XML format).

## Application
- Do not try to create one massive Enterprise Data Model. It will fail.
- Explicitly define the boundaries of your current work. What Bounded Context are you in?
- Protect your model from external systems, especially legacy ones, using Anticorruption Layers.
