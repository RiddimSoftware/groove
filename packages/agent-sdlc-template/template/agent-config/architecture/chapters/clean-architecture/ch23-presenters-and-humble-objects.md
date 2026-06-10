# Chapter 23: Presenters and Humble Objects

## Core Principles
- **The Humble Object Pattern:** A design pattern used to separate hard-to-test behaviors from testable behaviors by splitting them into two classes. The hard-to-test part is "humble" and stripped to its barest essence.
- **Presenters and Views:** The View is the humble object (hard to test because of UI frameworks). The Presenter is the testable object that formats data for the View.
- **Database Gateways:** Gateways are polymorphic interfaces. The implementation (the humble object) contains the SQL and framework code. The interactors (Use Cases) use the interface.

## Enforceable Rules
- UI frameworks must not contain any data formatting or business logic; they should only render data from a simple data structure (e.g., a `ViewModel`).
- Core business logic must never contain SQL or ORM calls; these must be hidden behind gateway interfaces.

## Review Questions
- Does this UI view class contain if/else statements that format dates or currency?
- Can the formatting logic for this screen be tested without starting up the UI framework?

## Examples
### Violation
- A UI component that takes a `Date` object and formats it into a string before rendering it.
### Good Implementation
- A `Presenter` formats the `Date` into a string and places it in a `ViewModel`. The UI component just reads the string from the `ViewModel`.

## Implications
### For Agents
- When tasked with adding a new UI element, agents should implement the logic in a Presenter and ensure the View only renders the result.
### For Tickets/PRs/CI
- PRs introducing complex logic in View classes should be rejected. Testing should focus heavily on the Presenters and Interactors, not the Views.
