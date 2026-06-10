# Chapter 4: Structured Programming

## Core Principles
- Structured programming was discovered by Edsger Wybe Dijkstra, who sought to apply mathematical proofs to software.
- All programs can be constructed from just three basic control structures: sequence, selection (`if/then/else`), and iteration (`do/while`).
- Unrestrained jumps (`goto` statements) prevent modules from being decomposed recursively into smaller, provable units.
- Software development is like a science: we cannot prove a program is absolutely correct; we can only show its correctness by failing to prove it incorrect via testing.
- Structured programming allows modules to be recursively decomposed into small, falsifiable (testable) units.

## Enforceable Rules
- All code must be functionally decomposable into smaller, testable units.
- Restrict control structures to sequence, selection, and iteration.

## Review Questions
- Is this function small and focused enough to be easily tested?
- Are there sufficient tests in place to attempt to prove the functions incorrect?
- Is the control flow clear, avoiding complex or unstructured jumps?

## Examples
### Violation
- A massive, monolithic function that spans hundreds of lines, using multiple `break`, `continue`, or exception throws as pseudo-`goto`s to manage complex internal state, making it virtually impossible to test all paths.
### Good Implementation
- A large problem is decomposed into high-level functions, which are recursively broken down into tiny, provable functions using only simple loops and conditionals. Comprehensive unit tests are written to verify each small function.

## Implications
### For Agents
- Agents must break down complex logic into small, testable functions using standard control structures. Generating large blocks of unstructured, untestable code is unacceptable. Agents must also generate tests designed to falsify these functions.
### For Tickets/PRs/CI
- PRs must contain small, easily understandable, and testable functions.
- CI must enforce automated test execution, as tests are the scientific method by which we gain confidence in the structured code.
