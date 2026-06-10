# Chapter 12: Big Refactorings

## Summary
While most refactorings are small, incremental steps, this chapter covers broad design problems that require a coordinated plan of many small refactorings executed over months or years.

## The Big Refactorings

### Tease Apart Inheritance
- **Problem:** You have an inheritance hierarchy that is doing two jobs at once (often characterized by a tangled mess of subclasses).
- **Solution:** Create two hierarchies and use delegation to invoke one from the other.

### Convert Procedural Design to Objects
- **Problem:** You have code written in an object-oriented language but in a procedural style (data classes with dumb data, and classes with long procedural methods).
- **Solution:** Turn the data records into objects, break up the behavior, and move the behavior to the objects.

### Separate Domain from Presentation
- **Problem:** You have GUI classes that contain domain logic.
- **Solution:** Separate the domain logic into separate domain classes.

### Extract Hierarchy
- **Problem:** You have a class that is doing too much work, at least in part through many conditional statements.
- **Solution:** Create a hierarchy of classes in which each subclass represents a special case.
