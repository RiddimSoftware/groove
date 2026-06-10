# Chapter 28: The Test Boundary

## Core Principles
- **Tests Are Part of the System:** Tests participate in the architecture just like any other component. They are the outermost circle.
- **Design for Testability:** Tests that are not well integrated into the design of the system tend to be fragile, and they make the system rigid.
- **The Fragile Tests Problem:** When tests are strongly coupled to the system (e.g., through the GUI or database), trivial changes break thousands of tests, leading developers to resist making changes.
- **The Testing API:** Create a specific API that tests can use to verify business rules independently of the UI and database.

## Enforceable Rules
- Core business rules must be testable without the UI, database, or network.
- Tests must not depend on volatile elements of the system.

## Review Questions
- If the layout of the login screen changes, do the tests for the core order processing logic break?
- Is there a testing API that allows us to bypass the GUI to test the business rules directly?

## Examples
### Violation
- A suite of end-to-end tests that verify business logic by using Selenium to click through the UI, making the tests extremely slow and brittle.
### Good Implementation
- Unit tests that instantiate the `UseCaseInteractor` directly, passing in a mock `DatabaseGateway` and verifying the output sent to the `PresenterBoundary`.

## Implications
### For Agents
- Agents must focus on creating isolated unit tests for business logic, mocking out the external layers, rather than relying solely on integration tests.
### For Tickets/PRs/CI
- The architecture scorecard requires "Isolated unit tests" for business rules. PRs that rely on heavy integration tests to verify simple domain logic should be refactored.
