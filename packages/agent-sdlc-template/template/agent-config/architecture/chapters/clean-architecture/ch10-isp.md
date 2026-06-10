# Chapter 10: ISP: The Interface Segregation Principle

## Core Principles
- Do not force users of a component to depend on things they don't need.
- It is harmful to depend on modules that contain more than you need, as it causes unnecessary recompilations and coupling.

## Enforceable Rules
- Interfaces should be finely grained and client-specific.
- Classes should not implement methods they do not use (e.g., returning null or throwing exceptions just to satisfy a fat interface).

## Review Questions
- Are we importing a massive framework or class just to use a single utility method?
- Does this interface have methods that the current caller ignores or leaves blank?

## Examples
### Violation
An `OPS` class with operations `op1`, `op2`, and `op3` used by `User1`, `User2`, and `User3` respectively. A change to `op2` forces `User1` to be recompiled and redeployed, even though `User1` doesn't care about `op2`.
### Good Implementation
Segregating the operations into smaller interfaces like `U1Ops`, `U2Ops`, and `U3Ops`. `User1` depends only on `U1Ops`. Changes to the other operations have no impact on `User1`.

## Implications
### For Agents
- When defining interfaces for new modules at Riddim Software, AI agents should scope them specifically to the client's needs rather than creating large "God interfaces."
### For Tickets/PRs/CI
- Large, monolithic interfaces modified in a PR should be a red flag. Bots or human reviewers should suggest breaking them down into smaller, role-specific interfaces.