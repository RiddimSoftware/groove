# Artifact Types

The Backlog Team produces issues for more than software. Each artifact type has its own Project shape, Issue shape, and success-metric pattern. Don't bury non-software work as child Issues under a code Project — it gets lost in triage.

Five artifact types covered: software, tests / evidence, marketing, design / Figma, content.

---

## Software

The familiar case. Standard Project + Issue + child-Issue hierarchy (Linear has no Sub-task primitive — use `parentId` for finer breakdown).

### Project shape
- Objective + Why now
- Cagan four risks
- Architecture & data model
- Sequencing & dependencies
- Success metrics (usually behavioral or system-level)
- Done definition

### Issue shape
- User story (As-a / Job Story / Hypothesis depending on context)
- Inputs (data shapes, design files, prerequisite tickets)
- Deliverables (numbered, concrete)
- Acceptance criteria (Gherkin or checkboxes)

### Acceptance criteria style
- Gherkin for complex state machines, API contracts, regulatory paths.
- Checkbox plain language for everything else.
- Always include error / edge state ACs explicitly.

### Success metrics
- System-level: latency, error rate, crash rate, build time.
- Behavioral: feature adoption, time-to-task-completion, retention deltas.
- Business: conversion, revenue impact (when measurable).

### Example title
`Implement schema-driven My Bets parser for bet365`

---

## Tests / Evidence

Distinct from software Issues that *include* tests — these Projects exist when the test apparatus *itself* is the deliverable, or when running tests at scale is the value.

### When to use
- Building a test harness, eval suite, or annotation pipeline.
- Running a one-time evidence campaign (eval accuracy, visual snapshot baseline).
- Standing up regression infrastructure (visual diff, perf baseline).

### Project shape
- Objective: what question does this evidence answer?
- Hypothesis: what we expect; what would change our minds.
- Methodology: data source, sampling, scoring, baseline.
- Success: signal threshold; what counts as "result obtained."

### Issue shape
- Hypothesis-driven format default: `We believe <X>. We'll know we're right when <signal>.`
- Inputs: dataset, harness location, scoring config.
- Deliverables: report file, dashboard, artifact path.

### Acceptance criteria style
- Quantitative thresholds: "score ≥ 0.85 on dataset Y."
- Reproducibility: "harness re-runs in CI with green status."
- Documentation: "method written up at `docs/<topic>.md`."

### Success metrics
- Coverage: what fraction of the surface is tested.
- Signal-to-noise: false-positive rate, flake rate.
- Trust: did the team act on the result? Did defects drop afterward?

### Example title
`Build eval harness for schema-engine accuracy across 17 bookmakers` (BAP team)

---

## Marketing

Themes (quarters) → Projects (campaigns) → Issues (assets / launch phases).

### When to use
- Campaign launches (paid social, influencer, SEO push).
- Content sprints (blog, email, social posting cadence).
- Brand or positioning rollouts.
- Distribution partnerships.

### Project shape
- Objective: target outcome (acquisition, activation, retention, awareness).
- Channel mix: paid social / influencer / SEO / email / partnerships, with budget allocation.
- Audience: persona being targeted (specific, not generic).
- Hypothesis: "We believe <channel> will deliver <metric> at <CAC>."
- Sequencing: blocking dependencies (analytics → landing page → channel spend).
- Kill criteria: at what CAC / metric do we pause spend.
- Done definition: campaign-end criteria + post-mortem story.

### Issue shape
- Default User Story for asset-creation work; Job Story for B2B segments; Hypothesis-driven for paid spend.
- Inputs: brief, brand guidelines, target audience definition, budget.
- Deliverables: copy, creative, schedule, attribution setup.
- AC: includes brand approval, legal sign-off where applicable.

### Acceptance criteria style
- Plain checkbox: "copy reviewed by brand," "tracking links validated."
- Quantitative for performance Issues: "CTR ≥ 2%, CPM ≤ $X."

