# Chapter 19: Policy and Level

## Core Principles
- **Policy:** A computer program is a detailed description of the policy by which inputs are transformed into outputs.
- **Level:** Defined as the distance from the inputs and outputs. The farther a policy is from both the inputs and the outputs, the higher its level.
- **Dependency Direction:** Source code dependencies should be decoupled from data flow and should always point toward higher-level policies.

## Enforceable Rules
- High-level policies (business rules) must not depend on lower-level policies (I/O, UI, DB).
- Policies that change for different reasons or at different times should be separated into different components.

## Review Questions
- Does this core business logic depend on a specific input/output mechanism (like reading from `System.in` or a specific file path)?
- Is data flow inadvertently dictating the source code dependencies?

## Examples
### Violation
- An `Encryption` function that calls `ReadFromConsole()` and `WriteToDisk()`, tying the high-level encryption policy directly to specific, low-level I/O.
### Good Implementation
- An `Encryption` class that depends on a `Reader` interface and a `Writer` interface. The implementations for console and disk are passed in via dependency injection.

## Implications
### For Agents
- Agents must abstract I/O operations behind interfaces when implementing core logic to ensure the policy remains high-level and testable.
### For Tickets/PRs/CI
- PRs should be reviewed to ensure that high-level modules are insulated from changes in low-level details.
