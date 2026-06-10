# Chapter 14: Refactoring Tools

## Summary
This chapter, written by Don Roberts and John Brant, discusses the criteria and design of automated refactoring tools. (Note: When the book was published, such tools were rare; today they are standard in modern IDEs).

## Key Themes
- **The Ideal Tool:** A refactoring tool should allow a programmer to select a refactoring, enter parameters, and have the tool safely perform the transformation across the entire codebase.
- **Technical Criteria:** 
  - The tool must use an Abstract Syntax Tree (AST), not just text search-and-replace, to ensure accuracy.
  - It must be fast.
  - It must have an undo feature.
  - It must integrate seamlessly with the development environment.
- **Safety:** Automated tools make refactoring significantly safer because they can automatically verify preconditions (e.g., checking if a method name already exists in a subclass before pulling it up) that are tedious for humans to check manually.
