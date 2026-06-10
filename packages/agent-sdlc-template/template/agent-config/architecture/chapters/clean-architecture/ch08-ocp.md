# Chapter 8: OCP: The Open-Closed Principle

## Core Principles
- A software artifact should be open for extension but closed for modification.
- The behavior of a system should be extendible without having to modify existing artifacts.
- Higher-level components should be protected from changes made to lower-level components.

## Enforceable Rules
- Dependencies must point toward higher-level policies (business rules).
- Lower-level details (UI, database, controllers) must depend on higher-level policies, not the other way around.
- Transitive dependencies that violate information hiding should be avoided.

## Review Questions
- If we need to add a new view or change the database, how many existing business logic classes need to be modified? (Ideally zero).
- Is the component structure organized into a hierarchy where core business rules are the most protected?

## Examples
### Violation
A `FinancialReportGenerator` calculating report data and directly formatting it into HTML for a web view. Adding a requirement to print the report as a PDF requires modifying the core `FinancialReportGenerator` class to add `if/else` logic for the PDF format.
### Good Implementation
The `FinancialReportGenerator` outputs a plain data structure (`FinancialReportResponse`). This data structure is then consumed by an interface, which has multiple implementations like `WebReporter` and `PrintReporter`. Adding a new format only requires adding a new reporter class, leaving the generator completely untouched.

## Implications
### For Agents
- When AI agents are asked to implement a new feature or output format at Riddim Software, they should prefer adding new code (classes, adapters, plugins) rather than modifying existing, stable business logic.
### For Tickets/PRs/CI
- CI pipelines can enforce architectural boundaries (e.g., using ArchUnit) to ensure that the core domain logic has no inbound source code dependencies from the web or infrastructure layers.