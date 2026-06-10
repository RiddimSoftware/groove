# Chapter 12: Microkernel Architecture Style

## Core Principles
- A microkernel architecture has exactly two component types: a **Core System** holding the minimal happy-path logic, and **Plug-In Components** that contain volatile, variant, or customer-specific behavior. The core never knows the plug-in's internals.
- The core defines a **contract** (behavior + input + output) that every plug-in honors. Plug-ins from third parties get wrapped in an **adapter** to fit the standard contract — the core never grows a special case per vendor.
- A **Registry** maps a key (device ID, jurisdiction, form name, command) to a plug-in reference. The core looks up and dispatches; it doesn't if/else over types.
- Plug-ins can be point-to-point (in-process call, shared library, namespace) or remote (REST, messaging). Remote plug-ins improve decoupling but convert the system into a distributed architecture — and still a **single quantum** because every request goes through the core.
- It is the only style that is **both domain-partitioned and technically partitioned**, and it shines when the domain has strong "same workflow, varying rules per X" shape (Eclipse, Chrome, Jira, claims processing, tax forms).

## When to Use
- Product-based apps with user-customizable features (IDEs, browsers, ETL tools).
- Business apps where the dominant variation is per-jurisdiction, per-tenant, per-device, or per-rule.
- Anywhere the core process is stable but the rule set churns.

## Characteristic Profile
- Strong on: simplicity, overall cost, modularity, extensibility, testability (plug-ins are isolated).
- Weak on: scalability, elasticity, fault tolerance (single quantum, monolithic core).

## Enforceable Rules
- Plug-ins must implement the core's contract. Plug-in-specific knowledge must not leak into the core (no `if (deviceID == "iPhone6s")` branches in the core).
- Plug-ins do not depend on each other. Cross-plug-in calls go through the core or are forbidden.
- Plug-ins do not connect directly to the shared database. The core owns persistence and passes data in. A plug-in may own its private data store.
- Third-party plug-ins must be fronted by an adapter conforming to the standard contract.

## Review Questions
- Is this new variant code a new plug-in, or is it an `if` added to the core?
- Does the registry know how to dispatch to this plug-in without the core hard-coding its identity?
- Does this plug-in reach into another plug-in, the shared DB, or a sibling's internals?
- Is the contract still the same for all plug-ins, or did we just create plug-in-specific exceptions?

## Examples
### Violation
- The core has a 200-line switch statement on `deviceID` to assess each electronic device. Adding a new device requires editing the core.
### Good Implementation
- The core calls `registry.get(deviceID)` and invokes `plugin.assess()`. A new device is a new plug-in jar/module + a new registry entry. The core never changes.

## Implications
### For Agents
- When a feature is "do the same workflow but with one branch that varies per X," agents should propose the microkernel shape and resist piling switch statements into the core. When reviewing, flag any new conditional in the core that keys off a plug-in identity — that's a plug-in that should be extracted.
### For Tickets/PRs/CI
- Tickets that add new tenants, jurisdictions, devices, or rule variants should be scoped as "add plug-in X," not "modify core." PRs that touch the core for a per-variant feature are a smell. CI fitness functions can assert that the core has no imports of plug-in modules and that the registry is the only dispatch point.
