# Chapter 37: Keys to Consumer Internet Service Products

## Premise
Large-scale consumer internet services have a unique upside — direct, real-time
contact with millions of users, no sales force in between — and a unique set of
hard problems that come with that scale. The chapter lists ten techniques that
matter disproportionately for e-commerce, social networks, search, games, and
similar consumer services.

## Key Principles
- With a consumer service, there is no sales channel to compensate for a weak
  product; the user experience IS the product.
- Performance is a usability concern. A slow page is a broken page — users
  conclude it's broken or simply leave.
- Scale changes everything. Databases break, performance bottlenecks emerge,
  and UIs become unusable in ways load testing won't catch. Surprises are
  guaranteed.
- The community of users can make or break a consumer service. Loyalty must be
  earned and visibly returned — lip service does not work.
- Customer support costs can bankrupt a consumer service. Designing the product
  to minimize support contact is mandatory, but the goal is a great experience,
  not just lower cost.

## Practices
- Segment users into the most important personas and evaluate every feature
  against each persona — at scale, there is no single "user."
- Allocate roughly 20% of engineering and operations capacity on an ongoing
  basis to scale and infrastructure work. Pay the tax continuously from day one
  rather than waiting for the "house of cards" to collapse.
- Design-in high availability everywhere — there is no off-hour for a
  consumer service.
- Put privacy and data protection in early, including protecting user data from
  your own employees.
- Make viral marketing structurally easy: build sharing into the product, and
  consider funneling part of the customer-acquisition budget to users instead
  of to ads.
- Architect for localization from the start; a service that works will spread
  past your home country/language faster than you expect.
- Deploy gently: ship gradually, run new alongside old to let users switch on
  their schedule, eliminate gratuitous changes.
- Make community management a top priority from CEO down — listen, reach out,
  and visibly recognize the contributors who matter.

## Pitfalls
- Treating consumer-grade usability as optional, the way many enterprise
  vendors do.
- Letting scale work slip until everything breaks at once.
- Collecting personal data for "innocent" reasons and then discovering the
  exposure when something goes wrong.
- Pushing big changes on your timetable instead of the users' — gratuitous
  updates burn community goodwill.
- Treating support cost optimization as the goal instead of a great customer
  experience.

## Notable Frameworks / Definitions
The chapter's top-10 list of consumer-internet-service practices:

1. **Usability** — there is no getting around that the experience IS the
   product; performance is part of usability.
2. **Personas** — segment millions of users into the personas that matter and
   evaluate features against each.
3. **Scalability** — allocate ~20% of engineering and ops capacity to scale
   continuously; load testing only catches the easy cases.
4. **Availability** — design-in high availability; there is no off-hour.
5. **Customer support** — design and build the product to absolutely minimize
   support cost, while still ensuring a great experience.
6. **Privacy and data protection** — put protections in place early, including
   from your own employees.
7. **Viral marketing** — build sharing into the product; consider funneling
   acquisition spend to users.
8. **Globalization** — architect for localization from the start; the service
   will cross borders faster than you expect.
9. **Gentle deployment** — deploy gradually, run new alongside old, eliminate
   gratuitous changes.
10. **Community management** — make awareness of the community a top priority
    across the whole company.
