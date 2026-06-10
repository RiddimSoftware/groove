# Chapter 21: Screaming Architecture

## Core Principles
- **Theme of an Architecture:** The architecture of a software application should scream about the use cases of the application, not the frameworks used to build it.
- **Frameworks are Tools:** Frameworks are options to be left open. They should be used, not conformed to.
- **Testable Architecture:** If your architecture is centered on use cases, you should be able to unit-test all those use cases without any frameworks in place (no web server, no database).

## Enforceable Rules
- The top-level directory structure of a project should reflect the business domains and use cases, not the technical layers (e.g., `app/orders` instead of `app/controllers`).
- Core business logic must be testable without starting up external infrastructure.

## Review Questions
- When you look at the root directory of the project, do you know what the application does, or just what framework it uses?
- Can you run the core business tests in milliseconds without a database or network connection?

## Examples
### Violation
- A directory structure organized as `Controllers/`, `Models/`, `Views/`, hiding the actual purpose of the application behind technical concepts.
### Good Implementation
- A directory structure organized as `OrderManagement/`, `Billing/`, `UserProfiles/`, with controllers and databases hidden within or as plugins to those modules.

## Implications
### For Agents
- Agents should organize files by feature or domain concept, ensuring the structure communicates the business intent.
### For Tickets/PRs/CI
- Project initialization and scaffolding should prioritize domain folders over framework default structures.
