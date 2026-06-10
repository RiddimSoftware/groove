# Chapter 5: A Model Expressed in Software

## Overview
This chapter introduces the core building blocks for expressing a domain model in code: Entities, Value Objects, Services, and Modules.

## Key Concepts

### Entities (Reference Objects)
- An object defined not by its attributes, but by a thread of continuity and its identity.
- *Example:* A Person is an Entity. Even if a person's name, address, or age changes, they are still the same person, identified by a unique ID (like an SSN or UUID).
- Focus on defining the lifecycle and identity of the Entity; keep its attributes minimal.

### Value Objects
- An object that describes some characteristic or attribute but carries no concept of identity.
- *Example:* A Color, a Money amount, or an Address. Two 5-dollar bills are interchangeable; we only care about their value, not their unique identity.
- **Immutability:** Value Objects must be immutable. If you need a different value, you create a new Value Object. This makes them safe to share and simplifies reasoning about the code.

### Services
- Sometimes a concept does not naturally fit as an attribute or behavior of an Entity or Value Object. It represents an operation or action.
- *Characteristics:* The operation relates to a domain concept; the interface is defined in terms of other elements of the domain model; the operation is stateless.
- Do not strip all behavior from Entities and put it in Services (leading to an Anemic Domain Model). Services should only hold logic that doesn't belong to a specific object.

### Modules (Packages/Namespaces)
- Modules are a way to organize the domain model into cohesive, understandable chunks.
- Modules should have high cohesion (things inside belong together) and low coupling (minimal dependencies on other modules).
- Name modules using the Ubiquitous Language.

## Application
- Vigorously distinguish between Entities and Value Objects. Default to Value Objects whenever possible, as they are safer and easier to test.
- Ensure Value Objects are immutable.
- Keep Services thin and focused on orchestrating Entities and Value Objects.
