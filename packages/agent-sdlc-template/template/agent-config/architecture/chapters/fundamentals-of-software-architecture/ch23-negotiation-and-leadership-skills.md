# Chapter 23: Negotiation and Leadership Skills

## Core Principles
- Every architecture decision will be challenged — by developers, by other architects, by business stakeholders. Negotiation is a core skill, not an optional soft skill.
- With **business stakeholders**: trigger words like "always," "never," "impossible," "zero downtime," "five nines" are signals about what they care about, not literal requirements. Translate jargon into concrete units (minutes of downtime per year, dollars, weeks). Lead with business value, not cost; save cost-and-time as a last-resort tactic. Use **divide-and-conquer**: maybe one critical path needs five nines, not the whole system.
- With **other architects**: leave egos at the door. Keep tone calm and reasoning concrete. **Demonstration defeats discussion** — run the experiment, show the result, end the argument. If alignment is reached privately, present a united front publicly.
- With **developers**: never dictate without justification. State the *why* before the *what*, because once someone disagrees they stop listening. When a developer pushes back, let them try to prove their alternative — either they discover the constraint themselves (you win, they own the decision), or they find a solution you missed (you also win). Avoid the Ivory Tower anti-pattern.
- The **4 C's of architecture**: Communication, Collaboration, Clarity, Conciseness. Accidental complexity ("we made the problem hard") is the enemy; essential complexity ("the problem is hard") is unavoidable. Don't add accidental complexity to look smart or stay relevant.
- Be **pragmatic yet visionary**: hold a strategic view, but constrain it with budget, time, team skill, trade-offs, and technical limits. Pure vision without pragmatism doesn't ship; pure pragmatism without vision rots.
- Lead by example, not by title. Use people's names. Ask questions ("Have you considered…") instead of issuing orders ("You must…"). Turn demands into favors when appropriate.
- **Integrate with the development team**: control your meeting load (ask why you're needed, ask for agendas, leave when your part is over); sit with the team or walk the floor; protect developer flow when calling meetings.

## Enforceable Rules
- PR review comments and design-doc feedback MUST include justification ("because X"), not bare directives ("change this"). Reviewers requesting changes without rationale are themselves giving low-quality review.
- Architecture decisions that are negotiated and agreed verbally MUST be written up (ADR or Linear comment with permalink) before they are considered binding; verbal-only agreements re-litigate themselves.
- Diagrams, decisions, and explanations should favor conciseness — if a single architecture diagram needs five layers of zoom to understand, accidental complexity is suspected and a review is in order.
- Negotiations with business stakeholders should be recorded in business-relevant units (downtime minutes, dollars, weeks-to-market), not jargon ("nines", "TPS", "P99").

## Review Questions
- Does this PR or design doc explain *why*, not just *what*? Could a developer who disagrees with it engage with the reasoning?
- Has the proposal been validated by demonstration (benchmark, proof-of-concept, prototype) where the disagreement is technical?
- Has the cost/time framing been kept as a tactic of last resort, or did it dominate the discussion and crowd out better arguments?
- Is the system or change as simple as the problem demands, or has accidental complexity been added?

## Examples
### Violation
Reviewer leaves "Use messaging here." on a PR with no rationale. The author, who picked REST after a benchmark, ignores it. Two weeks later the same disagreement re-runs in Slack, blocking a release.
### Good Implementation
Reviewer leaves: "Because the downstream consumer is bursty and the upstream caller doesn't need a synchronous answer, messaging here would absorb spikes and decouple deploy cycles. If you've already evaluated this and chose REST, can you link the rationale? Otherwise I'd like to see a small benchmark before merging." — Justification, demonstration request, and openness to being wrong.

## Implications
### For Agents
- Agents (Claude/Codex) operate as a member of the development team, not above it. When proposing changes, give the *why* first; when requesting changes in review, name the reason and where possible link a demonstration.
- Don't escalate "always" / "never" / "must" language in design discussions. Translate into concrete trade-offs, costs, and characteristics. Avoid Ivory Tower posture.
- When proposing alternatives in a PR review, where feasible run the proof-of-concept yourself and attach the result rather than asking the human to do it — demonstration defeats discussion is doubly true when the agent can produce the demonstration.
- Keep diagrams, ADRs, and comments concise. If the explanation is getting long, the design is probably too complex.
### For Tickets/PRs/CI
- Linear issue and PR templates should make rationale ("why now / why this") a first-class section, not an afterthought.
- Code review etiquette: a "Change requested" without a justification is itself a defect of review. CI cannot enforce this, but a culture and reviewer checklist should.
- Meetings spawned by ticket discussions should produce a written outcome attached to the ticket — verbal-only outcomes don't survive context resets, agent or human.
