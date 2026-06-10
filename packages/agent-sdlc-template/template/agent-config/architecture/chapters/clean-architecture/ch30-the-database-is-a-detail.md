# Chapter 30: The Database Is a Detail

## Core Principles
- **Data vs. Database:** The data model (the structure of the data within the application) is highly significant. The database (the technology used to store and retrieve that data) is a low-level detail.
- **Performance vs. Architecture:** Getting data in and out quickly is a performance concern, which is addressed with low-level data access mechanisms, not overall architecture.

## Enforceable Rules
- The application architecture must not be dictated by the relational structure of the tables or the specific database technology (SQL, NoSQL, flat file) being used.
- Business rules should be written to manipulate simple data structures, completely oblivious to how those structures are persisted.

## Review Questions
- Are database concepts like "foreign keys" or "row IDs" leaking into the domain models?
- If we changed from PostgreSQL to MongoDB, how much of the application layer would break?

## Examples
### Violation
- Having the domain `User` entity inherit from an `ActiveRecord` base class provided by an ORM.
### Good Implementation
- Using a Data Mapper pattern where a repository interface is implemented by a class that uses the ORM, translating database rows into pure `User` domain entities.

## Implications
### For Agents
- Agents should avoid letting database schema design drive the application design. Start with the domain entities and use cases first.
### For Tickets/PRs/CI
- Tickets that mandate a specific database technology for a new feature should be challenged to ensure the core logic is kept agnostic.
