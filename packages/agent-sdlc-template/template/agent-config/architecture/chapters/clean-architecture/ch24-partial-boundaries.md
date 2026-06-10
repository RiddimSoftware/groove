# Chapter 24: Partial Boundaries

## Core Principles
- **Expense of Boundaries:** Full-fledged architectural boundaries are expensive to create and maintain (requiring polymorphic interfaces, data structures, and dependency management).
- **Anticipatory Design:** Sometimes an architect might judge the expense of a full boundary too high but still want to hold a place for it using a partial boundary.
- **Strategies:**
    - **Skip the Last Step:** Do all the work to create independently deployable components, but deploy them as a single component.
    - **One-Dimensional Boundaries:** Use the Strategy pattern to invert dependencies without maintaining reciprocal interfaces (sacrificing some isolation).
    - **Facades:** Use a Facade class to deploy service calls. (Simplest, but sacrifices dependency inversion).

## Enforceable Rules
- When implementing a partial boundary, the team must explicitly document that it is a partial boundary and understand the trade-offs being made (e.g., potential for backchannels).

## Review Questions
- Is a full boundary really necessary here, or would a partial boundary suffice for now?
- If we are using a Facade, are we aware that clients are transitively dependent on all the services behind it?

## Examples
### Violation
- Implementing full reciprocal polymorphic interfaces for a feature that is highly unlikely to ever need to be swapped out or independently deployed, leading to over-engineering.
### Good Implementation
- Using a simple Strategy pattern interface to isolate a third-party analytics library, recognizing that while it's not a full, independently deployable component boundary, it prevents the library from polluting the core codebase.

## Implications
### For Agents
- Agents should balance the strictness of Clean Architecture with the pragmatic costs. They should use the `Architecture Impact` section in tickets to determine if a full or partial boundary is requested.
### For Tickets/PRs/CI
- Teams should use partial boundaries cautiously and explicitly agree on when a partial boundary is sufficient to avoid unnecessary overhead.
