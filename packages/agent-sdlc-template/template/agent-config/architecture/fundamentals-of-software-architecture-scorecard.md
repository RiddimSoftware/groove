# Fundamentals of Software Architecture Scorecard

A rubric for evaluating a system, module, or significant PR against the [Fundamentals of Software Architecture Doctrine](fundamentals-of-software-architecture-doctrine.md).

Use this in addition to (not instead of) the [Architecture Scorecard](architecture-scorecard.md) (Clean Architecture, dependency-direction-focused) and the [Refactoring Scorecard](refactoring-scorecard.md) (behavior-preservation-focused). This scorecard targets *style fit*, *characteristic discipline*, and *governance*.

## Scoring

Score each criterion 0–10. Anchors: **0** = absent or actively wrong; **3** = present but ad hoc; **5** = documented intent without enforcement; **7** = documented and partially enforced; **10** = explicit, measured, and protected by automation.

| # | Criterion | 0–10 | Notes |
|---|---|---|---|
| 1 | **Style Named & Justified** | | Architecture style (or hybrid) is named, fits the domain (isomorphism), and the choice is captured in an ADR with trade-offs. |
| 2 | **Architecture Characteristics Selected** | | The system has a deliberate top list (≤ 7) of Architecture Characteristics; each passes the three-criteria test (nondomain, structural, critical). |
| 3 | **Implicit Characteristics Acknowledged** | | Availability, reliability, security, modularity are surfaced even when not in requirements. |
| 4 | **Fitness Functions in CI** | | Every top characteristic has at least one automated, triggered fitness function. Layer/quantum rules and cyclic-dependency checks fail the build. |
| 5 | **Quantum Clarity** | | Architectural Quanta are named with their data ownership. No "services" sharing a database masquerade as separate quanta. |
| 6 | **Domain Partitioning** | | Components are partitioned by domain / Bounded Context, not by technical layer. Entity-trap components are absent. |
| 7 | **Coupling & Connascence Hygiene** | | Strong forms of connascence (Algorithm, Timing, Value, Identity) do not cross module/quantum boundaries. Distance-from-the-Main-Sequence is monitored on hot paths. |
| 8 | **Distributed Discipline** | | Remote calls document protocol, timeout, retry, and failure mode. The Eight Fallacies are addressed by design, not assumed away. Distributed transactions are absent or saga-justified. |
| 9 | **Sync/Async Default** | | Synchronous is the default; every asynchronous boundary is justified by divergent characteristics, not preference. |
| 10 | **ADR Hygiene** | | Architecturally significant decisions are captured as ADRs with Title / Status / Context / Decision / Consequences / Compliance / Notes. Superseded ADRs are linked, never deleted. Decisions are in active voice with business + technical justification. |
| 11 | **Risk Surface** | | A risk matrix (impact × likelihood) exists for the system. Risk-storming has been run on the top characteristics. Unknown-tech zones are explicitly tagged high-risk. |
| 12 | **Diagrams & Documentation** | | Diagrams follow representational consistency, use a recognized standard (C4 / UML / ArchiMate), include titles/keys, and live alongside the code. The diagram set covers the system at C4 levels 1–3 minimum. |
| 13 | **Modularity Metrics** | | LCOM / cyclomatic-complexity thresholds are tracked. Packages near the zone of pain or zone of uselessness are flagged. Cyclic dependencies are zero (or trending to zero). |
| 14 | **Repo-Local Codification** | | The repo's `CLAUDE.md` / `docs/architecture.md` exposes style, top characteristics, quanta, partitioning approach, and ADR location for any agent (or human) entering cold. |
| 15 | **Team & Process Fit** | | Team boundaries match Bounded Contexts (Inverse Conway). Architectural checklists extend existing PR/review checklists. Architect role is calibrated (neither Control Freak nor Armchair). |

**Total Score:** / 150

## Interpretation

- **120–150:** Mature. The architecture is named, measured, governed, and survives team churn.
- **90–119:** Solid. Intentional shape, partial automation. Gaps are known and ticketed.
- **60–89:** Aspirational. Documents exist; enforcement is patchy. High risk of drift.
- **< 60:** Accidental architecture. The system has a style by accident, not by decision. Schedule Risk Storming and write the first ADRs immediately.

## Triggers to Re-Score

- After any change to the system's top characteristics or quantum count.
- On every release of a new module/service.
- Quarterly, regardless of PR activity, to catch drift the fitness functions did not detect.
- After a production incident whose root cause was architectural (latency budget breach, data-loss event, cross-quantum coupling surprise).
