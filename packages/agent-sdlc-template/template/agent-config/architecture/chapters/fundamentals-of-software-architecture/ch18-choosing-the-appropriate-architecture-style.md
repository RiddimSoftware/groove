# Chapter 18: Choosing the Appropriate Architecture Style

## Core Principles
- "It depends." Architecture style is the output of analyzing **architecture characteristics + domain + data + design philosophy + organizational factors** — not a default and not a fashion choice.
- Architecture **fashion shifts** for real reasons: observations from past pain, ecosystem changes, new capabilities, accelerating change, domain change, technology change, external factors. Architects must track trends without being captured by them.
- The architect's first determinations are: **monolith vs distributed** (does the system need one set of characteristics or many?), **where data lives**, and **synchronous vs asynchronous communication**. Default to synchronous, go asynchronous only when necessary.
- **Domain / Architecture Isomorphism**: pick the style whose topology matches the shape of the problem. Customizability → microkernel. Discrete parallel work → space-based. Highly decoupled bounded contexts with different operational profiles → microservices. Tightly coupled multi-step forms → service-based, not microservices.
- The output of style selection is three concrete artifacts: a **topology**, **Architecture Decision Records** for the hardest decisions, and **fitness functions** that protect the architecture's important characteristics over time.
- More than one style can be correct. The Silicon Sandwiches case shows both a **modular monolith** and a **microkernel** are valid for the same kata; the choice is driven by how much customization variability the architect expects. The Going-Going-Gone case ends up as **microservices + event-driven hybrid** because different parts need genuinely different architecture characteristics.

## Enforceable Rules
- A proposed architecture must name its style (or hybrid), list the architecture characteristics it optimizes for, and name what it sacrifices.
- A proposed architecture must justify monolith vs distributed using quantum analysis, not preference.
- Synchronous is the default; every asynchronous boundary must be justified.
- Every important architectural decision is captured in an ADR; every important architectural characteristic is protected by a fitness function.

## Review Questions
- Which style (or hybrid) is this, and why this style for this domain?
- Which architecture characteristics did we deliberately optimize for, and which did we deliberately sacrifice?
- Does the topology match the shape of the domain (domain/architecture isomorphism), or are we forcing a fashionable style onto a poorly matched problem?
- Where are the ADRs and fitness functions for this decision?

## Examples
### Violation
- A team picks microservices because it's the modern default. The domain is a tightly coupled multi-page insurance form with strong semantic coupling between pages. Synchronous chatter and shared concepts dominate. The team spends six months fighting distributed transactions.
### Good Implementation
- Silicon Sandwiches: a small budget, single-quantum app with customizability needs. The architect picks a modular monolith for cost, but designs domain components and table groupings that could later migrate to distributed, and uses a microkernel pattern (with a BFF adaptor) where customizability is the dominant concern. The decision is captured in an ADR with explicit trade-offs.

## Implications
### For Agents
- When asked to propose an architecture, agents must explicitly list the styles considered, the characteristics each optimizes for, and why the chosen style fits the domain. Default to the simplest style that meets the requirements. Resist the urge to reach for microservices, event-driven, or space-based when a modular monolith, layered, microkernel, or service-based fits. Always write an ADR for the choice and propose fitness functions to protect it.
### For Tickets/PRs/CI
- Tickets that touch architectural boundaries must reference the ADR they implement or amend. PRs that introduce a new architecture style or hybrid require an ADR. CI must run fitness functions (e.g., dependency-direction checks, deploy-independence checks, latency budgets) so that the chosen architecture stays the actual architecture over time.
