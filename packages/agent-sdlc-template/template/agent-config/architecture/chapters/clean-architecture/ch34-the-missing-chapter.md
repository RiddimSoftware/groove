# Chapter 34: The Missing Chapter

## Core Principles
- **The Devil is in the Implementation Details:** Even with good architectural intentions, poor implementation choices (like improper access modifiers) can ruin the architecture.
- **Package by Layer:** Horizontal layering based on technical concern (web, domain, data). Simple, but doesn't scream architecture and can lead to dependency bypasses.
- **Package by Feature:** Vertical slicing based on domain concept. Screams architecture but can still suffer from poor encapsulation.
- **Ports and Adapters:** Domain inside, infrastructure outside.
- **Package by Component:** Bundles related functionality behind a clean interface. Business logic is separate from data persistence, but both reside within the same component, allowing the use of language access modifiers (like package-private) to enforce encapsulation.

## Enforceable Rules
- Use compiler access modifiers (e.g., `package-private`, `internal`) to enforce architectural boundaries. Do not make everything `public` by default.
- Choose a code organization strategy (like Package by Component) that allows the compiler to prevent unwanted dependencies.

## Review Questions
- Are we making classes `public` just because it's the default, even when they should be implementation details hidden within a component?
- Can a developer accidentally bypass the `Service` layer and access the `Repository` directly because both are `public`?

## Examples
### Violation
- A "relaxed layered architecture" where a Web Controller directly accesses a Database Repository, bypassing the business logic layer, because all classes are public.
### Good Implementation
- Using `package-private` (in Java) or `internal` (in C#) for the `Repository` implementation, ensuring it can only be accessed through the `Service` interface exposed by the component.

## Implications
### For Agents
- Agents must pay attention to access modifiers when generating code, restricting visibility as much as possible to enforce component boundaries.
### For Tickets/PRs/CI
- PRs should be rejected if they inappropriately widen the visibility of a class or method. CI should ideally use structural analysis tools to back up the compiler's access controls.
