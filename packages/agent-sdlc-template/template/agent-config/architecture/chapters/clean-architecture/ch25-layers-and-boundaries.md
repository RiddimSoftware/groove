# Chapter 25: Layers and Boundaries

## Core Principles
- **Beyond Three Layers:** Systems are rarely as simple as UI, Business Rules, and Database.
- **Multiple Axes of Change:** Architectural boundaries exist wherever there is an axis of change.
- **Splitting Streams:** Data flows often split into multiple streams (e.g., network, data storage, different UI languages) that all must be managed and bounded appropriately.

## Enforceable Rules
- Identify all axes of change (e.g., language translation, delivery mechanism, persistence) and abstract them if they change independently of the core rules.
- Do not assume that a single boundary is enough for complex systems; boundaries may need to exist within layers.

## Review Questions
- Are there hidden axes of change within this component that haven't been bounded? (e.g., Does our game logic know about both English strings and SMS delivery?)
- Is the cost of adding a boundary here less than the cost of ignoring it?

## Examples
### Violation
- A single "Infrastructure" layer that tangles database access, network communication, and third-party API integrations together.
### Good Implementation
- Separating "Data Storage" (Database) from "Text Delivery" (SMS/Console) from "Language" (English/Spanish) using distinct APIs, even if they all technically reside outside the core business rules.

## Implications
### For Agents
- Agents must look beyond the standard "Clean Architecture" concentric circles diagram and identify specific boundaries needed for the system at hand based on what changes together.
### For Tickets/PRs/CI
- Architectural reviews (via the `arch-team` skill) should watch for missing boundaries where friction is occurring, proposing new interfaces right at the inflection point where ignoring the boundary becomes too costly.
