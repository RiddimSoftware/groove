# Chapter 26: Succeeding with Agile Methods

## Premise
Agile methods (Scrum, XP) were invented for custom software — where there is no real product manager, no UX designer, and the "customer" is a single contracting party — so dropping them unchanged into a product software environment leaves the discovery work undone. To succeed with Agile on a product team, the product manager owns the product-owner role, discovery runs one or two sprints ahead of engineering, and prototypes (not sprint output) are how ideas get tested with real users.

## Key Principles
- The product manager *is* the product owner, representing the customer; splitting those roles is usually a symptom of a deeper problem.
- Agile is not an excuse to skip product planning — you still need a destination, a definition of success, and a (shorter, rolling) horizon.
- Product manager and designers must stay one to two sprints ahead of engineering so difficult features get validated before they get built.
- Replace heavy PRDs and functional specs with high-fidelity prototypes and user stories — and test the prototypes with real users before sprint cycles get spent on them.
- Early sprints are not an acceptable substitute for prototypes: sprints are too slow, engineers are too expensive for discovery, and changing direction after architecture is laid down is painful even in Agile.
- In a product environment, constant change can upset users — accumulate sprint output in staging until there is enough to warrant a release.
- The Agile assumption that everything can be cheaply refactored is naive for large-scale product systems that must serve hundreds of thousands or millions of users.

## Practices
- Use lightweight opportunity assessments in place of heavy MRDs.
- Break design work into small, independent chunks — but not so small that you end up "designing a house one room at a time"; aim for the minimal possible product.
- Embed designers in the process up front; never let design happen *during* the sprint that is implementing it.
- Have engineering review the PM/designer's ideas and prototypes continuously for feasibility, cost, and better solutions.
- Build prototypes for three reasons: (1) to test with real users, (2) to force yourself to think through the issues, and (3) to describe to engineering exactly what needs to be built during the sprint.
- Let engineering chunk the work into sprints at whatever granularity they prefer — they own quality, scalability, and performance concerns.
- Require the PM and interaction designer at every daily standup; treat the standup as the *beginning* of communication, not the end, with designers previewing, developers showing completed code, and QA flagging pitfalls.
- At the end of each sprint, demo both the current state of the product and the prototype for the next sprint.
- Get Agile training for the entire team, and hire a transition consultant with proven product software (not IT/custom software) experience.
- Pick designers and design methodologies — like rapid prototyping — that can keep pace with sprint cadence; not every designer can.

## Pitfalls
- Product managers who think Agile lets them "get off easy" — they couldn't be more wrong.
- Splitting PM and product-owner across two people instead of fixing the underlying staffing problem.
- Treating early sprints as the prototype (too slow, engineers misallocated, expensive to redirect).
- Designers doing their design work *inside* the sprint that is already implementing it.
- Launching every sprint to users instead of bundling sprints into deliberate releases.
- Hiring an Agile consultant whose experience is IT/custom software, not commercial product software — they'll leave the PM and UX roles undefined.
- Believing architecture can always be refactored later — fine for most custom software, dangerous at consumer-internet scale.

## Notable Frameworks / Definitions
- **Why Agile struggles in product software (the origin argument).** Scrum was created in 1986 in Japan and grew up in the custom software world, where (a) the customer believes they know what they need, so there is no product manager; (b) UX designers are absent due to ignorance and cost sensitivity; (c) QA is rolled into the developer role; and (d) projects are small internal-IT applications with limited users, so scalability and performance pressure is low. Product software inherits Agile's benefits — better customer/engineer communication, smaller iterations, less obsolete documentation — but must re-introduce PM, UX design, and QA to make it work.
- **The Top 10 list for product software teams using Agile** (paraphrased from the chapter): (1) PM is the product owner; (2) Agile doesn't excuse missing product planning; (3) PM + designers run one to two sprints ahead; (4) chunk design work small but not too small; (5) replace PRDs with prototypes + user stories tested on real users; (6) let engineering chunk into sprints; (7) PM and designer attend every standup; (8) accumulate sprint output in staging until a release is warranted; (9) demo current product *and* next prototype at sprint end; (10) train the team and hire a product-software-savvy consultant.
