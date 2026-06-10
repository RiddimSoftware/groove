# Chapter 5: Identifying Architectural Characteristics

## Core Principles
- Architecture Characteristics are extracted from three sources: **domain concerns**, **explicit requirements**, and **implicit domain knowledge**. Stakeholders speak in business outcomes ("time to market," "user satisfaction," "M&A"); the architect translates these into characteristics (agility = testability + deployability + agility; user satisfaction = performance + availability + fault tolerance + ...).
- Architects must keep the final list **short**. The Vasa anti-pattern: a 1628 warship over-specified to be both troop transport *and* gunship with double the decks and cannons — it capsized on its maiden voyage. Over-specifying characteristics is how systems sink.
- Don't try to rank-order every characteristic — stakeholders rarely agree. Instead ask them to pick the **top three** (unordered). This is achievable, generates the right conversations, and gives the architect leverage when trade-offs hit.
- Distinguish **explicit** (stated in requirements — e.g. "thousands of users → scalability") from **implicit** (inferred from domain — e.g. "sandwich shop traffic is bursty around mealtimes → elasticity"). Both count; neither is sufficient alone.
- Silicon Sandwiches case study: same set of requirements yields scalability + elasticity + performance + availability + reliability + security + customizability — but the architect's *first* job is to ask which of those can be dropped or implemented at the design layer rather than the architecture layer.
- "There are no wrong answers in architecture, only expensive ones." Guidance: aim for roughly **7 or fewer** driving characteristics; more than that is almost certainly over-specification.

## Enforceable Rules
- Every system has a short list of named Architecture Characteristics. If a PR claims to protect or improve a characteristic, that characteristic must be on the list — or the list must be amended with rationale.
- For any characteristic claimed, the team must be able to point to where it came from (requirement, domain knowledge, or implicit-but-acknowledged).
- When tempted to add a characteristic, first ask: *can the design layer handle this instead of the architecture layer?*

## Review Questions
- Is this change protecting a characteristic that is on the system's short list, or has someone added a new one informally?
- Did the requirement actually demand structural support, or could a design pattern (Template Method, Strategy) satisfy it inside the existing architecture?
- Which characteristic, if any, did this change quietly downgrade?
- If we were forced to drop one characteristic from this list today, which would it be? Why isn't *that* the one we just dropped?

## Examples
### Violation
- A ticket reads "Build the integration to support extensibility, portability, internationalization, and configurability." The team builds plugin infrastructure, an i18n framework, a portability abstraction, and a config DSL up front — and ships nothing useful for six months.
### Good Implementation
- The team identifies the top three (scalability, customizability, performance), notes implicit ones (availability, reliability, security), and explicitly defers internationalization to a *design-layer* solution (string tables) rather than baking it into the architecture.

## Implications
### For Agents
- When given a vague spec, do not silently invent characteristics to "do it right." Surface the inferred characteristics back to the human, mark them as explicit/implicit, and ask which top three to prioritize. When reviewing, flag PRs that add complexity in service of a characteristic the project never claimed.
### For Tickets/PRs/CI
- Each repo's CLAUDE.md / AGENTS.md should declare the system's top three Architecture Characteristics. Tickets should reference one of them when justifying structural complexity. PR descriptions should name the characteristic served; reviewers reject changes that add structural cost for characteristics not on the list.
