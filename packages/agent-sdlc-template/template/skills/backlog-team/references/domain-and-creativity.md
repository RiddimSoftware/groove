# Domain Grounding & Creative Brainstorming

Two halves of the same skill: you can't be creative about a domain you don't understand, and you can't fully understand a domain until you've stretched it.

---

## Part 1 — Domain grounding

Before drafting any tickets, the Backlog Team must hold a working model of the project's domain. Tickets generated without it use wrong vocabulary, target wrong personas, and pull wrong levers.

### The seven questions

Derive answers from available sources first. Sources to read, in priority order:

1. Project `CLAUDE.md` `## Domain` section, if present (canonical — overrides everything else).
2. All `~/.claude/projects/<project>/memory/project_*.md` files (rich, accumulated context).
3. Project `README.md`, `docs/`, marketing copy in repo (positioning, audience, tone).
4. Sample of recent Linear issues via `list_issues` (vocabulary, personas, scope language).
5. `git log --oneline -50` (recent intent signals).
6. Package manifests (Podfile, package.json, build configs) for tech stack + integrations.

Synthesize a coherent brief from these. Treat the seven questions as the structure for the brief; don't insist on filling every one if the project simply doesn't have an answer (e.g. a pre-revenue project may not have a monetization model yet).

**Escalate only when:**
- A domain question is genuinely empty in every source AND it materially affects the work in this session (e.g. you're shaping a monetization-related initiative and the monetization model is unknown).
- The user's stated objective conflicts with what you derived.

Don't escalate for peripheral gaps. Proceed silently when the derived brief is good enough to draft tickets in the right vocabulary with sensible acceptance criteria.

1. **What is this project's role in the world?**
   One paragraph. What problem does it solve, for whom, and why does that matter? If you can't say it without using the project's marketing copy, you don't know it yet.

2. **Who interacts with it?**
   Real personas, framed as jobs-to-be-done — not demographics. "Sports bettor tracking weekly P/L across multiple sportsbooks" beats "men 25–45". Capture the situation that triggers use, the motivation, and the desired outcome (Klement-style job stories).

3. **What industries / domains does it touch?**
   Direct + adjacent. For bettrack: sports betting, prediction markets (Kalshi, Polymarket), sportsbook UX, fantasy sports, payment rails, mobile OCR, regulatory compliance (DraftKings, FanDuel state-by-state rules). Adjacent industries leak ideas — borrow.

4. **How is it monetized?**
   Subscription / fees / ads / marketplace / freemium / data licensing / future plans. This shapes what "valuable" means at the story level. Free-tier users care about different things than paying users.

5. **What's the competitive landscape?**
   Who else solves this? What's our differentiator? List 3–5 competitors and the one-line difference. If we can't articulate the diff, that's a strategy gap, not a domain gap — flag it.

6. **What language do users speak?**
   Domain jargon. "Parlay" not "combo bet". "DFS" not "fantasy". "P/L" not "profit". Tickets and copy must use the audience's vocabulary so implementors don't have to translate.

7. **What constraints apply?**
   Regulations (KYC/AML, geo-restrictions, age verification), platform rules (Apple App Store, Google Play, Stripe restricted businesses), brand guardrails ("we don't promote losses-chasing"), technical (battery, offline, rate limits).

### Persisting domain knowledge

If the user answers domain questions in-session and the project's `CLAUDE.md` doesn't already cover them, suggest the user add a `## Domain` section to project `CLAUDE.md`. Recommended structure:

```markdown
## Domain

**Role in the world:** <one paragraph>

**Primary personas (JTBD):**
- <situation> → <motivation> → <outcome>
- ...

**Industries touched:** <list>

**Monetization:** <model + tier breakdown>

**Competitive landscape:** <3–5 named competitors + diff>

**User vocabulary:** <jargon glossary, 5–10 terms>

**Constraints:** <regulatory / platform / brand / technical>
```

Once stored, future Backlog Team sessions inherit it for free.

---

## Part 2 — Creative brainstorming

The Backlog Team is **proactive, not reactive**. Beyond delivering on the user's stated objective, generate 2–3 ideas the user did not ask for. Some land, most don't — the cost of generating is low, and the few that land are differentiating.

Rotate techniques per session. Repetition dulls the lens; variety surfaces different ideas.

### Crazy 8s — quantity-forcing
Eight ideas in eight minutes. One per minute. No editing. Force quantity to break past the obvious. After the eight, rank: top 2 advance to risk-assessment, rest discarded.

Best when: the team has converged on an obvious direction too quickly.

### SCAMPER — lens rotation
Apply each lens to the current product or workflow:
- **S**ubstitute — what could replace a component? (e.g. swap manual entry for OCR)
- **C**ombine — what two features merge well? (e.g. tracker + leaderboard)
- **A**dapt — what does industry X do that we could borrow?
- **M**odify / magnify — what if we did 10× more of this one thing?
- **P**ut to other use — who else could use this besides current personas?
- **E**liminate — what could we remove and have the product still work?
- **R**everse / rearrange — what if the user did the workflow backward?

Best when: the product feels mature and incremental ideas dominate.

### Reverse brainstorming — invert
Ask: "how would we make this *worse* for users?" List the answers. Then invert each — those are real ideas. Easier to generate "make worse" ideas than "make better" ones, and they reveal weak points.

Best when: the team is stuck on a positive framing.

### Magic wand — feasibility-bypass
"If a feature could just exist, ignoring engineering cost, what would it be?" Ask the question seven times for seven distinct answers. Then assess each for feasibility. Common outcome: 2 of the 7 turn out to be cheaper than expected.

Best when: budget anxiety is shrinking the team's imagination.

### Analogous inspiration — cross-domain
"How does industry X solve a similar problem?" Concrete examples that travel:
- How does Amazon handle returns? (one-tap, no-questions, drives loyalty)
- How does Uber handle ETA uncertainty? (over-quote, then surprise-and-delight on under-delivery)
- How does Duolingo handle motivation? (streaks, push at vulnerable moments, social pressure)
- How does Spotify handle taste discovery? (Discover Weekly = recommendation + ritual + sense of being known)

Translate the *mechanism*, not the *feature*. The mechanism transfers; the feature usually doesn't.

Best when: the team is too domain-bound and missing principles that work elsewhere.

### First principles — assumption-breaking
Pick one assumption baked into the product. Ask "why?" five times. The honest answer at level 5 reveals a real constraint or a vestigial habit. If vestigial, that assumption is a backlog opportunity.

Example: "Why do we require a screenshot for bet entry?" → "Because OCR is more reliable than typing." → "Why is OCR more reliable?" → "Because users mistype amounts." → "Why?" → "Because the keyboard is small and amounts are long." → "Why?" → "Because we don't surface the user's typical amounts."

Surfaces a real opportunity: smart defaults from history.

Best when: the product has obvious friction nobody questions anymore.

### Persona extremes — edge personas
What would each of these want, in the next sprint?
- **Power user** — uses 2× more than average; what tool would compound their use?
- **Cautious newbie** — afraid to make a mistake; what reassurance would unlock them?
- **Professional** — uses for a living; what's the table-stakes feature they expect from any tool?
- **Casual user** — uses once a month; what would make them re-engage?
- **Skeptic / churn-risk** — about to leave; what would change their mind?

Each extreme reveals features the median user benefits from too.

Best when: the team is over-indexing on the median user.

---

## Combining the two halves

Domain grounding tells you *what's possible* in this world. Creative methods help you *find what's not yet there* in that world.

A good Backlog Team session uses domain to constrain the search space, then a creative method to push at its edges. **Bad combo:** creative methods on a poorly-understood domain → ideas that ignore real constraints. **Good combo:** domain understood deeply → creative method amplifies a known opportunity into a sharp idea.

Apply Cagan's four risks (`best-practices.md`) as a final filter on every creative candidate. Anything that fails on Value or Business Viability gets discarded, even if it's beautiful. Feasibility is a pre-Project gate the writer resolves first — settle the unknown as pre-work (a quick prototype or analysis before any issue exists) and shape it into an implementation Project, or drop it. There are no investigative / finding-only issues and no `spike` label; a question that genuinely needs a human decision goes to the Project's Human Handoff issue.
