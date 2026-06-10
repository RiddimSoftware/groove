# Chapter 10: Supple Design

## Overview
This chapter explores how to make the domain model easier to understand, change, and use. A supple design invites change and makes the developer's intent clear.

## Key Concepts

### Intention-Revealing Interfaces
- Name classes and methods to declare their purpose and their effects, not how they work.
- If a developer has to look inside a method to understand what it does, the interface is not intention-revealing.
- Use the Ubiquitous Language for all names.

### Side-Effect-Free Functions
- Operations can be divided into commands (which change state but return no data) and queries (which return data but change no state).
- Whenever possible, write logic as side-effect-free functions (queries). They are easier to test and reason about.
- Complex logic should be placed in Value Objects, which are naturally side-effect-free because they are immutable.

### Standalone Classes
- Dependencies make code harder to understand and test.
- Strive to eliminate unnecessary dependencies. A class that can be understood entirely on its own is a "standalone class."

### Conceptual Contours
- Design the model so that elements that change together are grouped together, and elements that change for different reasons are separated.
- This aligns with the Single Responsibility Principle and creates natural seams in the software.

## Application
- Review your public APIs. Can someone understand what a method does just by reading its signature?
- Push as much logic as possible into immutable Value Objects.
- Refactor relentlessly to remove unnecessary coupling between domain concepts.
