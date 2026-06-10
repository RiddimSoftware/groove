# Chapter 7: SRP: The Single Responsibility Principle

## Core Principles
- A module should be responsible to one, and only one, actor.
- Cohesion is the force that binds together the code responsible to a single actor.
- Gathering things that change for the same reasons and separating things that change for different reasons.

## Enforceable Rules
- Classes must not mix business logic with UI rendering or database access logic.
- Methods within a class should primarily serve a single stakeholder or department (e.g., HR, Accounting, IT).

## Review Questions
- Who is the primary actor or stakeholder this module serves?
- If the requirements for one stakeholder change, will it accidentally impact code used by a different stakeholder?
- Are multiple actors frequently modifying this same source file for different reasons (causing merge conflicts)?

## Examples
### Violation
An `Employee` class that contains three methods: `calculatePay()` (used by Accounting), `reportHours()` (used by HR), and `save()` (used by DBAs). Modifying a shared helper function for Accounting might inadvertently break the HR reports.
### Good Implementation
Separating the data from the functions. Create a simple `EmployeeData` structure and three separate classes: `PayCalculator`, `HourReporter`, and `EmployeeSaver`. Each class is responsible to its respective actor and can be modified independently. A `Facade` can be used if you want to hide this complexity from clients.

## Implications
### For Agents
- When tasked with modifying functionality for a specific stakeholder at Riddim Software, AI agents must ensure they do not alter shared utility code that could affect other stakeholders. If shared code needs changing, extract it or copy it if the reasons for change are diverging.
### For Tickets/PRs/CI
- PRs should ideally only touch files related to the specific feature or actor requested. If a PR spans multiple unrelated domains or modifies a "god class," it should be flagged in code review for violating SRP.