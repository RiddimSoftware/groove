# Chapter 6: Measuring and Governing Architecture Characteristics

## Core Principles
- The three problems with characteristics in most orgs: **(1)** they aren't physics (vague meanings), **(2)** wildly varying definitions across teams, **(3)** too composite (agility = modularity + deployability + testability + ...). The fix is **objective definitions** so the org shares a ubiquitous language.
- Measures fall into three categories: **Operational** (response time percentiles, scalability statistical models, first-contentful-paint budgets, K-weight page budgets), **Structural** (cyclomatic complexity, LCOM, distance from the main sequence, cyclic dependencies), and **Process** (test coverage, deployment success rate, deployment lead time).
- **Governance** is the architect steering — ensuring the agreed characteristics actually hold over time. The centerpiece tool is the **Fitness Function**.
- **Architecture Fitness Function**: *any mechanism that provides an objective integrity assessment of some Architecture Characteristic or combination of characteristics.* Not a framework — a perspective on existing tools (unit tests, monitors, chaos engineering, metrics, ArchUnit, JDepend, NetArchTest, the Simian Army).
- Fitness functions are classified along multiple axes: **atomic vs holistic**, **triggered vs continual**, **static vs dynamic**, **automated vs manual**, **temporal** (time-bounded checks). Most useful are *automated + triggered* — they belong in CI.
- Cyclomatic Complexity (CC = E − N + 2): industry says <10 is acceptable; the book recommends <5. TDD has the side effect of producing lower-CC code.
- Concrete fitness-function examples: **cyclic-dependency detection** (JDepend `containsCycles()`), **distance from main sequence** thresholds, **layer governance** (ArchUnit `layeredArchitecture()`, NetArchTest), **conformity / security / janitor monkeys** in production.
- Fitness functions are a **checklist** in Gawande's sense — not a heavyweight police mechanism, but a reminder for things that are *important but not urgent*.

## Enforceable Rules
- Any Architecture Characteristic on the system's top list must have at least one fitness function. An unmeasured characteristic is not really supported.
- Cyclic dependencies between packages/modules are a build failure, not a warning.
- Layer / partition rules (presentation can't call persistence directly, etc.) are enforced by an automated test (ArchUnit, NetArchTest, dependency-cruiser, custom script) — not by code review hope.
- Fitness functions must be readable by developers; "ivory tower" rules whose intent nobody understands get deleted, not maintained.

## Review Questions
- Does this PR add or change behavior that a fitness function should have caught? If no fitness function exists for that characteristic, is the gap acceptable?
- Has cyclomatic complexity in touched files crossed a threshold worth flagging?
- Did this change introduce a cycle between packages/modules?
- Are layer / partition boundaries still respected, and is there a test that proves it?

## Examples
### Violation
- A new dependency arrow is added from a `web` package to a `persistence` package, skipping `service`. Reviewer approves because "the test passes" — but no fitness function checks the layer rule, so the violation lands and rots the architecture over months.
### Good Implementation
- A CI step runs `ArchUnit.layeredArchitecture()` (or its language-equivalent) on every PR; the dependency arrow is rejected before merge, with an explicit message naming the layer rule and the ADR that defined it.

## Implications
### For Agents
- When generating new code that touches architectural boundaries (layers, modules, services), check for an existing fitness function and respect it. When reviewing, ask whether the change *should* have triggered a fitness function — if it should have but didn't, recommend adding one rather than just blocking the PR. Treat fitness functions as the *primary* governance tool; code review is the secondary safety net.
### For Tickets/PRs/CI
- CI runs fitness functions on every PR — cyclic-dependency checks, layer enforcement, complexity thresholds, and any custom rules tied to the system's top characteristics. New architecture tickets include a "fitness function to add" subtask when they introduce a characteristic that isn't yet measured. Failing fitness functions block merge.
