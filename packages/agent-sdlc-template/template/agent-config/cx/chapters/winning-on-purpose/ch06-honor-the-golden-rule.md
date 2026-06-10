# Chapter 6: Honor the Golden Rule

## Core Principles
- The Golden Rule ("Love thy neighbor as thyself") is not just a religious principle but the foundation for sustainable commerce and healthy corporate communities.
- Empathy is required to understand how a customer or colleague actually wishes to be treated.
- A good business system must make it easier for people to do the right thing and harder to do the wrong thing. Bad systems beat good people.
- The Golden Rule requires protecting the community. This means bad actors (whether employees, suppliers, or abusive customers) must be held accountable.

## Enforceable Rules
- Do not use commission-based incentives if they encourage salespeople to oversell, push inappropriate products, or ignore the long-term needs of the customer.
- Never pay bonuses based purely on NPS survey scores, as this leads to begging, manipulation, and the destruction of the metric's integrity.
- Implement "structured anonymity" in feedback systems. Feedback should be anonymous enough to protect candor but trackable by leadership to ensure accountability.
- Do not tolerate abusive customers. Protect your employees by banning customers who consistently exhibit toxic or harmful behavior.

## Review Questions
- Are our compensation and incentive systems rewarding employees for enriching customer lives, or are they inadvertently rewarding value extraction?
- Do we have safe spaces and times (like huddles) where employees can process feedback without fear of immediate punishment?
- How are we actively building empathy for our customers among our headquarters staff and engineering teams?

## Examples
### Violation
- Sales representatives treating prospective customers who aren't ready to buy immediately as "dead to me," solely because the interaction won't result in an instant commission.
### Good Implementation
- Intuit's "Follow Me Home" technique (and webcam equivalents) that forces coders and executives to watch customers use their software in real-world settings, building deep empathy.
- Uber and Airbnb using two-way rating systems with structured anonymity to protect both the service provider and the customer, while banning truly abusive users from the platform.

## Implications
### For Agents
- The Agent should be designed to assume good intent but must handle bad actors gracefully. When generating moderation tools or user management systems, ensure there are clear paths to ban abusive users to protect the community.
### For Tickets/PRs/CI
- When designing feedback mechanisms (like forms or surveys in the app), ensure the PR considers structured anonymity. Data should be actionable for the team but safe for the user providing it. Avoid building dark patterns into UI that violate the Golden Rule.