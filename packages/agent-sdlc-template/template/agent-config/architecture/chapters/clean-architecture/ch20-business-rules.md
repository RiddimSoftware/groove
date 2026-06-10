# Chapter 20: Business Rules

## Core Principles
- **Critical Business Rules:** Rules that make or save the business money, regardless of whether they are automated.
- **Critical Business Data:** The data required by the critical business rules.
- **Entities:** Objects that embody Critical Business Rules operating on Critical Business Data. They are independent of any other system concern.
- **Use Cases:** Application-specific business rules that orchestrate the flow of data to and from Entities to achieve a specific goal. They do not describe the UI.

## Enforceable Rules
- Entities must not have any dependencies on Use Cases, UI, Database, or any other framework.
- Use Cases must accept simple request data structures and return simple response data structures, without any dependencies on HTML, SQL, etc.

## Review Questions
- Does this Entity class contain any ORM annotations or web framework imports?
- Does this Use Case know whether the request came from a web page or a mobile app?

## Examples
### Violation
- A `Customer` entity that extends a `Model` class from a database framework, tying the business concept to a persistence mechanism.
### Good Implementation
- A pure `Customer` class (POJO/struct) that encapsulates loan calculation rules, manipulated by a `CreateLoan` use case that takes a simple `LoanRequest` struct.

## Implications
### For Agents
- Agents must cleanly separate Entities (pure domain logic) from Use Cases (orchestration) when building features.
### For Tickets/PRs/CI
- Tickets defining new features should be framed as Use Cases with clear request/response models, rather than "add this screen" or "add this table".
