# Chapter 3: Paradigm Overview

## Core Principles
- Programming paradigms are ways of programming that tell us what *not* to do; they impose discipline and remove capabilities rather than adding them.
- **Structured Programming:** Imposes discipline on direct transfer of control (removes `goto`).
- **Object-Oriented Programming (OOP):** Imposes discipline on indirect transfer of control (removes ad-hoc function pointers, replaces with safe polymorphism).
- **Functional Programming:** Imposes discipline upon assignment (removes variable mutation).
- These three paradigms align perfectly with the three big concerns of architecture: function, separation of components, and data management.

## Enforceable Rules
- Do not use unrestrained jumps (`goto` statements or their modern equivalents).
- Use safe polymorphism as the mechanism to cross architectural boundaries.
- Restrict and discipline variable assignment/mutability.

## Review Questions
- Does the code avoid direct, unstructured transfers of control?
- Are architectural boundaries crossed using safe polymorphism instead of hard-coded dependencies or raw function pointers?
- Is mutability minimized or strictly isolated?

## Examples
### Violation
- Using global mutable state that is accessed and modified by multiple disparate components, coupled with complex control flows that jump unpredictably across the module.
### Good Implementation
- Utilizing structured programming for algorithmic foundations within modules, using OOP polymorphism to cleanly separate components, and leveraging functional programming concepts to manage and isolate data mutability.

## Implications
### For Agents
- Agents must leverage these three paradigms correctly: build clear algorithms with structured programming, decouple components using OOP polymorphism, and manage state safely by adhering to functional programming principles (immutability).
### For Tickets/PRs/CI
- Linters should be configured to enforce structured flow (no `goto`), discourage unnecessary mutability, and verify that dependencies between modules are inverted via polymorphism where appropriate.
