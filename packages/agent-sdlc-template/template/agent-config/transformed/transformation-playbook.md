# Transformation Playbook

A distillation of Parts VIII–IX of *TRANSFORMED* — how a company actually moves from its prior model to the product operating model.

This is not a recipe. The book explicitly rejects any one-size-fits-all transformation method:

> "One thing you won't find in this book is any sort of recipe or playbook for transformation. Many people out there will try to sell you such a thing, but unfortunately, we have never seen these one-size-fits-all, overly simplified approaches work."

What follows is the structured set of techniques the book identifies as common to successful transformations — adapted, sequenced, and combined to fit the company's actual situation.

## The Transformation Outcome

Before tactics, define success.

The end state is a company that can:

- Respond quickly to threats and take advantage of opportunities
- Generate consistently better return on technology investment
- Innovate on behalf of customers
- Retain top product, design, and engineering talent
- Improve employee morale and retention across the company — not only inside product

If the company's reason for transforming does not reduce to *"we need to be able to do X that we can't do today, and X matters because Y"*, the transformation will lose steam at the first organizational friction point. The CEO must be able to articulate this in one or two sentences.

## Transformation Assessment

Before tactics, take stock. The assessment has two layers.

> "The assessment is not assessing individuals; it is assessing the particular model being used to produce products."

Framing matters: a personnel-focused assessment triggers defensiveness, sabotage, or attrition. A model-focused assessment opens the door to "how can I be part of the change?"

### Layer 1: High-Level Assessment

