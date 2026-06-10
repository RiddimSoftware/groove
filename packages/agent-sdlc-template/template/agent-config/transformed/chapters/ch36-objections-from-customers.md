# Chapter 36 — Objections from Customers

Objections that come directly from customers about how the product model changes their experience with the company. Most are raised in good faith and address real concerns.

## "We need your product roadmap before committing."

**Underlying need:** Enterprise customers making a substantial investment need confidence in the company's direction.

**Response:**
- The **product vision** addresses this need *better* than a roadmap. It communicates direction without the false precision of dates.
- Maintain **two roadmaps** if needed: internal (working) and external (customer-sharable, less detailed).
- Explain the inherent risks of detailed roadmaps — most published roadmap items don't ship on time, in scope, or with the predicted outcome.
- When dates truly matter for a particular deliverable, **high-integrity commitments** are appropriate — used sparingly so they remain credible.

## "It is so much work to deal with your new releases — every 3/6/12 months is all we can handle." / "We need thorough documentation and training for every new release."

Both are very legitimate, but the **root cause is releasing too infrequently**. You're delivering too much change at once and causing too much disruption.

**Response:**
- Move to **continuous delivery**: small, reliable, incremental changes. Designed so users aren't impacted, or to the degree they are, no retraining is needed.
- **Feature flagging / release dark** lets you release into production while controlling when (and to whom) the capability becomes visible.
- Point out their favorite mission-critical products work this way — browser, phone, car, washing machine.
- Customers sometimes believe less frequent releases mean higher quality. The evidence is overwhelmingly the opposite.
- If they want to recertify every week, they can — but eventually they'll trust your CD pipeline is more stable than big-bang releases.

> "Today's customers demand better than the prior era's quarterly or yearly big-bang releases."

## "We are uncomfortable with you collecting data on our use of your products."

**Response:**
- Data is **anonymized and aggregated** — no PII.
- Used to **ensure the product works for them** and to validate it's truly helping solve their problem.
- Analogy: a pilot depends on instrumentation to ensure she's on course and the plane is safe. Product teams depend on this for the same reasons.

## "We were working in your customer discovery program and got excited, but then you decided not to pursue this new product. Did we do something wrong?"

**Response:**
- Not common but it happens. Should have been set up at outset.
- Main reason: the team couldn't find a solution that works across the range of customers they were collaborating with.
- Sometimes a customer's needs really are unique and better served by a **custom development firm** than a commercial product company.

## Related

- [Objections Handbook](../objections-handbook.md#chapter-36--objections-from-customers)
- [Chapter 21 — Partnering with Customers](ch21-partnering-with-customers.md)
- [Chapter 37 — Objections from Sales](ch37-objections-from-sales.md)
