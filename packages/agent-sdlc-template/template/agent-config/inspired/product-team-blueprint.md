# Product Team Blueprint

A reference for how to staff and run a software product organization, distilled from Part I (People) of *Inspired*. Use this when standing up a new product line, re-shaping an existing team, or evaluating a candidate org chart against the book's principles.

## The Core Claim

Every product begins with the people on the product team. How you define the roles, and who you select to staff them, is very likely the determining factor in success or failure. Most product teams fall short here — stuck in old models, blurring roles together, or skipping roles entirely.

## The Six Core Roles

| Role | Owns | Primary skill |
|---|---|---|
| **Product Manager** | What gets built | Discovery: opportunity assessment + product definition |
| **Interaction Designer** | How the product feels to use | Persona research, task/navigation/flow design |
| **Visual Designer** | How the product looks and feels | Layout, color, typography, emotional language |
| **Engineering** | How the product gets built | Software construction for external customers |
| **Project Manager** | Schedule, tracking, release coordination | Execution discipline |
| **Product Marketing** | Telling the world | Positioning, launch, sales enablement |

For Internet services, add:

| Role | Owns | Primary skill |
|---|---|---|
| **Site Operations** | Production uptime, performance, scalability | Run the live service as a first-class competency |

Each role exists because somebody must be accountable for that outcome. Collapsing roles into one person doesn't eliminate the work; it shifts it to whoever happens to be available, which is usually nobody.

## Recommended Ratios

These are starting points, not commandments. Adjust for product type, team experience, and stage.

- **~1 product manager per 5–10 engineers.** Fewer than 5 and the PM is over-staffed; more than 10 and engineering is starved of valuable, validated work.
- **1 interaction designer per ~2 product managers.**
- **1 visual designer per ~4 interaction designers.**
- **Dedicated project manager for any project with >5 engineers.** Smaller projects can share with eng lead or PM.
- **One project manager per release train** when using train-model releases (every 1–4 weeks).

When ratios get stretched, the failure mode is consistent: engineering keeps shipping, but it ships the wrong things.

## What Each Role Actually Does

### Product Manager

Two charters:

1. **Assess opportunities.** Lightweight opportunity assessments (10 questions) instead of MRDs.
2. **Define the product to be built.** Prototype-based spec, not paper PRD. Describe behavior, not implementation.

The PM is the **single accountable owner** of what gets built. Not a scribe. Not a meeting-runner. Not a project manager. Not a product marketer.

The PM **"is the CEO of the product"** — takes the blame, gives away the credit, accepts that obstacles to shipping are theirs to overcome.

### Interaction Designer

- Build deep understanding of each target persona.
- Design tasks, navigation, and flow that are valuable and usable.
- Map product requirements to wireframes; hand them to the visual designer to flesh out.
- Collaborate continuously with the PM. Hundreds of detailed questions arise during build and test — the IxD must be present for them.
- **Do not outsource.** Three reasons: (1) deep user understanding builds across projects, not one engagement; (2) the IxD must be on hand from kickoff to launch; (3) UX is too core to the company to live outside it. If you must outsource something, outsource QA first.

### Visual Designer

- Layout, color, typography — but more than decoration: visual design **directly creates the emotion** that inspires use.
- Can be outsourced more readily than IxD, especially with a strong in-house IxD setting direction.

### Engineering

- Builds external-facing product. **Not the same as IT**, which builds internal apps.
- For Internet services, separate site operations from engineering — it demands specialized skills and is too important to be a side responsibility.
- Engineering participates in **discovery** through an architect/lead engineer reviewing prototypes for feasibility, not after-the-fact.

### Project Manager

- Owns scheduling, tracking, and the "trains" of release coordination.
- Critical attributes Cagan calls out (drawn from Lynn Reedy at eBay): self-confident with a sense of humor; brilliant at execution; loved by engineers, respected by managers, valued by execs; comfortable with status reporting; aggressive but well-liked; smart about technology; passionate about the product.
- On Scrum teams, the project manager typically serves as the ScrumMaster.

### Product Marketing

- Manage external-facing product launch.
- Position the product, equip the sales channel, lead online marketing and influencer programs.
- **Separate from product management.** Combining them rarely works — the skills are different and the bandwidth is insufficient. The "Marketing-Driven Product," "Two People One Role," and "One Person Two Roles" failure modes are all variants of this confusion.

### Site Operations (Internet services)

- Keep the production service running.
- Uptime, performance, and incident response are owned, measured, and improving over time.

## Hiring: Traits Before Skills

Cagan's framework for what makes a strong PM (Chapter 6):

### Personal traits (foundational, hard to teach)

- **Product Passion.** Genuine love for products, audible across domains.
- **Customer Empathy.** Wants to understand and serve real users, not project assumptions.
- **Intelligence.** Especially raw reasoning, not domain trivia.
- **Work Ethic.** Will outwork the team without needing to be asked.
- **Integrity.** Operational, not decorative — trust and respect are how influence works.
- **Confidence.** Comfortable making decisions and being wrong.
- **Attitude — "CEO of the product."** Takes the blame, gives away credit, owns the obstacles.

### Skills (learnable)

- **Applying Technology.** Enough fluency to converse with engineers about what's possible.
- **Focus.** Can identify what matters and protect it from distraction.
- **Time Management.** Triages an overwhelming inbox.
- **Communication Skills.** Both writing and presenting; require written work samples in hiring.
- **Business Skills.** "Bilingual" — fluent with engineers about technology and with executives about cost structures, margins, market share, positioning, and brand.

### Hiring practices

