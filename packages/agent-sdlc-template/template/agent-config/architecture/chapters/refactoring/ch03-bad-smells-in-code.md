# Chapter 3: Bad Smells in Code

## Summary
This chapter serves as a catalog of common code "smells"—indicators that the design might need improvement. Identifying these smells is the first step in deciding when and how to refactor.

## Common Code Smells & Cures
- **Duplicated Code:** The number one bad smell. *Cures:* Extract Method, Extract Class, Pull Up Method.
- **Long Method:** The longer a method, the harder it is to understand. *Cures:* Extract Method, Replace Temp with Query, Replace Method with Method Object, Decompose Conditional.
- **Large Class:** A class that tries to do too much. Often shows up as too many instance variables. *Cures:* Extract Class, Extract Subclass.
- **Long Parameter List:** Hard to understand and constantly changing. *Cures:* Replace Parameter with Method, Preserve Whole Object, Introduce Parameter Object.
- **Divergent Change:** When one class is commonly changed in different ways for different reasons. *Cures:* Extract Class.
- **Shotgun Surgery:** Every time you make a kind of change, you have to make a lot of little changes to a lot of different classes. *Cures:* Move Method, Move Field, Inline Class.
- **Feature Envy:** A method seems more interested in a class other than the one it actually is in (often accessing data of another object). *Cures:* Move Method, Extract Method.
- **Data Clumps:** Data items that tend to hang around together (e.g., in fields or parameter lists). *Cures:* Extract Class, Introduce Parameter Object, Preserve Whole Object.
- **Primitive Obsession:** Reluctance to use small objects for small tasks (e.g., representing money as a float, or a phone number as a string). *Cures:* Replace Data Value with Object, Replace Type Code with Class.
- **Switch Statements:** An indicator of missed polymorphism. *Cures:* Replace Conditional with Polymorphism, Replace Type Code with Subclasses.
- **Parallel Inheritance Hierarchies:** A special case of shotgun surgery; making a subclass of one class requires making a subclass of another. *Cures:* Move Method, Move Field to merge hierarchies.
- **Lazy Class:** A class that isn't doing enough to pay for itself. *Cures:* Collapse Hierarchy, Inline Class.
- **Speculative Generality:** Hooks and special cases added for things that "might" happen. *Cures:* Collapse Hierarchy, Inline Class, Remove Parameter.
- **Temporary Field:** An instance variable set only in certain circumstances. *Cures:* Extract Class, Introduce Null Object.
- **Message Chains:** `a.getB().getC().getD()`. *Cures:* Hide Delegate.
- **Middle Man:** When a class does nothing but delegate to other classes. *Cures:* Remove Middle Man.
- **Inappropriate Intimacy:** Classes that are too tightly coupled and delve into each other's private parts. *Cures:* Move Method, Move Field, Change Bidirectional Association to Unidirectional.
- **Alternative Classes with Different Interfaces:** Classes that do similar things but have different signatures. *Cures:* Rename Method, Move Method to adapt interfaces.
- **Incomplete Library Class:** When a library doesn't quite do what you need. *Cures:* Introduce Foreign Method, Introduce Local Extension.
- **Data Class:** Classes that are dumb data holders and are manipulated heavily by other classes. *Cures:* Encapsulate Field, Encapsulate Collection, Move Method (into the Data Class).
- **Refused Bequest:** Subclasses that don't want or need the methods or data inherited from parents. *Cures:* Push Down Method, Push Down Field, Replace Inheritance with Delegation.
- **Comments:** Comments are often used as deodorant to mask bad smells. *Cure:* Extract Method so the method name explains what it does; Rename Method so you don't need a comment to explain it.