### Success metrics
- Acquisition: installs, sign-ups, CAC.
- Activation: D1 / D7 retention, time-to-first-value.
- Awareness: reach, impressions, branded-search lift.
- Always tie to the project's North Star.

### Example title
`Launch beta campaign — first 100 users on s2sbets.app within 30 days`

---

## Design / Figma

Standalone design Projects, distinct from design child Issues within software Projects.

### When to use
- New surface area (new screen / flow that doesn't exist yet).
- Design-system component additions or revisions.
- Brand refresh / visual identity work.
- Motion or interaction-pattern definition.

### Project shape
- Objective: which user flow / surface / system this addresses.
- User journey: storyboard or flow reference.
- States to design: empty / loading / error / success / edge cases (don't skip — implementor will need them).
- Design-system implications: which existing components, which new ones, which token changes.
- Handoff: what the engineer receives (Figma frames + tokens + behavior notes).

### Issue shape
- Default format: "Design <surface> for <persona> in <context>."
- Inputs: PRD or parent Project context, existing design system, brand guidelines.
- Deliverables: Figma frames (linked), interactive prototype if needed, motion specs if applicable.
- AC: includes "all states present," "tokens used (no raw hex)," "components reused (or new ones registered)."

### Acceptance criteria style
- Checkbox list focused on completeness — empty / loading / error / success / edge / accessibility states.
- "Reviewed by [stakeholder] in design crit" if process exists.

### Success metrics
- Implementation accuracy: visual diff between built UI and Figma.
- Component reuse rate (lower is worse — means we're inventing).
- Usability: task-completion rate, hesitation time in user testing.

### Example title
`Design onboarding flow for first-time bettors — mobile-native, 3-step`

---

## Content

Blog posts, help docs, video scripts, social content. Treat as backlog-managed, not as ad-hoc.

### When to use
- Content sprints (multiple pieces under a theme).
- Help docs / knowledge-base buildouts.
- Video / podcast / long-form content production.
- SEO content programs (linked to Marketing Projects).

### Project shape
- Objective: SEO ranking, education, brand voice, support deflection — be specific.
- Audience: who's reading, at what stage of the funnel.
- Voice / tone: linked to brand guidelines.
- Production model: writer / editor / SME pipeline.
- Distribution: where the content lives + promotion channels.
- Volume: target piece count for the sprint.

### Issue shape
- Per piece: `As a [reader persona], I want [topic / question answered], so that [outcome].`
- Inputs: brief (target keyword, audience, length, voice), references, SME contact.
- Deliverables: draft, reviewed, published.
- AC: SEO requirements (title, meta, internal links), brand voice check, SME accuracy review.

### Acceptance criteria style
- Checkbox covering: brief met, SEO checklist, voice review, SME review, published with tracking.

### Success metrics
- SEO: ranking position, organic traffic, time-to-first-rank.
- Engagement: time-on-page, scroll depth, return visits.
- Funnel: CTA clicks, conversion from content to product.

### Example title
`SEO content sprint Q3 — 8 long-form articles targeting top-of-funnel keywords`

---

## Cross-cutting principles

- **Each artifact type gets its own Project.** Don't make a Figma deliverable a child Issue of a software Issue; the Figma work has its own dependencies, its own reviewer, its own queue.
- **Cross-link aggressively.** A software Project that depends on design = software Project links to design Project via Linear's first-class `Blocks` / `Blocked by` issue relations. A marketing campaign that depends on a feature shipping = link both ways.
- **Every artifact type uses INVEST + DoR + DoD.** The criteria translate; only the specifics change. A marketing Issue should still be Independent, Negotiable, Valuable, Estimable, Small, Testable, with a concrete Definition of Done in the body.
- **Match success metrics to artifact type.** Don't measure a content piece by SLO and don't measure a feature by SEO ranking. Each type has its own measurement language.
