# Chapter 9: LSP: The Liskov Substitution Principle

## Core Principles
- To build software systems from interchangeable parts, those parts must adhere to a contract that allows them to be substituted one for another.
- The behavior of a program using a base class/interface should not change when a derived class is substituted.

## Enforceable Rules
- No `instanceof` or type checking of subclasses within polymorphic functions.
- Derived classes must not throw unexpected exceptions (like `NotImplementedException`) for methods defined in their base interfaces.

## Review Questions
- Does the calling code need to know which specific implementation of an interface it is dealing with?
- Does a derived class restrict or violate the assumptions established by the base class?

## Examples
### Violation
A `Square` class inheriting from a `Rectangle` class. Since setting the width of a `Square` must also change its height, it violates the expectations of a user who thinks they are dealing with a standard `Rectangle` whose dimensions vary independently. Another violation is having a taxi dispatcher check `if (driver.getDispatchUri().startsWith("acme.com"))` to apply special logic for one provider.
### Good Implementation
A `License` interface with a `calcFee()` method. `PersonalLicense` and `BusinessLicense` both implement this interface with their own logic. The `Billing` application calls `calcFee()` without caring which type of license it is operating on.

## Implications
### For Agents
- Agents at Riddim Software must honor the complete contract of any interface they implement. They should not rely on caller-side hacks or `if/else` checks on types to bypass poor abstractions.
### For Tickets/PRs/CI
- PRs that introduce special-case handling for specific subclasses within generic polymorphic functions should be blocked by reviewers or bots.