# Fundamentals of Software Architecture Doctrine

This doctrine codifies the principles of Mark Richards and Neal Ford's "Fundamentals of Software Architecture" (O'Reilly, 2020) as applied at Riddim Software. It complements the [Clean Architecture Doctrine](clean-architecture-doctrine.md): Clean Architecture defines *how to keep policy independent of detail*; this doctrine defines *how to choose, measure, and govern the architecture itself*.

## The Two Laws

- **First Law:** Everything in software architecture is a trade-off. If something looks like it isn't, the trade-off has not been found yet.
- **Second Law:** *Why* is more important than *how*. A topology without rationale is not an architecture — it is a diagram.

## I. The Definition of Architecture

Software architecture is the combination of four things, and naming only one of them does not describe an architecture:

1. **Structure** — the style (layered, pipeline, microkernel, service-based, event-driven, space-based, orchestration-driven SOA, microservices, or a hybrid).
2. **Architecture Characteristics** — the "-ilities" the system must support (availability, scalability, security, etc.).
3. **Architecture Decisions** — hard rules with rationale.
4. **Design Principles** — preferred guidelines, where local choice remains with developers.

Decisions are *rules*; principles are *guidelines*. Use the right form for the right intent. Prefer decisions like "use a reactive frontend framework" over "use React" — name the characteristic, not the brand, unless a characteristic forces the specific choice.

## II. Architectural Thinking

- **Knowledge pyramid:** known knowns, known unknowns, unknown unknowns. Architects are paid for their *technical breadth* (T-shape), not depth alone — stale depth becomes the *Frozen Caveman* anti-pattern.
- **Architecture vs Design** is a continuum, not a divide. Architects and developers collaborate; bidirectional feedback is required.
- **Trade-off analysis** is the architect's primary skill. Every recommendation comes with the alternative considered and the cost accepted.
- **Stay hands-on.** Architects who stop coding lose calibration; do proof-of-concept work, code katas, kata reviews, or production bug-fix rotations.

## III. Modularity, Coupling, Connascence

- **Modularity is an implicit characteristic** — rarely in requirements, always required for survival. Entropy is the default; preserving modularity costs energy.
- **Cohesion:** the methods and fields of a module should share state and purpose. **LCOM** exposes incidental coupling.
- **Coupling:** measure directionally. Afferent (Ca) = incoming, Efferent (Ce) = outgoing. Derived: **Abstractness A**, **Instability I**, **Distance from the Main Sequence D = |A + I − 1|**. The upper-right corner is the *zone of uselessness*; the lower-left is the *zone of pain*.
- **Connascence** (Page-Jones): two components are connascent if a change to one forces a change to the other. Static forms (best→worst): **Name, Type, Meaning, Position, Algorithm**. Dynamic forms: **Execution, Timing, Value, Identity**.
- **Three rules:** minimize overall connascence; minimize connascence across boundaries; convert strong forms to weaker forms, and tolerate strong forms only locally.

## IV. Architecture Characteristics

An Architecture Characteristic meets three criteria simultaneously:

1. Specifies a *nondomain* design consideration.
2. *Influences some structural aspect* of the design.
3. Is *critical or important* to application success.

If a quality fails any one of the three, it is not an Architecture Characteristic — it is a wish.

- **Categories:** **Operational** (availability, performance, reliability, scalability, recoverability, robustness), **Structural** (configurability, extensibility, maintainability, portability, supportability), **Cross-Cutting** (security, privacy, accessibility, usability, legal).
- **Explicit** characteristics appear in requirements; **Implicit** ones (availability, reliability, security, modularity) almost never do but must be uncovered.
- **Least-worst architecture:** every supported characteristic costs another. Aim for a small number — usually **no more than ~7** — chosen deliberately. Iteration beats one-shot perfection.
- The term **Architecture Characteristic** is preferred over "nonfunctional requirement" (which discounts essential work) and "quality attribute" (which implies after-the-fact assessment).

## V. Measuring and Governing — Fitness Functions

- **Architecture Fitness Function:** *any mechanism that provides an objective integrity assessment of some Architecture Characteristic or combination of characteristics.* Not a framework — a perspective on existing tools (unit tests, ArchUnit, JDepend/NetArchTest, monitors, chaos engineering).
- **Measure categories:** Operational (response time percentiles, page-weight budgets), Structural (cyclomatic complexity, LCOM, distance from the main sequence, cyclic dependencies), Process (test coverage, deployment lead time, deployment success rate).
- **Classification axes:** atomic vs holistic, triggered vs continual, static vs dynamic, automated vs manual, temporal. Default to *automated + triggered* (CI).
- An **unmeasured characteristic is not really supported.** Every claimed top characteristic gets at least one fitness function, named in the ADR's Compliance section.
- Fitness functions are *checklists* in Gawande's sense — reminders for things important but not urgent — not police mechanisms.

