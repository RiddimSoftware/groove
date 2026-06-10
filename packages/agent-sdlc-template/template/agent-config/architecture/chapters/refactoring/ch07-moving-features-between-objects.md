# Chapter 7: Moving Features Between Objects

## Summary
This chapter deals with where responsibilities should reside. It focuses on safely moving methods and fields between classes to create a more cohesive and less coupled design.

## Key Refactorings

### Move Method
- **Problem:** A method is, or will be, using or used by more features of another class than the class on which it is defined.
- **Solution:** Create a new method with a similar body in the class it uses most. Either turn the old method into a simple delegation, or remove it altogether.

### Move Field
- **Problem:** A field is, or will be, used by another class more than the class on which it is defined.
- **Solution:** Create a new field in the target class, and change all users of the old field to use the new one.

### Extract Class
- **Problem:** You have one class doing work that should be done by two. (Often indicated by a Large Class smell).
- **Solution:** Create a new class and move the relevant fields and methods from the old class into the new class.

### Inline Class
- **Problem:** A class isn't doing very much.
- **Solution:** Move all its features into another class and delete it.

### Hide Delegate
- **Problem:** A client is calling a delegate class of an object.
- **Solution:** Create methods on the server to hide the delegate. (Prevents message chains like `client.getServer().getDelegate().doSomething()`).

### Remove Middle Man
- **Problem:** A class has too many methods that simply delegate to other objects.
- **Solution:** Get the client to call the delegate directly.

### Introduce Foreign Method
- **Problem:** A server class you are using needs an additional method, but you can't modify the class.
- **Solution:** Create a method in the client class with an instance of the server class as its first argument.

### Introduce Local Extension
- **Problem:** A server class you are using needs several additional methods, but you can't modify the class.
- **Solution:** Create a new class that contains these extra methods. Make this extension class a subclass or a wrapper of the original.
