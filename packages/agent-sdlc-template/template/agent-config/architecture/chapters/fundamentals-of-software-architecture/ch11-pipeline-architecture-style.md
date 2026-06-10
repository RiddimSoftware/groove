# Chapter 11: Pipeline Architecture Style

## Core Principles
- The pipeline (pipes-and-filters) style composes work as a chain of small, single-purpose **filters** connected by unidirectional, point-to-point **pipes**. Composition over orchestration.
- Filters are **self-contained, independent, and generally stateless**. They do one thing. Composite work is a sequence of filters, never a single fat filter.
- Four filter types: **Producer** (source), **Transformer** (map), **Tester** (filter / reduce-style routing), **Consumer** (sink). Naming a filter by its type forces a single responsibility.
- The Unix shell is the canonical example. The McIlroy-vs-Knuth story (a six-stage shell pipeline beat 10 pages of Pascal) is the doctrine: small composable primitives outperform monolithic algorithms for many problems.
- Pipeline is monolithic — single deployment, single quantum. It buys modularity but **not scalability, elasticity, or fault tolerance**.

## When to Use
- ETL, EDI, MapReduce, telemetry processing, mediator/orchestrator workflows where data flows one-way through transformations.
- Problems naturally decomposable into ordered steps where each step is replaceable.
- Internal workflows where the team values modular composition over distributed scale.

## Characteristic Profile
- Strong on: simplicity, overall cost, modularity (better than layered).
- Weak on: scalability, elasticity, fault tolerance, performance (single-quantum monolith).

## Enforceable Rules
- Each filter must declare its type (producer / transformer / tester / consumer) and do exactly one thing. Mixing transformer + tester behavior in one filter is a smell.
- Pipes are unidirectional and point-to-point. No filter writes back to an upstream pipe. Side-channel coupling between filters is a violation.
- Filters must be stateless across invocations unless state is explicitly documented and justified.

## Review Questions
- Can I name this filter's single responsibility in one sentence? If not, split it.
- Could this filter be reordered, replaced, or removed without breaking adjacent filters' contracts?
- Are filters communicating only through their declared pipes, or is there hidden shared state?

## Examples
### Violation
- A single "ProcessEvent" filter parses input, applies business rules, makes a routing decision, and writes to two databases. It's a god filter, not a pipeline stage.
### Good Implementation
- A Kafka-fed pipeline: `ServiceInfoCapture` (producer) → `DurationFilter` (tester) → `DurationCalculator` (transformer) → `DatabaseOutput` (consumer). Adding a new metric is a new tester + transformer pair; no existing filter changes.

## Implications
### For Agents
- When generating data-processing code, prefer a sequence of named single-purpose functions/filters over one wide function. When reviewing, flag any filter that crosses type boundaries (e.g., a transformer that also writes to a database — that's a transformer + consumer pair).
### For Tickets/PRs/CI
- Tickets for new pipeline work should enumerate the filter chain by type. PRs adding a step should add or modify exactly one filter, not several. CI can enforce filter-type contracts (e.g., a transformer must return data; a consumer must not).