## VI. The Architectural Quantum

The traditional axiom that characteristics apply system-wide is obsolete. **Architecture Characteristics have scope; the scope is the Architectural Quantum.**

**Architectural Quantum** = *an independently deployable artifact with high functional cohesion and synchronous connascence.* Three required parts:

- **Independently deployable**, including its data store. A "service" that shares a database with another service is not its own quantum.
- **High functional cohesion**, typically aligned with a DDD Bounded Context.
- **Synchronous connascence** inside the quantum — sync calls force callers and callees to share operational profile. Async calls *weaken* connascence and let two quanta diverge in characteristics.

The quantum is the unit of granularity for deployment, data ownership, communication style, and monolith-vs-distributed decisions.

## VII. Component-Based Thinking

- **Component scope:** library, subsystem, layer, or service.
- **Architecture partitioning:** prefer **domain partitioning** (Bounded Context-shaped components) over **technical partitioning** (presentation/business/persistence layers). Domain partitioning makes Conway's Law work *for* the system instead of against it (the **Inverse Conway Maneuver** — organize teams around the architecture you want).
- **Component identification flow:** identify initial components → assign requirements → analyze roles and responsibilities → analyze architecture characteristics → restructure. Iterate.
- **Avoid the Entity Trap** — components named after database entities ("Customer", "Order") rarely cohere around behavior.
- Discovery techniques: **Actor/Actions**, **Event Storming**, **Workflow**.

## VIII. Architecture Styles

Each style is a topology + a profile of which Architecture Characteristics it favors and which it sacrifices. Selection is the output of analyzing characteristics, domain, data, philosophy, and organization — not a default.

**Monolithic styles** (one quantum):
- **Layered** — simple, low cost; weak on scalability/elasticity/agility. Beware the Sinkhole Anti-Pattern.
- **Pipeline** — Unix-shell shape; producer/transformer/tester/consumer filters.
- **Microkernel** — core + plug-ins via a registry; ideal when **customizability** is the dominant characteristic.

**Distributed styles** (multiple quanta):
- **Service-Based** — 4–12 coarse-grained domain services, often sharing a database; pragmatic distributed without microservices' operational tax.
- **Event-Driven** — broker or mediator topology; asynchronous; strong on responsiveness, fault tolerance, scalability; complex error handling.
- **Space-Based** — processing units + replicated cache + data pumps; extreme elasticity for variable-load workloads (auctions, ticketing).
- **Orchestration-Driven SOA** — historical; reuse collapsed under coupling. Cautionary, not aspirational.
- **Microservices** — Bounded Context per service, data isolated, share-as-little-as-possible. Choreography over orchestration; sagas only when granularity cannot be fixed.

**Choosing:** match the style to the domain (*domain/architecture isomorphism*), default to the simplest style that meets the requirements, accept hybrids when different parts have different characteristics.

## IX. The Eight Fallacies of Distributed Computing

Every distributed system silently assumes — and pays for — these. PR review must surface which fallacies a change assumes away:

1. The Network Is Reliable.
2. Latency Is Zero.
3. Bandwidth Is Infinite.
4. The Network Is Secure.
5. The Topology Never Changes.
6. There Is Only One Administrator.
7. Transport Cost Is Zero.
8. The Network Is Homogeneous.

Plus the second-order tax: **distributed logging, distributed transactions (BASE, sagas), distributed monitoring, contract maintenance/versioning** — each needs a named owner.

## X. Architecture Decisions

- Architecturally significant = affects **structure, characteristics, dependencies, interfaces, or construction techniques**.
- Every significant decision lands as an **ADR** with: **Title, Status, Context, Decision, Consequences**, plus **Compliance** (how it is enforced — fitness function or named audit) and **Notes** (date, author).
- **Status discipline:** `Proposed` / `Accepted` / `Superseded` (with bi-directional links). Superseded ADRs are never deleted — the chain preserves *why*.
- **Active voice.** "We will use X." Hedging belongs in `Proposed`, not `Accepted`.
- **Anti-patterns to refuse:**
  - **Covering Your Assets** — defer indefinitely out of fear. Decide at the last responsible moment, then collaborate to validate.
  - **Groundhog Day** — the *why* was never captured; the same debate happens every quarter. Always include technical *and* business justification.
  - **Email-Driven Architecture** — the decision lives nowhere durable. One system of record; everything else is a link.

