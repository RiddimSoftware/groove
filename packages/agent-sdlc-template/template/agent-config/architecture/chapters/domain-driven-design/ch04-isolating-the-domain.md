# Chapter 4: Isolating the Domain

## Overview
This chapter explains how to protect the domain model from being entangled with technical concerns like user interfaces, databases, or network protocols. Isolation is achieved through layered architecture.

## Key Concepts

### Layered Architecture
To develop a complex domain model, it must be isolated from the rest of the system. A common pattern is a four-layer architecture:
1.  **User Interface (Presentation):** Responsible for showing information to the user and interpreting user commands.
2.  **Application:** Defines the jobs the software is supposed to do and directs the expressive domain objects to work out problems. It contains no business rules or knowledge.
3.  **Domain:** The heart of the software. Represents concepts of the business, information about the business situation, and business rules. State that reflects the business situation is controlled and used here.
4.  **Infrastructure:** Provides generic technical capabilities that support the higher layers (e.g., message sending, database persistence, UI drawing).

### The Dependency Rule
- Dependencies must point downwards. The Domain layer must not depend on the Application, UI, or Infrastructure layers.
- This ensures that the domain logic can be tested in isolation and remains pure, regardless of how it is presented or stored.

### Anti-Patterns
- **Smart UI:** Putting business logic directly in UI components (e.g., button click handlers). This makes the logic un-reusable and hard to test.
- **Database-Driven Design:** Designing the database schema first and forcing the code to match it, rather than designing the behavioral model first.

## Application
- Keep your domain classes clean of annotations or dependencies related to your web framework or ORM.
- Use interfaces (ports) in the domain layer and implement them (adapters) in the infrastructure layer to invert dependencies (Dependency Inversion Principle).
