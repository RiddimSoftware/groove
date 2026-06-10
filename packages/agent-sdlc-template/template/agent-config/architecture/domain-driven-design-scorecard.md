# Domain-Driven Design Scorecard

A rubric for evaluating the domain-driven architectural health of a project or PR.

| Criterion | 0-10 | Notes |
| :--- | :--- | :--- |
| **Ubiquitous Language** | | Are business terms clearly reflected in class/variable names? |
| **Domain Isolation** | | Is the domain layer completely free of UI/DB dependencies? |
| **Rich Domain Model** | | Are entities/values rich with behavior, not just data bags (anemic)? |
| **Value Object Usage** | | Are concepts without identity modeled as immutable Value Objects? |
| **Aggregate Boundaries** | | Do Aggregates enforce invariants? Are cross-aggregate transactions avoided? |
| **Repository Pattern** | | Do Repositories only return/save full Aggregate Roots? |
| **Bounded Contexts** | | Are context boundaries explicitly defined and respected? |
| **Anticorruption Layers** | | Are external systems/legacy models isolated via ACLs? |

**Total Score:** / 80
