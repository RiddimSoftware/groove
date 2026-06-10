# Chapter 29: Clean Embedded Architecture

## Core Principles
- **Software vs. Firmware:** Software does not wear out, but hardware and firmware become obsolete. Embedded code becomes "firmware" when it is tightly coupled to the hardware.
- **The Target-Hardware Bottleneck:** If your code can only be tested on the target hardware, development will be painfully slow.
- **App-titude Test:** Getting code to work is just the first step. "Make it work, make it right, make it fast."
- **Hardware Abstraction Layer (HAL) and OS Abstraction Layer (OSAL):** Use these layers to decouple the software from the hardware and the operating system.

## Enforceable Rules
- Embedded software must be testable *off* the target hardware.
- Code that interacts directly with hardware registers or OS-specific APIs must be isolated behind interfaces (HAL/OSAL).
- Do not use conditional compilation (`#ifdef`) to handle different hardware targets if polymorphism (a HAL) can be used instead.

## Review Questions
- Can the core logic of this embedded application be compiled and tested on a standard developer workstation?
- Are hardware-specific headers (`#include <acmetypes.h>`) bleeding into the business logic files?

## Examples
### Violation
- An embedded C function that contains business logic interspersed with direct writes to hardware registers (e.g., `SBUF0 = 0x68;`).
### Good Implementation
- The business logic calls `display_character('h')` on an interface, and the implementation of that interface handles the hardware-specific register writes.

## Implications
### For Agents
- When working on embedded projects, agents must proactively suggest the creation of a HAL or OSAL to protect the core logic.
### For Tickets/PRs/CI
- Embedded projects must have CI pipelines that can run the core logic tests on standard cloud runners, without requiring the physical device to be attached.
