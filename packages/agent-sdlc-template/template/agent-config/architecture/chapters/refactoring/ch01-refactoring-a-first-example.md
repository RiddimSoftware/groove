# Chapter 1: Refactoring, a First Example

## Summary
This chapter provides a walk-through of a typical refactoring session using a simple program that calculates and prints a statement of a customer's charges at a video store. It demonstrates the fundamental rhythm and mindset of refactoring.

## Key Takeaways
1. **The Starting Point:** Before you start refactoring, check that you have a solid suite of tests. These tests must be self-checking.
2. **Small Steps:** Refactoring is done in small steps. After every change, compile and test. If it breaks, revert and take a smaller step.
3. **The Process:**
   - **Extract Method:** The most common refactoring. Taking a long block of code and turning it into a well-named method.
   - **Rename Variables:** Clarity is key. Rename variables to accurately reflect their purpose (e.g., `thisAmount` to `result`).
   - **Move Method:** If a method uses more features of another class than the class it resides in, it should be moved to that other class.
   - **Replace Temp with Query:** Temporary variables can be a problem. They are only useful within their own routine. Replacing them with queries (methods) makes the logic accessible to the whole class.
   - **Replace Type Code with State/Strategy:** When a class's behavior changes based on a type code, it's often better to use polymorphism (subclasses or state/strategy objects).
   - **Replace Conditional with Polymorphism:** Moving the branches of a conditional (switch statement) into overriding methods on subclasses.

## The Rhythm
The chapter heavily emphasizes the repetitive cycle:
1. Identify a small change.
2. Make the change.
3. Compile.
4. Test.
5. If successful, proceed. If failed, undo and rethink.

This micro-iteration ensures that errors are caught immediately and debugging time is virtually eliminated.