- **A's hire A's; B's hire C's.** Insecure managers shrink the team's ceiling.
- **Domain expertise is overrated.** A strong PM gets up to speed on a new domain in 1–3 months. ~80% of PM skills transfer across product types.
- **Look inside the company first.** Strong PMs hide as engineers, designers, SEs, customer service, professional services, and sales.
- **Probe product passion.** Favorite products, what they'd improve, bad products — insincere passion is audible.
- **Microsoft-style problem-solving interview.** Don't test what they know; test how they reason when they don't know.
- **Two or three of the smartest people in the company interview for raw intelligence.**
- **Reject biases.** Strong PMs exist across every age, gender, culture, and background — including non-native English speakers. The 22-year-old's idea might be the next Facebook.

## Managing Product Managers

The head of product has two charters:

1. **Build the team.** Recruit, train, develop, and (when needed) remove.
2. **Own product strategy.** The team executes; the head sets direction.

### Practices

- **Three-month immersion program for new PMs.** Use the product, study the users, ride along with customer service, sit with engineering, etc. Time-box it.
- **NPS as the primary success metric** for product organization performance.
- **Distinguish good revenue from bad revenue.** Revenue from specials, custom commitments, or undiscovered features is not the same as revenue from a coherent product.
- **Don't place product management inside marketing or engineering.** Both produce predictable distortions.

### Patton's Rule

> "Never tell people how to do things. Tell them what to do, and they will surprise you with their ingenuity."

Two-sided application:

- **Customers tell you the** ***what*** **(problem to solve), not the** ***how*** **(solution).** Their solutions are often what they already know; the PM's job is to find a better one.
- **PMs tell engineers and designers the** ***what*** **(behavior, outcome), not the** ***how*** **(implementation).** A PM who tells engineers how to build it has the wrong job.

## Influence and Authority

The product manager rarely has organizational authority over the product team. The work is done by influence:

- **Frame every decision the same way.** What problem, for whom, what goals, in what priority. Disagreements usually trace back to different weightings of priority, not different facts.
- **Be transparent in reasoning.** The team should be able to see goals, priorities, and how each option was assessed — not "the PM's intuition."
- **Escalation is a failure.** A senior manager can always make the call, but the resentment poisons the next decision and the product is the biggest loser.

## Deputy Product Managers and Hidden Talent

Strong product candidates hide everywhere in the company. The Deputy Product Manager construct (Chapter 9) is a way to surface them without prematurely committing to a hire. Six techniques Cagan recommends:

1. **Ask.** Quietly seek nominations from engineering managers and others.
2. **Management by Walking Around.** Spend time with the people doing the work.
3. **Listen.** When someone consistently asks how to get more involved with the product, that's a signal.
4. **Open Door.** Be reachable to people without a formal way in.
5. **Share.** Let candidates ride along on real product work.
6. **Hang Out.** Casual presence reveals talent that interviews miss.

## Managing Up

Direction-shift from management is the biggest frustration PMs report, especially in large companies. Churn is a feature of large-company product work, not a defect. Cagan's ten techniques for managing up (Chapter 10):

1. **Measure and plan for churn.** Track how much of each cycle goes to forward progress vs. rework; schedule with that expectation built in.
2. **Communication style and frequency.** Learn whether your manager wants continuous updates or escalation-only, written detail or a hallway chat — and meet that preference.
3. **Pre-meeting work.** Run the real meeting one-on-one with key influencers and stakeholders before the group meeting. The formal meeting is the ratification step, not the alignment step.
4. **Recommendations, not issues.** Bring an analysis of alternatives, a recommendation, and the rationale.
5. **Use your manager.** Ask them to get the access you can't — e.g., a private pre-brief with a senior stakeholder who won't make time for you.
6. **Do your homework.** Managers spot holes quickly; preparation is the defense.
7. **Short e-mails.** The more senior the recipient, the shorter the message. Offer supporting material; never require it.
8. **Use data and facts, not opinions.** Per Barksdale's rule: *"If we're going to make this decision based on opinions, we're going to use my opinion."*
9. **Evangelize.** Make the product known and exciting across the company; other groups will then find ways to help.
10. **Low-maintenance employees.** Don't use your direct manager as your mentor — find one outside the management chain.

## Common Org Anti-Patterns

- **PM-as-scribe.** PM writes specs to engineering's dictation; nobody actually discovers a valuable product.
- **PM-and-PMM-as-one.** "One person, two roles" — neither role gets done well.
- **PMM-as-PM.** "Marketing-Driven Product" — discovery becomes a market-positioning exercise.
- **Two-people-one-role.** "Two people, one role" — a PM and a PMM sharing accountability for product definition; nobody is accountable.
- **No interaction design.** UI engineers improvise; visual designer arrives at the end.
- **Outsourced interaction design.** Recurring contracts that lose the user understanding between projects.
- **Engineering reports up through IT.** External product treated as if it were an internal HR app.
- **No product manager at all.** Decisions made by exec edict, sales escalation, or the loudest engineer.

## Mapping to Riddim Software

- Riddim's autonomous Developer / Reviewer / Backlog-team / ASO-team skills mirror the role separations in this blueprint, with two notable adaptations:
  - **PM ⇄ `backlog-team` skill** for opportunity assessment, persona definition, and discovery scoping.
  - **Eng ⇄ `developer` skill**, **Project / release coordination ⇄ orchestrator + reviewer** for the execution discipline.
- The hiring principles (traits, then skills) apply to human teammates and to the model-and-prompt design of the autonomous roles.
- Charter user programs become "early-access cohorts" for each product (Bettrack, Sonnio, etc.).
- The "good revenue / bad revenue" distinction is especially important for B2B products that are tempted by special-deal commitments.
