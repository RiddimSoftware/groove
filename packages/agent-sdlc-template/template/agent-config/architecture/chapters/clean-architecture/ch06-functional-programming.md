# Chapter 6: Functional Programming

## Core Principles
- Functional programming is based on the lambda-calculus, where variables *do not vary* (immutability).
- Immutability is a critical architectural consideration: all concurrency problems (race conditions, deadlocks, concurrent updates) cannot happen if there are no mutable variables.
- Segregation of Mutability: Applications should be segregated into mutable and immutable components. As much processing as possible should be pushed into the immutable components.
- Event Sourcing: A strategy where transactions (events) are stored instead of state. State is computed from the events. This approach requires no mutable variables in the data store (making it CRUD-less; only Create and Read).

## Enforceable Rules
- Minimize and segregate mutable state.
- Protect any necessary mutable state using transactional memory or strict concurrency controls.
- Prefer immutable data structures and pure functions.

## Review Questions
- Can this mutable variable or state be made immutable?
- Is the mutable state strictly segregated from the rest of the application?
- Are we exposed to concurrency or multi-threading issues because of shared mutable state?

## Examples
### Violation
- Using shared, mutable variables (e.g., a global counter or a shared object instance) across multiple threads without protection, leading to unpredictable race conditions and deadlocks.
### Good Implementation
- A pure functional core calculates the new state based on inputs and returns a new object rather than modifying the old one. A thin, explicitly protected mutable shell (like a transactional atom or an Event Sourced database) handles the actual state transition safely.

## Implications
### For Agents
- When generating code, Agents should default to immutable data structures (e.g., returning new objects/arrays rather than modifying in place) and write pure functions. Side-effects must be isolated and minimized.
### For Tickets/PRs/CI
- Linters should be configured to encourage `const`, `readonly`, or `final` declarations. PR reviewers should aggressively question the introduction of any new mutable state and ensure it is thread-safe.
