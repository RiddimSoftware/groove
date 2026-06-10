# Chapter 10: Making Method Calls Simpler

## Summary
This chapter covers refactorings that make interfaces more straightforward and easier to understand, primarily focusing on method signatures, parameters, and constructors.

## Key Refactorings

### Rename Method
- **Problem:** The name of a method does not reveal its purpose.
- **Solution:** Change the name of the method. (Crucial for clear code).

### Add Parameter / Remove Parameter
- **Problem:** A method needs more information from its caller, or no longer uses a parameter.
- **Solution:** Add or remove the parameter. (Prefer removing parameters if the method can get the information itself).

### Separate Query from Modifier
- **Problem:** You have a method that returns a value but also changes the state of an object (has side effects).
- **Solution:** Create two methods, one for the query and one for the modification.

### Parameterize Method
- **Problem:** Several methods do similar things but with different values contained in the method body.
- **Solution:** Create one method that uses a parameter for the different values.

### Replace Parameter with Explicit Methods
- **Problem:** You have a method that runs different code depending on the values of an enumerated parameter.
- **Solution:** Create a separate method for each value of the parameter.

### Preserve Whole Object
- **Problem:** You are getting several values from an object and passing these values as parameters in a method call.
- **Solution:** Send the whole object instead.

### Replace Parameter with Method
- **Problem:** An object invokes a method, then passes the result as a parameter to another method. The receiver can also invoke this method.
- **Solution:** Remove the parameter and let the receiver invoke the method.

### Introduce Parameter Object
- **Problem:** You have a group of parameters that naturally go together (Data Clumps).
- **Solution:** Replace them with an object.

### Remove Setting Method
- **Problem:** A field should be set at creation time and never altered.
- **Solution:** Remove any setting method for that field.

### Hide Method
- **Problem:** A method is not used by any other class.
- **Solution:** Make the method private.

### Replace Constructor with Factory Method
- **Problem:** You want to do more than simple construction when you create an object (e.g., return a subclass, or an existing instance).
- **Solution:** Replace the constructor with a factory method.

### Replace Error Code with Exception
- **Problem:** A method returns a special code to indicate an error.
- **Solution:** Throw an exception instead.

### Replace Exception with Test
- **Problem:** You are throwing an exception on a condition the caller could have checked first.
- **Solution:** Change the caller to make the test first.
