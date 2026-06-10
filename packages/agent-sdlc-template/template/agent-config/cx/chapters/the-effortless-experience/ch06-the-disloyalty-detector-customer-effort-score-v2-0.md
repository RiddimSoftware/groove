# Chapter 6: The Disloyalty Detector—Customer Effort Score v2.0

## Core Principles
- The Customer Effort Score (CES) is a powerful, transactional metric that predicts customer loyalty and intent to repurchase better than CSAT.
- CES v2.0 measures the customer's agreement with the statement: "The company made it easy for me to handle my issue."
- A comprehensive measurement system must look beyond the survey score to include operational data (transfers, repeat contacts, channel switching) via a Customer Effort Assessment.

## Enforceable Rules
- Implement CES v2.0 in post-interaction surveys to measure the transactional ease of the service experience.
- Do not use CES to replace Net Promoter Score (NPS), which measures relationship-level loyalty. Use them in tandem.
- Look at the distribution of CES scores, not just the average, to identify underlying operational failures (e.g., too many simple issues arriving in the phone channel).

## Review Questions
- Are we measuring the effort customers exert, or are we just asking if they are satisfied?
- Are we cross-referencing CES data with operational metrics to map the customer's issue resolution journey across channels?
- Does our web self-service drive repeat contacts into our phone channel, inflating operating costs?

## Examples
### Violation
- A company boasts a high CSAT score, but ignores that 58% of their callers only called because the self-service web portal failed them, masking a high-effort journey.
### Good Implementation
- A company tracks CES v2.0, identifies a spike in high-effort web experiences, and uses an issue-to-channel mapping audit to fix null search results and confusing FAQ language, reducing overall effort.

## Implications
### For Agents
- Analytics integration must support capturing and reporting on CES v2.0 and correlating it with cross-channel journey data.
### For Tickets/PRs/CI
- Survey implementation tickets should prioritize CES v2.0 for transactional support interactions.