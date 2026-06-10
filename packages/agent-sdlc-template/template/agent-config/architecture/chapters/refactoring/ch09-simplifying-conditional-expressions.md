# Chapter 9: Simplifying Conditional Expressions

## Summary
Conditional logic is often the most complex part of a program. This chapter focuses on making conditionals clearer and replacing complex switch statements with polymorphism.

## Key Refactorings

### Decompose Conditional
- **Problem:** You have a complicated conditional (`if-then-else`) statement.
- **Solution:** Extract the condition, the "then" part, and the "else" part into well-named methods.

### Consolidate Conditional Expression
- **Problem:** You have a sequence of conditional tests with the same result.
- **Solution:** Combine them into a single conditional expression and extract it into a method.

### Consolidate Duplicate Conditional Fragments
- **Problem:** The same fragment of code is in all branches of a conditional expression.
- **Solution:** Move it outside the expression.

### Remove Control Flag
- **Problem:** You have a variable that is acting as a control flag for a series of boolean expressions.
- **Solution:** Use a `break` or `return` instead.

### Replace Nested Conditional with Guard Clauses
- **Problem:** A method has conditional behavior that does not make clear what the normal path of execution is.
- **Solution:** Use guard clauses for all the special cases. (Fail fast and return early).

### Replace Conditional with Polymorphism
- **Problem:** You have a conditional that chooses different behavior depending on the type of an object.
- **Solution:** Move each leg of the conditional to an overriding method in a subclass. Make the original method abstract.

### Introduce Null Object
- **Problem:** You have repeated checks for a null value.
- **Solution:** Replace the null value with a null object that provides the default "do nothing" behavior.

### Introduce Assertion
- **Problem:** A section of code assumes something about the state of the program.
- **Solution:** Make the assumption explicit with an assertion.
