# CX Audit Checklist

The CX Pulse walks every product through this checklist each cycle. Each line is graded **PASS / FAIL / PARTIAL** with evidence (the actual current value or the review quote that proves it). A failure maps to a deduction in [`cx-scorecard.md`](/YOUR/WORKSPACE/DIR/agent-config/cx/cx-scorecard.md) and, when the signal is new and actionable, generates a Linear issue from `ticket-templates.md`.

Grounded in the distilled canon: the **RATER** dimensions (`agent-config/cx/chapters/SERVQUAL/`), **Customer Effort** (`.../the-effortless-experience/`), and **loyalty** (`.../winning-on-purpose/`).

> The Customer Team never replies to reviews and never writes to App Store Connect. Every line below is graded on whether the *signal was turned into tracked work*, not on whether a public reply was posted.

## Reliability — does the app do what the customer expects?

- [ ] **No customer-reported defect is untracked.** Every crash / data-loss / broken-core-flow report in this cycle's reviews maps to an open CUS issue (or a pre-existing one with new evidence attached). The cardinal sin is the customer telling us and us dropping it (−2.0).
- [ ] **Repeated defects are escalated, not re-filed.** A bug seen again this cycle bumps its Customer Need's volume; it does not spawn a duplicate issue.

## Responsiveness — are we acting on what we hear?

- [ ] **30-day rating ≥ 4.0 and not sliding.** Drop > 0.2 stars or a sub-4.0 crossing has an open remediation issue (−1.5 if not).
- [ ] **New actionable reviews this cycle are triaged**, not left unread in the backlog.

## Empathy — do we understand the recurring pain?

- [ ] **Recurring negative themes are captured as Customer Needs.** A theme seen in ≥ 2 cycles has a Customer Need + issue (−1.0 if not).
- [ ] **The customer's own words are preserved** — representative quote (≤ 15 words, quoted) on the Need.

## Effort — how hard is it to get value?

- [ ] **High-effort journeys are tracked.** Repeated "I had to do this three times" / dead-end / confusion reports have an effort-reduction issue (−1.0 if not).
- [ ] **Onboarding friction is named** where first-session reviews cite it.

## Assurance — billing, pricing, trust

- [ ] **Billing / refund / subscription complaints are tracked** (−0.5 if not).
- [ ] **No trust-eroding pattern is ignored** (surprise charges, "scam" language, privacy worries).

## Loyalty — is the relationship strengthening?

- [ ] **Rating trajectory is recorded cycle-over-cycle** so drift is visible (−0.5 if no loyalty signal is tracked at all).
- [ ] **Praise is logged** (not ticketed) — it's the baseline the next cycle compares against.

## Closed-loop — did we finish the job?

- [ ] **Shipped fixes close their Customer Need.** A merged fix for a customer-reported issue closes the Need and notes the release (−0.5 if the loop is left open).
- [ ] **Stale issues are reconciled** (handled in the Customer Needs Sync meeting).

## Hand-off hygiene (informational, not graded)

- New reviews this cycle are summarized in the scorecard's **new-reviews digest** as raw material for the human's reply workflow — the team surfaces them, the human replies.
- Store-listing signals (metadata, screenshots, keywords) are routed to ASO, not ticketed here.