Three questions, mapped to the [three dimensions of transformation](product-operating-model-doctrine.md#the-three-dimensions-of-transformation):

**How products are built and deployed**
- How often do teams release? Independently or as one integrated package?
- What happens when a customer hits a critical bug? What does it take to "release with confidence"?
- Manual or automated? Who's accountable for working software?
- Team autonomy: complaints about cross-team dependencies? Narrow ownership?
- Is everything released instrumented? Who looks at the data?
- Perception of engineering: fast, high-quality, trustworthy?
- Technical debt: severe? Plan? Progress?

**How problems are solved**
- How is work given to teams? Roadmaps of features and projects? Where do those features come from?
- When teams start work, what's the process? Who writes the requirements? Evidence or opinion?
- When do engineers and designers enter? Sprint planning, or earlier?
- Stakeholders' role in defining solutions?
- Customer interaction before the build decision?
- How often are ideas killed or changed? Who approves?
- Definition of success: shipping? Shipping on time? Achieving an outcome? What happens if a feature ships and the outcome doesn't?

**How problems are chosen**
- Who decides what gets done?
- Annual/quarterly planning process? Funds projects or teams?
- Is there a product vision? A product strategy? At what level?
- If teams work off roadmaps, who decides items? Sales? Stakeholders? CEO?
- Items on the roadmap — features or outcomes?
- How are priorities decided?
- Are desired business outcomes specified? Tracked?

### Layer 2: Detailed Assessment

Now look at each competency and concept in detail.

**Competencies (per role)**
- **Product Management**: empowered PM, feature-team PM, or delivery-team product owner? Where are they spending time — meetings or discovery? How well do they know customers, data, business, market? Training type (Agile PO vs. full PM)? Reception by stakeholders? Coaching frequency (weekly)?
- **Product Design**: understanding of service/interaction/visual/industrial design? Enough designers, or stretched across teams? Embedded as first-class team members or treated as an internal agency? Wireframe-then-prettify or partner in discovery? Prototype frequency and tools? Coaching?
- **Engineering**: focus on senior engineers in tech lead role. Difference between senior engineer and tech lead? Tech lead engaged in discovery? Visiting customers? IC or people manager? "Paved paths" for routine tasks? Engineers responsible for code quality? Outsourced engineers and which roles? How are engineers perceived?
- **Product Leadership**: people manager or coach + strategic context? Define direction and measures? Evangelize strategic context? Coaching as top priority? Aware of team work without micromanaging?

**Concepts (per concept)**
- **Product Teams**: durable or temporary project teams? Delivery teams, feature teams, or empowered? Cross-functional? Sense of ownership? Access to customers, data, stakeholders?
- **Product Strategy**: multi-year vision? Quarterly planning produces roadmaps, or product leaders produce a strategy of problems to solve based on data?
- **Product Discovery**: most companies don't actually do discovery — they do design. Is the team testing more ideas than they're building? Less than half become items in delivery? All four risks assessed (value, viability, usability, feasibility) or just feasibility/usability? Quick experiments — quantitative and qualitative? Responsibly?
- **Product Delivery**: release frequency (less than every two weeks → failed)? Continuous deployment? Instrumented? Monitored? A/B test infrastructure?
- **Product Culture**: process or principles? Top-down or trust? Predictability or innovation? Engineers as innovators? Role of fast/cheap failure?

### Anti-Patterns to Detect

- **Innovation theatre**: corporate innovation labs separated from delivery. Splitting discovery from delivery is "one of the worst things you can do." Acquisitions used as substitute for transformation usually end up expensive failures.
- **Fake Agile**: ceremonies, coaches, roles, but quarterly releases.
- **Renamed roles**: business analysts retitled as product managers; PMOs rebranded as product ops.
- **PMO disguised as product ops**: the prior model "doesn't usually go away without a fight."

## Transformation Tactics — Competencies (Chapter 30)

Competencies come **first**. Without the skills, people cannot succeed with the concepts.

### New job definitions

Failed transformations almost always skip this step. *Reset the job, then assess people against it.*

- For each role (PM, designer, tech lead, product leader) write a job definition that reflects the product model, not the prior model.
- If product model adoption affects roles outside product (BAs, project managers, certain ops roles), include those.

### Job reset

When the same title (e.g. "product manager") has been used for a fundamentally different job, **temporarily rename everyone** — e.g. "product analyst" or "product specialist" — and only restore the "product manager" title once the person has demonstrated the new competence.

This signals to the company that the role has changed *very* intentionally. Cosmetic transitions fail.

### Role balancing

After moving to the product model, companies typically end up with:
- **Fewer but stronger** product managers
- **More broadly skilled** product designers (usually too few)
- **A strong set** of engineering tech leads

A typical empowered product team has 1 PM, 1 designer, 2–10 engineers. A platform team has 1 (highly technical) PM, 4–20 engineers. **Prefer fewer, larger teams over many small ones.**

### Dealing with too few designers

Common gap; not sustainable, but bridges exist:
1. **Triage** — assign designers only to the teams in greatest need.
2. **Contract designers** — months-long freelancers, not project-tied.
3. **One designer across multiple teams** — drops off sharply beyond two teams.

### Dealing with outsourced engineers

> "Moving to the product model absolutely requires insourcing your engineers. We mean this very seriously: Just as you wouldn't outsource your CEO, you wouldn't outsource your key engineers."

- Insourcing takes real time. **The tech lead must be insourced first and immediately**. Without a tech lead, you do not have a product team.
- A smaller insourced team consistently outperforms a larger outsourced one — insourcing usually *saves* money in addition to enabling innovation.
- If your organization isn't serious about insourcing, it isn't serious about transformation.

### Raising engineer engagement

Engineers treated as mercenaries for years may say they have no interest in discovery. Strategy:

- Put discovery responsibility **in the tech lead's job description**.
- Bring engineers to **customer visits**. The impact is "remarkable."

### Product managers and line-of-business managers

In domains where a PM works alongside a category manager / editor / line-of-business owner:
- PM owns the holistic digital/omnichannel experience.
- Counterpart owns the underlying content or service.
- **Watch out**: business counterparts often want PMs to revert to order-taker order-takers. That ends transformation. If the issue is genuine PM incompetence, occasionally letting the counterpart take over the PM role works — *if they can be coached into it*.

### New recruiting practices

- Hiring managers must own recruiting. HR can support, not own.
- Interview teams must know what to look for *and* what the candidate is assessing.
- Product-model companies are more attractive to top product talent — leverage that.

### Assessments and coaching plans

For every person in the new roles: assess against the bar, identify gaps, build a coaching plan.

### Onboarding programs

A **product model onboarding program** is one of the most scalable education techniques. Ideally teams attend together, with stakeholders dropped in at relevant moments.

## Transformation Tactics — Concepts (Chapter 31)

Once competencies exist, work the concepts:

### Product Teams

- **Team chemistry** — skills alone don't make a team. Coach or reshuffle to get chemistry right.
- **Team durability** — stop shuffling people between teams as a default. Move people only with careful consideration. Stability builds discovery skill.
- **Review team topology** — most companies have an accidental topology (Conway's Law). Topology should reflect the long-term vision/strategy. Disruptive to change, so do it deliberately and rarely.

### Product Delivery

- Move release cadence to **every two weeks at minimum**, ideally continuous deployment.
- Invest in **instrumentation, monitoring, deployment infrastructure** (A/B test capability, feature flags).
- For organizations that have to keep the lights on while transforming, the book recommends targeting one product/team at a time as a "lighthouse" — see Pilot Teams below.

### Product Discovery

- Start the team using **prototypes, customer testing, A/B tests** — at least 1–2 orders of magnitude cheaper and faster than building.
- Discovery should produce **more discarded ideas than items in delivery**. If everything tested gets built, it isn't discovery.
- Cover all four risks: value, viability, usability, feasibility.

### Product Strategy

- Establish a **multi-year product vision** as the higher-altitude unifier.
- Develop an **insight-driven product strategy** that selects 2–3 focus areas.
- Translate focus + insights into **team objectives** (quarterly, problems to solve, measurable outcomes).

### Product Culture

- Replace process gates with **principles + judgment**.
- Replace command/control with **context** ("lead with context, not control").
- Replace predictability obsession with **innovation discipline** (innovation is unpredictable on any single bet; cultivate the portfolio).
- Make **fast/cheap failure** safe and celebrated as learning.

## Transformation Tactics — Adoption (Chapter 32)

How transformation enters the organization.

### Pilot Teams

Pick one or two pilot teams to demonstrate the product model before scaling. The pilots:
- Show what is possible
- Generate quick wins
- Train the first cohort of product-model talent
- Build the case for skeptical stakeholders

### Product Model Dimensions

Recall the three dimensions from the [doctrine](product-operating-model-doctrine.md):
- Changing how you build
- Changing how you solve problems
- Changing how you decide which problems to solve

Each is a spectrum. Most successful transformations work on **all three in parallel** rather than sequentially — but the order of investment within each varies by where you are.

### Top Down and Bottom Up

Transformation needs **both**:
- **Top-down**: the CEO and executives must visibly support it. *The company cares about what the leader cares about* (Bill Campbell).
- **Bottom-up**: product leaders and product teams must build new skills, demonstrate results, and earn trust.

### Coaching Stakeholders

Stakeholders need to learn the new way of partnering with empowered teams. Coach them through:
- Outcome-based roadmaps (replace feature roadmaps gradually — see [Concepts](product-model-concepts.md))
- High-integrity commitments as the exception, not the rule
- Disagree-and-commit when product teams propose contrarian solutions

### Stakeholder Briefings

Regular forums where product teams share strategy, discovery findings, and outcomes with the business. Replaces "approval meetings" with shared understanding.

### Managing Existing Commitments

You can't shut off the prior model overnight. The book's guidance: honor existing high-integrity commitments while reshaping how *new* commitments are made.

## Transformation Evangelism (Chapter 33)

Transformation never *finishes*. There are always new joiners, drifting practices, and stakeholders looking to slide back.

### The Transformation Plan

A working plan (not a Gantt chart) covering: which competencies are being built first, which pilot teams, which key milestones, which stakeholder coaching, what evangelism rhythm.

### Continuous Evangelism

> "Evangelism is something that never finished. It needs to be constant."

Daily in 1:1s, weekly in team meetings, monthly in all-hands, quarterly in board meetings, ongoing in customer briefings — the strategic context must be communicated constantly. The larger the org, the more relentlessly.

### The Value of Quick Wins

Quick wins generate the political capital needed for the deeper changes. Identify and broadcast them.

### Constantly Beat the Drum

Resist the temptation to declare victory and move on. The product culture takes years to build and weeks to lose.

## Transformation Help (Chapter 34)

You will likely not have all the in-house expertise to coach the new competencies. Four sources of help:

### Managers as Coaches

The first and primary source. Every PM, designer, tech lead, and product leader should have a manager committed to coaching them weekly.

### In-House Product Coaches

Dedicated coaches embedded with teams. Useful at scale; risky if the coach is from the prior model (Agile coaches who don't understand the product model).

### External Product Coaches

Short-term injection of expertise. The book profiles several (Gabrielle Bufrem, Hope Gurion, Margaret Hollendoner, Stacey Langer, Dr. Marily Nika, Phyl Terry, Petra Wille) — read those profiles to understand what excellent product coaching looks like.

### Finding a Product Coach

Vet for: hands-on experience in the product model (not consulting frameworks), references from successful transformations, coaching style vs. directive style. *Beware coaches selling a particular method.*

## The Role of the CEO (Recap from Doctrine)

The CEO needs to be the **chief evangelist** for the product model. Not because the CEO runs the transformation operationally — that belongs to product leaders. But because:

- Transformation affects every department.
- Stakeholders all report to the CEO.
- *"The company cares about what the leader cares about."*

CEO behaviors that signal commitment:
- Public reference to the product model in all-hands, board meetings, customer briefings
- Visibly defending product teams' empowerment when stakeholders push back
- Refusing to demand detailed multi-year roadmaps
- Asking about outcomes, not feature lists
- Pulling product leaders into strategic conversations

CEO behaviors that signal the transformation has stalled:
- "Just give me the roadmap"
- Reshuffling teams around quarterly priorities
- Replacing product leaders with consultants
- Letting CFO/PMO seize control of "predictability"

## Transformation Stories (Parts V, VII, IX)

The book interleaves three detailed transformation stories. Read each in full for pattern recognition:

- **Trainline (Part V)** — UK rail/coach booking. Detailed transformation case study.
- **Datasite (Part VII)** — secure data rooms for M&A. Detailed transformation case study.
- **Adobe (Part IX)** — well-known. Detailed transformation case study.

Plus innovation stories (case studies of *what becomes possible* after transformation): Almosafer (Ch 14), Carmax (Ch 20), Gympass (Ch 27), Datasite (Ch 35), Kaiser Permanente (Ch 47), Trainline (Ch 49).

## Common Threads in Successful Transformations

From the book's case studies (drawn together in [Chapter 48](chapters/ch48-keys-to-successful-transformation.md)):

1. **The CEO** is the chief evangelist (not the CIO, CDO, or chief transformation officer).
2. **Technology's role** is to power the business, not to serve "the business."
3. **Strong product leaders** — recruited, not retitled.
4. **True product managers** — competence over title.
5. **Professional product designers** — first-class team members.
6. **Empowered engineers** — insourced, engaged in discovery.
7. **Insights-based product strategy** — not stakeholder priorities.
8. **Stakeholder collaboration** — partnership, not subservience.
9. **Continuous evangelization of outcomes** — never finished.
10. **Corporate courage** — the willingness to disrupt yourselves before someone else does.

## Related Documents

- [Doctrine](product-operating-model-doctrine.md)
- [Product Model Competencies](product-model-competencies.md)
- [Product Model Concepts](product-model-concepts.md)
- [Objections Handbook](objections-handbook.md) — for the resistance you will encounter
- [Chapter 28 — Transformation Outcome](chapters/ch28-transformation-outcome.md)
- [Chapter 29 — Transformation Assessment](chapters/ch29-transformation-assessment.md)
- [Chapter 30 — Tactics: Competencies](chapters/ch30-transformation-tactics-competencies.md)
- [Chapter 31 — Tactics: Concepts](chapters/ch31-transformation-tactics-concepts.md)
- [Chapter 32 — Tactics: Adoption](chapters/ch32-transformation-tactics-adoption.md)
- [Chapter 33 — Transformation Evangelism](chapters/ch33-transformation-evangelism.md)
- [Chapter 34 — Transformation Help](chapters/ch34-transformation-help.md)
- [Chapter 48 — Keys to Successful Transformation](chapters/ch48-keys-to-successful-transformation.md)
