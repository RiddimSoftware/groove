# Chapter 24: Developing a Career Path

## Core Principles
- **Breadth beats depth** for architects. Technology evolves too fast to keep deep mastery of everything; the architect's job is to know *enough* about *enough* options to make good trade-offs.
- **The 20-Minute Rule**: spend at least 20 minutes a day on professional development — preferably first thing in the morning, after coffee and *before* email. Lunchtime and evenings predictably get consumed by other things. Use the time to convert "things you don't know you don't know" into "things you know you don't know."
- Build a **personal technology radar**, modeled on the ThoughtWorks Technology Radar, to formalize how you assess and track tech. Four rings: **Hold** (don't start anything new here — and, personally, also habits to break), **Assess** (worth a look, schedule a proof-of-concept), **Trial** (active research / pilot project), **Adopt** (in production, recommend broadly). Four quadrants: **Languages & Frameworks, Tools, Platforms, Techniques**.
- Treat your technology portfolio like a financial portfolio: **diversify**. Some widely-in-demand skills for stability, some speculative bets (open source, emerging platforms) for upside. Anchoring entirely to one vendor's bubble is a known career hazard.
- Use **social media** professionally: weak links (casual acquaintances, people you follow) statistically produce more new opportunities than strong links (close colleagues), because they bring information from outside your bubble. Follow technologists whose judgment you respect; mine their assess-ring picks for your own.
- ThoughtWorks released an open-source **Build Your Own Radar** visualization (Google Sheets in, HTML5 canvas out) — useful, but the radar conversations matter more than the artifact.
- Practice is the only proven path. Architects who never design seldom become great designers. Build skills through architecture katas, proofs-of-concept, and side projects.

## Enforceable Rules
- Architects (and architect-adjacent agents) MUST allocate explicit time to breadth — encode the 20-minute rule (or equivalent) as a recurring habit, not an aspiration.
- A personal radar SHOULD exist for each architect, with at least the Adopt and Hold rings populated; review at least once per quarter.
- New technology introduced into a Riddim system MUST come from somewhere on the radar (or be added before adoption) — surprise adoption from outside any assessment is the failure mode the radar is meant to prevent.
- Bubble-living signals (single-vendor stacks, single-source information feeds) SHOULD be visible to the architect and counterbalanced with deliberate weak-link consumption.

## Review Questions
- Where on the radar does this technology sit? If it's not on the radar at all, why are we adopting it?
- When was the last time this radar (personal or team) was updated? If "Hold" still lists technologies the org abandoned years ago, the radar is dead.
- Is the current learning habit producing actual signal (new things assessed, old things retired) or just consumption?
- Are the information sources feeding the radar diverse enough — multiple vendors, multiple communities — to avoid echo-chamber drift?

## Examples
### Violation
An architect's stack hasn't changed in five years, their reading is mostly the official blog of one cloud vendor, and a new system gets adopted "because everyone's using it" with no record of an assessment phase. When the technology shifts, the team is caught flat-footed.
### Good Implementation
A quarterly-updated radar lives in the team's repo. New technologies enter at **Assess**, get a documented proof-of-concept, then either graduate to **Trial** or move to **Hold**. The architect spends 20 minutes a morning across a deliberately diverse set of sources — InfoQ, the ThoughtWorks Radar, a couple of community blogs, talks from recent conferences — and the radar reflects what was actually learned.

## Implications
### For Agents
- This is what an agent emulates, not what it experiences: when humans interact with an agent, they expect the agent to *behave* as if it had a current, well-maintained radar — i.e., to know the modern landscape across Languages & Frameworks, Tools, Platforms, and Techniques broadly, not just one stack.
- When recommending technology in a PR or design doc, the agent should frame the recommendation in radar terms ("this is in widespread Adopt territory" / "this is still emerging — Assess only, no production commitment yet") rather than asserting flatly.
- Default to breadth in suggestions — when asked "which X should I use?", offer a small set with trade-offs, not a single dogmatic answer, unless the org has already documented an Adopt-level choice.
### For Tickets/PRs/CI
- When a Linear issue proposes adopting a new technology, the writer should locate it on the org's radar (or add it to Assess with a proof-of-concept) before the issue is considered ready.
- Proof-of-concept work is the radar's mechanism for moving things between rings — its output is evidence documented in `docs/`, and any resulting change still ships as a normal implementation PR.
- Quarterly (or factory-time equivalent) review of the team radar — what moved rings, what was retired — belongs in the planning cadence alongside backlog grooming.
