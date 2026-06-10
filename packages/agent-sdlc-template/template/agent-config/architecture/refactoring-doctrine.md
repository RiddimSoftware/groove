# Refactoring Doctrine

This doctrine establishes the foundational principles for executing refactoring tasks within this codebase, derived from Martin Fowler's "Refactoring: Improving the Design of Existing Code".

## 1. The Core Definition
**Refactoring (noun):** A change made to the internal structure of software to make it easier to understand and cheaper to modify without changing its observable behavior.
**Refactoring (verb):** To restructure software by applying a series of refactorings without changing its observable behavior.

## 2. The Two Hats
When developing software, you must clearly distinguish between adding features and refactoring. You cannot wear both hats at the same time:
- **Adding Function:** You add new tests, write new code to pass the tests. You do not change existing code.
- **Refactoring:** You do not add new functionality or new tests. You only restructure the code, keeping the existing tests passing.

## 3. The Rhythm of Refactoring
1. **Test:** Ensure you have a solid suite of tests for the section of code you are about to modify.
2. **Small Change:** Apply a single, atomic refactoring (e.g., Extract Method, Rename Variable).
3. **Test:** Run the tests immediately to verify that the observable behavior has not changed.
4. **Repeat.**

## 4. The Rule of Three
When should you refactor? Follow the Rule of Three:
1. The first time you do something, you just do it.
2. The second time you do something similar, you wince at the duplication, but you do the duplicate thing anyway.
3. The third time you do something similar, you **refactor**.

*Other triggers for refactoring:*
- **Refactor when adding a function:** If the design makes it hard to add the feature, refactor the design first so it becomes easy to add the feature.
- **Refactor when fixing a bug:** Bugs often hide in poorly designed code. Improve the readability to spot the bug.
- **Refactor when doing a code review:** Collaborative refactoring improves understanding.

## 5. Self-Testing Code
Refactoring relies heavily on automated tests. You cannot safely refactor without a safety net of tests that can quickly catch regressions. If tests are missing, writing them is a prerequisite to refactoring.

## 6. Refactoring and Performance
Refactoring makes code easier to understand, which often makes it easier to tune for performance later. Do not optimize for performance prematurely during the refactoring process. Write clean, well-factored code first, then profile and optimize the bottlenecks.
