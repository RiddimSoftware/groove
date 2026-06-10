# Chapter 33: Case Study: Video Sales

## Core Principles
- **Actor-Based Partitioning:** The system is partitioned into components based on the actors (Single Responsibility Principle) so that changes requested by one actor do not affect others.
- **Dependency Rule Enforcement:** The architecture ensures that dependencies flow from lower-level details (Views, DB) toward higher-level policies (Use Cases, Entities).
- **Flexible Deployment:** By keeping components decoupled at the source level, the system can be deployed as a single monolith or broken into multiple deployable units (jars, services) as needed.

## Enforceable Rules
- Use-case analysis should drive the preliminary component architecture.
- Identify the primary actors and ensure their respective components do not tightly couple.

## Review Questions
- If the "Admin" actor requests a change to how videos are managed, does it risk breaking the "Viewer" actor's ability to stream videos?
- Can we easily combine or separate these components for deployment based on current operational needs?

## Examples
### Violation
- Mixing the code that handles adding new videos (Admin) with the code that streams videos (Viewer) in the same heavily coupled service.
### Good Implementation
- Separating Admin Interactors from Viewer Interactors, with both depending on the same underlying Video Entities, but deployed together initially.

## Implications
### For Agents
- Agents should use actors to identify axes of change and propose architectural boundaries based on those actors.
### For Tickets/PRs/CI
- The architecture scorecard should reflect whether different actors' use cases are sufficiently isolated.
