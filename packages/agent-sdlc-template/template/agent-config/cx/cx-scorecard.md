# CX Scorecard — the 0–10 Customer Experience Rubric

The Customer Team scores each product's customer experience on a 0–10 scale every CX Pulse cycle, the way the Architecture Team scores structural health. Start at **10.0** and apply the deductions below. The score is a per-product, per-cycle snapshot recorded in the CX Scorecard comment; its **trajectory** matters more than its absolute value.

The rubric is grounded in the distilled canon: the **RATER** dimensions and Gaps Model (`chapters/SERVQUAL/`), **Customer Effort** (`chapters/the-effortless-experience/`), and **loyalty / Earned Growth** (`chapters/winning-on-purpose/`).

## Deductions

| Deduction | Dimension | Smell |
|---|---|---|
| **−2.0** | Reliability | The cardinal sin: a customer-impacting defect (crash, data loss, broken core flow) reported in reviews or support with **no tracked Linear issue**. The customer told us and we dropped it. |
| **−1.5** | Responsiveness | Rating fell > 0.2 stars since last cycle, or crossed below 4.0, with no remediation issue opened. |
| **−1.0** | Empathy | A recurring negative review theme (seen in ≥ 2 cycles) with no Customer Need + issue capturing it. |
| **−1.0** | Effort | A high-effort journey — repeated complaints about the same friction, dead-end, or "I had to do this three times" — with no effort-reduction issue. |
| **−0.5** | Assurance | Billing / pricing / trust complaints (refunds, surprise charges, subscription confusion) left untracked. |
| **−0.5** | Tangibles | A quality gap customers cite (confusing onboarding, screenshots that no longer match the app) neither routed to a CUS issue nor handed to ASO. |
| **−0.5** | Loyalty | No loyalty signal is being tracked at all — rating trajectory not recorded cycle-over-cycle, so drift is invisible. |
| **−0.5** | Closed-loop | A customer-reported issue shipped a fix, but the loop was never closed (no release-note mention; Customer Need left open). |

## Bands

- **9.0–10.0 — Excellent.** Every customer signal is tracked; loyalty trajectory flat or up; no open cardinal sins.
- **7.0–8.9 — Healthy.** Minor untracked friction or closed-loop gaps.
- **5.0–6.9 — At risk.** A recurring theme or a rating slide is going unaddressed.
- **< 5.0 — Poor.** A cardinal-sin defect is live, or loyalty is sliding with no response. Escalate per the skill's Decision Authority.

## How to score a cycle

1. Walk `references/cx-checklist.md` for the product.
2. Apply each deduction that holds **this cycle**, citing the review / rating / Customer-Need evidence inline.
3. Record the score and the per-dimension deductions in the CX Scorecard comment (`references/scorecard-template.md`).
4. Compare to the prior cycle's score; the **trajectory** (improving or declining) is the headline, not the absolute number.

> The Customer Team is a **recommender**: it never replies to reviews (the human owns responses) and never writes to App Store Connect. A Responsiveness deduction measures whether the *signal was turned into tracked work* — not whether a public reply was posted.
