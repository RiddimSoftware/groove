# Chapter 32: Frameworks Are Details

## Core Principles
- **Asymmetric Marriage:** When you use a framework, you make a huge commitment to it, but the framework author makes no commitment to you.
- **Use, Don't Marry:** Keep frameworks at arm's length. Treat them as details in the outermost circles of the architecture.

## Enforceable Rules
- Do not let frameworks into your core code. Do not derive your business objects from framework base classes.
- Use dependency injection frameworks (like Spring) only in the `Main` component or configuration layers, not scattered throughout the business objects with annotations.

## Review Questions
- Are our core entities extending a framework's base class?
- How much effort would it take to swap out our current web or DI framework?

## Examples
### Violation
- Sprinkling `@Autowired` or `@Inject` annotations across every domain and application class.
### Good Implementation
- Using constructor injection for all dependencies in the domain, and configuring the DI framework entirely within the `Main` component to wire the application together.

## Implications
### For Agents
- Agents should avoid defaulting to framework-specific solutions for core business problems. They should use standard language features (POJOs/structs) in the inner layers.
### For Tickets/PRs/CI
- When a new framework is proposed, the team should design adapters to keep the framework contained, rather than allowing it to become a pervasive dependency.
