# Chapter 6: The Life Cycle of a Domain Object

## Overview
This chapter explains how to manage the complexity of creating, modifying, and storing domain objects. It introduces three key patterns: Aggregates, Factories, and Repositories.

## Key Concepts

### Aggregates
- An Aggregate is a cluster of associated objects that are treated as a single unit for the purpose of data changes.
- **Root Entity:** Each Aggregate has a single Root Entity. External objects are only allowed to hold references to the Root.
- **Invariants:** The Aggregate Root is responsible for maintaining the invariants (business rules) of the entire aggregate.
- **Transactions:** A single transaction should ideally only modify one Aggregate.

### Factories
- Creating complex objects or Aggregates can be complicated and distract from the object's core purpose.
- Factories encapsulate the knowledge of how to create a complex object or Aggregate, ensuring it is created in a valid state.
- They hide the complexity of creation and allow the client to request objects without knowing the details of their construction.

### Repositories
- Repositories provide a facade over the data access layer, making it look like an in-memory collection of Aggregates.
- They encapsulate the logic required to access data sources (databases, APIs).
- **Rule:** Repositories should only be created for Aggregate Roots. You do not query for the internal parts of an Aggregate directly; you load the entire Aggregate through the Repository.

## Application
- Design Aggregates carefully. Make them as small as possible while still enforcing invariants.
- If creating an object involves complex logic or assembling multiple parts, use a Factory.
- Use Repositories to hide SQL or ORM specifics from the domain layer. Focus on the domain language (e.g., `findActiveCustomers()` instead of `select * from users where status = 'active'`).
