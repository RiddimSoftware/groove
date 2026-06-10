# Chapter 20: Analyzing Architecture Risk

## Core Principles
- Risk is two-dimensional: **impact** × **likelihood**, each rated low (1), medium (2), or high (3). The product is the risk score: 1-2 low, 3-4 medium, 6-9 high. Assess impact first, then likelihood.
- A **risk assessment** aggregates risk scores by characteristic (Availability, Performance, Security, Data Integrity, Scalability, etc.) and by service/domain area; a snapshot alone is misleading — render **direction of risk** with arrows or +/- so a reader can tell if things are improving or degrading.
- No single architect can see all the risk. **Risk Storming** is a collaborative exercise across architects, tech leads, and senior developers, with a chosen risk dimension (e.g. availability, elasticity, security) and an up-to-date architecture diagram.
- Risk Storming has three phases: **Identification** (each participant rates risk *independently* to avoid groupthink), **Consensus** (collaborative — discuss outliers, reach agreement, place sticky notes on the diagram), **Mitigation** (collaborative — propose architectural changes; cost trade-offs go back to business stakeholders).
- Unknown or unproven technology always gets the highest rating (9), because the risk matrix cannot meaningfully be applied to something nobody on the team understands.
- Restrict each storming session to a **single dimension** when possible, so participants stay focused. The exercise is recurring — re-run after major features, end of iteration, or significant refactors.
- The same risk matrix works for **Agile story risk** during grooming: impact = consequence of the story slipping, likelihood = probability of it slipping.

## Enforceable Rules
- Any service introducing a new external dependency, a new datastore, or a new SPOF MUST carry a documented risk assessment (impact + likelihood + direction) before merging.
- Unknown/unproven technologies introduced into the architecture MUST be flagged as risk level 9 until a proof-of-concept or trial has produced concrete evidence to lower the score.
- Risk Storming sessions held against a system MUST produce a list of identified risks and either a mitigation plan, an accepted-as-is decision (recorded in an ADR), or a follow-up ticket; no risk leaves the session unowned.
- Direction of risk MUST be tracked over time — a single-point-in-time risk score without trend is incomplete.

## Review Questions
- What dimension(s) of risk does this change move, and in which direction?
- Has the risk on this surface been re-storming since the last major change?
- For any new technology in this PR, has it been used in production by the team before? If not, why is the risk score not 9?
- Where are the mitigation actions for the most recent high-risk items, and which of them have actually shipped?

## Examples
### Violation
A PR adds a new third-party diagnostics engine to the request path. No mention of throughput limits, SLA, or fallback. The team learns in production during a load spike that the engine caps at 500 req/s and there is no back-pressure.
### Good Implementation
The same change ships with a recorded risk assessment: Elasticity rated high (9) due to 500 req/s ceiling and unknown likelihood of spike, mitigated by an async queue between the API gateway and the engine plus a cache for predictable hot questions; the engine's published SLA is captured in the architecture diagram; a follow-up ticket tracks measurement of actual throughput post-launch.

## Implications
### For Agents
- When proposing or implementing changes that introduce external systems, new failure modes, or new performance ceilings, produce a small impact/likelihood table in the PR description; do not bury risk in narrative prose.
- When asked to integrate an unfamiliar technology, treat it as risk 9 by default. Ask for, or run, a proof-of-concept that produces concrete numbers (throughput, latency, failure modes) before promoting to a lower score.
- During multi-issue planning, apply the same matrix to story risk: which stories are most likely to slip, and what is the impact if they do?
### For Tickets/PRs/CI
- Linear issue templates for architecturally-shaping work should include a "Risks" section with impact, likelihood, direction, and mitigation.
- Recurring (per-cycle or per-feature) Risk Storming should produce Linear issues for each identified mitigation, owned and tracked like any other backlog item.
- CI fitness functions are the operational counterpart of "direction of risk" — degradations in latency, error rate, or coverage are the data that moves the arrow.
