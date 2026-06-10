# Chapter 8: Organizing Data

## Summary
This chapter covers refactorings related to data structures, moving from primitive data types to rich objects, and handling associations between classes.

## Key Refactorings

### Replace Data Value with Object
- **Problem:** You have a data item that needs additional data or behavior.
- **Solution:** Turn the data item into an object.

### Change Value to Reference / Change Reference to Value
- **Problem:** You have a class with many equal instances that you want to replace with a single object (Value to Reference), or you have a reference object that is small, immutable, and hard to manage (Reference to Value).
- **Solution:** Turn the object into a reference object (keeping a registry) or a value object (where equality is based on fields).

### Replace Array with Object
- **Problem:** You have an array in which certain elements mean different things (e.g., `row[0]` is name, `row[1]` is age).
- **Solution:** Replace the array with an object that has a field for each element.

### Duplicate Observed Data
- **Problem:** You have domain data available only in a GUI control, and domain methods need access to it.
- **Solution:** Copy the data to a domain object and set up an observer to keep the two in sync. (Used to separate Domain from Presentation).

### Change Unidirectional Association to Bidirectional / Change Bidirectional Association to Unidirectional
- **Problem:** Two classes need to use each other's features, but there is only a one-way link (or a two-way link is no longer needed).
- **Solution:** Add back pointers (or drop unneeded pointers) and ensure referential integrity is maintained.

### Replace Magic Number with Symbolic Constant
- **Problem:** You have a literal number with a particular meaning.
- **Solution:** Create a constant, name it after the meaning, and replace the number with it.

### Encapsulate Field / Encapsulate Collection
- **Problem:** There is a public field or a method that returns a collection.
- **Solution:** Make the field private and provide getters/setters. For collections, return a read-only view and provide add/remove methods.

### Replace Type Code with Class / Subclasses / State-Strategy
- **Problem:** You have a class with a numeric type code that does not affect behavior (Class), affects behavior (Subclasses), or affects behavior and changes over the lifetime of the object (State/Strategy).
- **Solution:** Replace the type code with a new class, subclasses, or a State/Strategy object.