## XI. Risk, Diagrams, Teams

- **Risk:** Impact × Likelihood matrix. **Risk Storming** is a two-phase exercise — independent identification, then collaborative consensus on a published diagram — focused on specific characteristics (availability, elasticity, security, …). Unknown technologies are automatic high-risk.
- **Diagrams:** representational consistency (same shapes/lines mean the same thing throughout); prefer **C4** for software architecture, **UML** sparingly, **ArchiMate** for enterprise. Title, lines, shapes, labels, color, keys — all are signals.
- **Presenting** (Garr Reynolds): incremental builds, manipulate time, the slide is half the story, *invisibility* (the slide must not compete with the speaker). Infodecks ≠ presentations.
- **Architect personalities:** Control Freak (over-constrains) and Armchair Architect (under-engages) both fail. The **Effective Architect** calibrates control to team familiarity, size, experience, complexity, and duration.
- **Team warning signs:** process loss, pluralistic ignorance, diffusion of responsibility.
- **Checklists** (Gawande): Developer Code Completion, Unit/Functional Testing, Software Release. Provide guidance, not law.
- **Negotiation:** with business — lead with business value, watch for *always/never/impossible* trigger words; with other architects — leave egos at the door, agree privately, present united; with developers — never dictate without justification.
- **The 4 C's of Architecture:** Communication, Collaboration, Clarity, Conciseness.
- **The 20-Minute Rule:** twenty minutes of professional development daily, *before* the workday's distractions take over.

## XII. Organizational Codification (Riddim Standards)

### Decisions and Documentation
- **ADRs required.** Any PR that affects structure, an Architecture Characteristic, a coupling point, an interface contract, or a framework/platform choice must include or update an ADR. Hedged decisions land as `Proposed`, not `Accepted`. ADRs without business justification are blocked.
- **Linear tickets** for architecturally significant work include an ADR subtask or an acceptance criterion that an ADR will be added/updated.

### Characteristics and Fitness Functions
- Each repo's `CLAUDE.md` (or `docs/architecture.md`) lists **the top characteristics** for that system — ideally three, never more than seven.
- **Every top characteristic has at least one fitness function** in CI. Cyclic dependencies between packages are a build failure. Layer/partition rules are enforced by an automated test (ArchUnit, NetArchTest, dependency-cruiser, custom script), not by review hope.
- Cyclomatic complexity threshold per the team's calibration (book recommends < 5; ≤ 10 minimum).

### Distribution and Quanta
- **Monolith-vs-distributed is decided by quantum analysis**, not preference. If two "services" share a database, they are one quantum.
- **Synchronous is the default**; every asynchronous boundary is justified.
- Any new remote call documents protocol, timeout, retry policy, and failure mode. Unbounded retries and missing timeouts fail CI.
- **Distributed transactions across deployment units are forbidden** unless a saga is explicitly justified; "we need a saga" is first treated as a granularity smell.

### Partitioning and Components
- **Domain partitioning is the default.** Technical partitioning (presentation/business/persistence at the architecture level) requires justification.
- New "services" must be Bounded Contexts with their own data — not entities-dressed-as-services.
- Cross-service code imports, shared schemas, and shared relational tables are prohibited; integration is via events, replication, or explicit contracts.

### Style Selection
- A proposed architecture names its style (or hybrid), the characteristics it optimizes for, and what it sacrifices.
- Default to the **simplest style that meets the requirements.** Resist reaching for microservices, event-driven, or space-based when layered, modular monolith, microkernel, or service-based fits.

### Review and Risk
- PRs touching cross-process boundaries enumerate the **Eight Fallacies impact** and the consistency model.
- High-risk areas (Risk Storming) drive added fitness functions, not added meetings.
- Architectural checklists extend (rather than replace) the repo's existing PR/review checklists.

### Repo-Local Codification
Each repository's `CLAUDE.md` should expose:
- The system's **architecture style** (and any hybrid).
- The **top architecture characteristics** (≤ 7) the system optimizes for, with at least one fitness function each.
- The **architectural quanta** and their data ownership.
- The **partitioning approach** (domain vs technical) and where ADRs live.
