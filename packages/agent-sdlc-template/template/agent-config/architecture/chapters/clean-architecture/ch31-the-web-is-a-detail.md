# Chapter 31: The Web Is a Detail

## Core Principles
- **The Web is an I/O Device:** The web is just a delivery mechanism. The application architecture should treat it as such and remain as ignorant as possible about how it will be delivered.
- **The Endless Pendulum:** Our industry constantly swings between thin clients (centralized power) and thick clients (distributed power). Good architecture abstracts away these delivery mechanisms to survive the pendulum swings.

## Enforceable Rules
- Business logic must not depend on web frameworks or web-specific data structures (like `HttpServletRequest` or `Session`).

## Review Questions
- Can the core application logic be executed via a command-line interface or a desktop application without changing the use cases?
- Are web routing attributes mixed into the business rules?

## Examples
### Violation
- A Use Case taking a raw HTTP request object, parsing the cookies to find the user ID, and then executing a business rule.
### Good Implementation
- A Web Controller parses the HTTP request, extracts the user ID into a simple string, and passes that string to a Use Case method.

## Implications
### For Agents
- When generating new features, agents must implement the core logic first, treating the web API or UI merely as a thin wrapper that delegates to the core.
### For Tickets/PRs/CI
- Architectural reviews must strictly prevent web framework concerns from polluting the application or domain layers.
