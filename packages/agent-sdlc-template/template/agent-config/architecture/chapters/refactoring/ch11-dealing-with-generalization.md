# Chapter 11: Dealing with Generalization

## Summary
This chapter addresses refactorings associated with inheritance interfaces—moving features up and down a class hierarchy, and changing the relationship between classes.

## Key Refactorings

### Pull Up Field / Pull Up Method
- **Problem:** Two subclasses have the same field or identical methods.
- **Solution:** Move the field or method to the superclass.

### Pull Up Constructor Body
- **Problem:** You have constructors on subclasses with mostly identical bodies.
- **Solution:** Create a superclass constructor; call this from the subclass methods.

### Push Down Method / Push Down Field
- **Problem:** Behavior or data on a superclass is relevant only for some of its subclasses.
- **Solution:** Move it to those subclasses.

### Extract Subclass
- **Problem:** A class has features that are used only in some instances.
- **Solution:** Create a subclass for that subset of features.

### Extract Superclass
- **Problem:** You have two classes with similar features.
- **Solution:** Create a superclass and move the common features to the superclass.

### Extract Interface
- **Problem:** Several clients use the same subset of a class's interface, or two classes have part of their interfaces in common.
- **Solution:** Extract the subset into an interface.

### Collapse Hierarchy
- **Problem:** A superclass and subclass are not very different.
- **Solution:** Merge them together.

### Form Template Method
- **Problem:** You have two methods in subclasses that perform similar steps in the same order, yet the steps are different.
- **Solution:** Get the steps into methods with the same signature, so that the original methods become the same. Then pull them up.

### Replace Inheritance with Delegation
- **Problem:** A subclass uses only part of a superclasses interface or does not want to inherit data.
- **Solution:** Create a field for the superclass, adjust methods to delegate to the superclass, and remove the subclassing.

### Replace Delegation with Inheritance
- **Problem:** You are using delegation and are often writing many simple delegations for the entire interface.
- **Solution:** Make the delegating class a subclass of the delegate.
