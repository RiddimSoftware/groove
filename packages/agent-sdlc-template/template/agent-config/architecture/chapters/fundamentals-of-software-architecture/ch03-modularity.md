# Chapter 3: Modularity

## Core Principles
- Modularity is an *organizing principle*. Software tends toward entropy; preserving modular distinction requires constant energy. Good modularity is almost always an implicit Architecture Characteristic — never stated in requirements, yet required for survival.
- **Cohesion** measures how related a module's parts are. The Chidamber-Kemerer **Lack of Cohesion in Methods (LCOM)** metric exposes incidental coupling: high LCOM means the methods and fields of a class do not share state and could be split.
- **Coupling** is measured directionally: **afferent coupling (Ca)** is incoming references, **efferent coupling (Ce)** is outgoing references. Derived metrics: **Abstractness A = abstract artifacts / total artifacts**, **Instability I = Ce / (Ce + Ca)**, **Distance from the Main Sequence D = |A + I − 1|**. High D in the upper-right is the **zone of uselessness** (over-abstract, unused); high D in the lower-left is the **zone of pain** (concrete, heavily coupled, brittle).
- **Connascence** (Page-Jones) refines coupling by asking *how* things are coupled. Two components are connascent if a change to one forces a change to the other. **Static** forms (best→worst): Name (CoN), Type (CoT), Meaning/Convention (CoM/CoC), Position (CoP), Algorithm (CoA). **Dynamic** forms: Execution (CoE), Timing (CoT), Value (CoV), Identity (CoI).
- Page-Jones / Weirich rules: **(1)** Minimize overall connascence; **(2)** minimize connascence that crosses encapsulation boundaries; **(3)** stronger forms are tolerable only when *local*. Rule of Degree: convert strong forms to weaker forms. Rule of Locality: as distance grows, the connascence must weaken.

## Enforceable Rules
- Replace magic values shared across modules (Connascence of Meaning) with named constants or shared types (Connascence of Name) — refactoring tools make CoN nearly free to maintain.
- Function signatures with more than ~3 positional parameters carry high Connascence of Position; prefer a named struct/object to convert CoP into CoN.
- Run a Distance-from-the-Main-Sequence check on packages; flag modules drifting into the zone of pain or zone of uselessness.
- Strong forms of connascence (Algorithm, Timing, Value, Identity) must not cross service or module boundaries.

## Review Questions
- If this change is made to module A, what other modules *must* also change to keep the system correct? Is that set of forced changes appropriate, or has connascence leaked across a boundary it shouldn't?
- Are these two modules drifting toward incidental coupling (low cohesion, high LCOM) — would splitting them reduce the surprise surface?
- Does this code introduce a stronger form of connascence (e.g. an algorithm two services must agree on) where a weaker form (e.g. a shared name or a single owner) would do?

## Examples
### Violation
- Client and server independently implement the same hashing algorithm to validate a token. Any change to the algorithm must land in both at the same time. This is Connascence of Algorithm across a service boundary — the worst static form at maximum distance.
### Good Implementation
- The hashing concern is owned by one library / one service; other components depend only on its *name* and an opaque return value. Static CoN, locally scoped — easily refactored.

## Implications
### For Agents
- When generating code, prefer named parameters over positional ones, named constants over literals, and a single owner for any algorithm two callers must agree on. When reviewing, flag duplicated logic across modules as connascence-of-algorithm even if the lines are short — it is the *forced co-change* that hurts, not the line count.
### For Tickets/PRs/CI
- Tickets that span more than one service or module should name the connascence being introduced and where it lives. CI should host structural fitness functions: package cyclic-dependency checks, LCOM thresholds for known-hot modules, and Distance-from-Main-Sequence reports for the components on each architecture's hot path.
