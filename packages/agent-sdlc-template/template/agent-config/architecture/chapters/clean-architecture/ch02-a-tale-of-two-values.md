# Chapter 2: A Tale of Two Values

## Core Principles
- Software provides two values to stakeholders: behavior (making the machine work) and architecture/structure (making the software easy to change).
- Software was invented to be "soft"—easy to change. The difficulty of making a change should be proportional only to the scope of the change, not its shape.
- Architecture is more important than behavior. A program that works perfectly but cannot be changed will become useless when requirements change. A program that doesn't work but is easy to change can be fixed and remain continually useful.
- Based on Eisenhower's Matrix: Behavior is usually urgent but not always important. Architecture is important but never urgent.
- The development team must assert the importance of architecture over the urgency of features.

## Enforceable Rules
- The architecture must remain shape-agnostic. Changes to the system should not feel like forcing square pegs into round holes.
- Do not let the urgency of a feature override the importance of maintaining a clean architecture.

## Review Questions
- Is this change making the system harder to modify in the future?
- Are we prioritizing urgent but unimportant behavior over important architectural flexibility?
- Did the team actively "fight for the architecture" in this implementation, or did they succumb to stakeholder pressure for a quick fix?

## Examples
### Violation
- A business manager demands an urgent change. The developer implements it by hardcoding assumptions directly into the core logic. When the manager later asks for a variation, the cost of the change is prohibitively high because the architecture was compromised.
### Good Implementation
- A developer is asked for an urgent feature. The developer takes the time to create an abstraction that separates the new feature from the core logic, ensuring that when the business inevitably changes its mind, the modification will be simple and isolated.

## Implications
### For Agents
- When generating code or suggesting fixes, Agents should actively prioritize the "softness" (changeability) of the codebase. They must not blindly implement a feature if the implementation compromises the structural integrity of the application.
### For Tickets/PRs/CI
- Tickets should explicitly balance feature delivery with architectural health. 
- PR reviewers (both human and bot) should push back on changes that degrade changeability, even if the change fulfills the immediate behavioral requirement.
