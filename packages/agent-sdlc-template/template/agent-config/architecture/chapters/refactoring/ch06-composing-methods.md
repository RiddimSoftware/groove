# Chapter 6: Composing Methods

## Summary
The primary focus of this chapter is on refactorings that package code into well-named, manageable methods. Most problems in software come from methods that are too long.

## Key Refactorings

### Extract Method
- **Problem:** You have a code fragment that can be grouped together.
- **Solution:** Turn the fragment into a method whose name explains the purpose of the method.
- *This is the most common and important refactoring.*

### Inline Method
- **Problem:** A method's body is just as clear as its name.
- **Solution:** Put the method's body into the body of its callers and remove the method.

### Inline Temp
- **Problem:** You have a temp that is assigned to once with a simple expression, and the temp is getting in the way of other refactorings.
- **Solution:** Replace all references to that temp with the expression.

### Replace Temp with Query
- **Problem:** You are using a temporary variable to hold the result of an expression.
- **Solution:** Extract the expression into a method. Replace all references to the temp with the new method. The new method can then be used in other methods.

### Introduce Explaining Variable
- **Problem:** You have a complicated expression.
- **Solution:** Put the result of the expression, or parts of the expression, in a temporary variable with a name that explains the purpose. (Note: Often Extract Method is preferred over this).

### Split Temporary Variable
- **Problem:** You have a temporary variable assigned to more than once, but is not a loop variable nor a collecting temporary variable.
- **Solution:** Make a separate temporary variable for each assignment.

### Remove Assignments to Parameters
- **Problem:** The code assigns to a parameter.
- **Solution:** Use a temporary variable instead.

### Replace Method with Method Object
- **Problem:** You have a long method that uses local variables in such a way that you cannot apply Extract Method.
- **Solution:** Turn the method into its own object so that all the local variables become fields on that object. You can then decompose the method into other methods on the same object.

### Substitute Algorithm
- **Problem:** You want to replace an algorithm with one that is clearer.
- **Solution:** Replace the body of the method with the new algorithm.
