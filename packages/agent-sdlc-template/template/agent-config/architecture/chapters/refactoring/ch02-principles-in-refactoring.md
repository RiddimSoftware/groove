# Chapter 2: Principles in Refactoring

## Summary
This chapter defines refactoring formally, explains why it should be done, when it should be done, and discusses the challenges and misconceptions surrounding the practice.

## Core Definitions
- **Refactoring (noun):** A change made to the internal structure of software to make it easier to understand and cheaper to modify without changing its observable behavior.
- **Refactoring (verb):** To restructure software by applying a series of refactorings without changing its observable behavior.

## The Two Hats
Software development involves switching between two distinct activities:
- **Adding Function:** Adding new capabilities and the tests that verify them.
- **Refactoring:** Restructuring existing code without adding new behavior, ensuring existing tests still pass.
*Never try to wear both hats at the same time.*

## Why Refactor?
1. **Improves Design:** Software entropy degrades design over time. Refactoring reverses this, preventing architectural decay.
2. **Makes Code Easier to Understand:** Code is read more often than it is written. Refactoring communicates intent clearly to future maintainers.
3. **Helps Find Bugs:** Clarifying the structure of the code often makes hidden bugs obvious.
4. **Helps Program Faster:** A good design allows for rapid addition of new features. A poor design slows development to a crawl.

## When Should You Refactor?
- **The Rule of Three:** The third time you write similar code, it's time to refactor.
- **When adding a function:** If the design makes it hard, refactor first to make it easy.
- **When fixing a bug:** Improve the code so the bug is obvious.
- **When doing a code review:** Collaborative refactoring is highly effective.

## Problems with Refactoring
- **Databases:** Changing database schemas is hard. Add a layer of software between the object model and the database to isolate changes.
- **Changing Interfaces:** When a method name changes and is used publicly, you cannot just change the declaration. You must retain the old interface and have it call the new one, marking the old one as deprecated.
- **When NOT to refactor:** If the code is so messy it's easier to rewrite from scratch, or if you are extremely close to a deadline.
