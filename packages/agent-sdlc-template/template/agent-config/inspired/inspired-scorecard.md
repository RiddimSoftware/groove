# Inspired Scorecard

A 0–10 rubric for scoring how closely a product organization (or a specific Project / release) lives the principles of *Inspired*. Use this alongside the doctrine when auditing a product, planning a re-org, or staffing a new product line.

Score each dimension 0–10. A team scoring below 5 on any dimension is at material risk of shipping a product no one wants.

## Section A — People (org & roles)

| # | Dimension | 0 (worst) | 10 (best) |
|---|---|---|---|
| A1 | **Product manager exists and owns *what*** | No PM, or PM is a scribe; engineering or sales decides what to build. | A single, accountable PM owns opportunity assessment and product definition for every product line. |
| A2 | **PM and product marketing are separate** | One person, both jobs, or a marketer disguised as PM. | Distinct roles with distinct skill sets; product marketing focuses on go-to-market, PM on product definition. |
| A3 | **PM and project management are separate** | PM is burned out managing schedules; nothing gets discovered. | Dedicated PjM (or eng lead) owns scheduling; PM is free to discover. |
| A4 | **Interaction design is staffed in-house** | No designer, or interaction design outsourced to an agency. | In-house interaction designers in collaboration with PMs; visual design and prototyping support them. |
| A5 | **Engineering has a discovery partner** | Engineers handed paper specs; no early architect involvement. | An architect / lead engineer is in discovery from day one, sizing options and surfacing constraints. |
| A6 | **Role ratios are healthy** | 1 PM per 30+ engineers; designers stretched 4:1; nobody runs production. | ~1 PM per 5–10 engineers; ~1 IxD per 2 PMs; ~1 visual designer per 4 IxDs; dedicated PjM for >5-engineer projects. |
| A7 | **Site operations is first-class** (Internet services only) | Engineering moonlights as ops; outages are common. | Dedicated ops team; uptime and performance are owned, measured, and improving. |
| A8 | **Hiring bar for PMs** | PMs hired from "available" pool; no clear traits or interview process. | Hiring against Cagan's traits (passion, customer empathy, intelligence, work ethic, integrity, confidence, attitude) and core skills. |

## Section B — Process (discovery & validation)

| # | Dimension | 0 (worst) | 10 (best) |
|---|---|---|---|
| B1 | **Opportunity assessments exist** | New products start with an exec edict; nobody can articulate the problem. | Every new product line and major release has a written assessment answering the 10 opportunity questions. |
| B2 | **Discovery is treated as a creative process** | Discovery scheduled like construction; engineers idle ≠ tolerated. | Discovery is continuous and parallel to execution; release N+1 is being discovered while release N is being built. |
| B3 | **Prototype is the spec** | Detailed paper PRDs handed over the wall to engineering. | High-fidelity prototypes drive the build; written spec is supporting material, not the contract. |
| B4 | **Prototypes are tested with target users** | Decisions made in conference rooms, never on real users. | Every prototype goes through structured testing with members of the target persona before commit. |
| B5 | **Charter user program** | Team has no direct contact with customers. | A standing program of charter users in continuous dialog with the product team. |
| B6 | **Product principles documented and used** | Tradeoffs re-litigated every meeting; politics decide priorities. | Written, prioritized principles framed every product decision; the team can quote them. |
| B7 | **Personas drive scope** | "Everyone" or "the market" is the target. | Each release names the personas it serves and the personas it deliberately does not. |
| B8 | **Minimal product, not P1/P2/P3** | Spec is a long list with priority labels; features cut last-minute. | Spec describes a minimal whole; engineering estimates from the prototype; tradeoffs already made. |
| B9 | **Product validation before launch** | Bugs and usability problems found by customers post-ship. | Validation tests usability, feasibility, business viability, and (where relevant) market reception before launch. |
| B10 | **Gentle deployment & rapid response** | Big-bang releases; bugs linger; learning is slow. | Staged deployment to small cohorts; instrumented to detect issues; rapid-response cycle for fixes and learnings. |
| B11 | **Agile (or Waterfall) is adapted, not adopted blindly** | Scrum done by the book with no discovery role; or Waterfall with no validation. | Whichever process the team uses is modified to make discovery and prototype testing first-class. |

## Section C — Product (defining great products)

| # | Dimension | 0 (worst) | 10 (best) |
|---|---|---|---|
| C1 | **Differentiation is articulable** | Team cannot explain how the product is different from alternatives. | Differentiation can be explained in 2 minutes (to a company executive), 1 minute (to a smart customer), and 30 seconds (to an industry analyst). |
| C2 | **Whole product** | Product feels like a feature collection; sales motion doesn't match how customers buy. | Product is coherent end-to-end and consistent with how customers think about, buy, and adopt it. |
| C3 | **Emotion** (consumer products especially) | Product is technically capable but uninspiring. | Product addresses the emotional motivators of its audience (fear, greed, lust, status, identity) — not just functional needs. |
| C4 | **Usability over aesthetics, but ideally both** | Beautiful but confusing; or ugly and capable. | Usable first; aesthetically refined when it doesn't compromise usability. |
| C5 | **Tuned to product type** | Consumer, enterprise, and platform products built the same way. | Specific keys to success applied — buyer vs. user separation for enterprise; emotional adoption curve for consumer; developer experience for platform. |
| C6 | **Measure to improve** | "We added X features" is the measure of progress. | Key metrics defined; product changes are evaluated against those metrics; data drives the next iteration. |
| C7 | **No specials** | One-off custom features built for a single customer at the expense of the roadmap. | Customer-specific requests are negotiated as configuration or rejected; the product stays coherent. |
| C8 | **Resists the new old thing** | Roadmap chases whichever framework or platform is in vogue. | Technology choices serve user problems; "new for the sake of new" is rejected. |

## Composite Scoring

27 dimensions × 10 points = **270 maximum**.

- **≥ 220 / 270** (avg ≥ 8.1). Strong product organization. The shape is right and discipline is real.
- **180–219** (avg 6.7–8.1). Solid foundation with room to improve. Pick the two lowest-scoring dimensions and invest there.
- **140–179** (avg 5.2–6.6). Functional but with clear gaps. Likely shipping product but missing on adoption, retention, or coherence. Likely under-staffed on PM/design.
- **100–139** (avg 3.7–5.1). At material risk. The dominant failure mode is shipping the wrong product. Re-org around discovery before adding engineering capacity.
- **< 100** (avg < 3.7). Broken. A major reset is required before any new product investment.

A single 0 on a critical dimension (B3 prototype-as-spec, B4 user testing, A1 PM exists, B2 discovery is creative) is a category failure regardless of the composite — fix it before optimizing anything else.

## How to Use This Scorecard

- **Quarterly audit.** Score each active product line once a quarter. Track scores over time; expect movement, not perfection.
- **New-product readiness gate.** Before staffing a new product, the team should be able to score 7+ on A1–A5 and B1–B3 for it specifically.
- **Re-org input.** When considering an org change, score before and after; if the change drops any dimension below 5, surface that risk before committing.
- **Pair with the doctrine.** Each row of this scorecard maps to one or more chapter docs under `inspired/chapters/`. When a score is low, read the corresponding chapter for the specific remedy.
