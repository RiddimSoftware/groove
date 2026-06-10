# Chapter 19: Architecture Decisions

## Core Principles
- An architecture decision is "architecturally significant" when it affects **structure, non-functional characteristics, dependencies, interfaces, or construction techniques** — pure technology choices that bear on those qualify as architecture decisions.
- Beat the three decision anti-patterns: **Covering Your Assets** (defer indefinitely out of fear — decide at the last responsible moment, then collaborate to validate), **Groundhog Day** (decisions get re-litigated forever because the *why* was never captured — always include technical *and* business justification), **Email-Driven Architecture** (the decision lives nowhere durable — store it in a single system of record and email only a link).
- Document every non-trivial decision as an Architecture Decision Record (ADR) with **Title, Status, Context, Decision, Consequences**, and ideally **Compliance** and **Notes**.
- Status discipline matters: `Proposed` / `Accepted` / `Superseded` (with bi-directional links) — a superseded ADR is never deleted, the chain preserves *why* the prior decision existed. Use a time-boxed `Request for Comments` status to avoid Analysis Paralysis.
- State the decision in active, commanding voice ("we will use X"), not opinion ("I think X might be best"). Emphasis belongs on **why**, not how.
- The **Compliance** section forces the author to specify how the decision will be enforced — manual audit, or an automated fitness function (ArchUnit, NetArchTest, lint rule, CI check).

## Enforceable Rules
- A change that affects structure, an architecture characteristic ("-ility"), a coupling point, an interface contract, or a framework/platform choice MUST land with an ADR or an update to an existing one.
- Every ADR MUST have a Decision section that includes both a technical and a business justification; ADRs lacking business justification are blocked in review.
- When an ADR supersedes another, both records MUST be updated with cross-links (`Superseded by N` / `Supersedes M`); deletion of historical ADRs is prohibited.
- The Compliance section MUST name an enforcement mechanism — either a specific fitness function/lint rule with its location, or a documented manual audit step. "Trust the team" is not an answer.

## Review Questions
- Does this PR change structure, characteristics, dependencies, interfaces, or construction techniques? If yes, where is the ADR?
- Can a future reader infer the *why* from the ADR alone, or are they going to ask the question again next quarter?
- Is the decision stated affirmatively, with both technical and business justification, and a named enforcement mechanism?
- If this supersedes an earlier decision, are the bi-directional links in place?

## Examples
### Violation
A PR introduces asynchronous messaging between two services with the justification "decoupling" in the description. No ADR. Six months later a new architect refactors back to synchronous REST, causing a latency regression that an ADR would have explained away.
### Good Implementation
ADR `42. Asynchronous Messaging Between Order and Payment Services` — Status: Accepted; Context names REST and messaging as the alternatives; Decision states "we will use asynchronous messaging" with technical (decoupling, back-pressure) and business (faster checkout response, lower abandonment) justification; Consequences lists the error-handling complexity trade-off that was already accepted with stakeholders; Compliance points at an ArchUnit test asserting the service boundary.

## Implications
### For Agents
- Before opening a PR that touches structure, characteristics, dependencies, interfaces, or platform/framework choices, locate or author the ADR. If none exists in the target repo, add one under `docs/adr/` (or the repo's equivalent) in the same PR.
- When asked to "just switch this to X" without context, refuse to silently change architectural shape — surface the prior ADR (if any) and propose a superseding one instead of mutating in place.
- Write decisions in active voice; do not hedge ("might", "could be"). If hedging is required, the status is `Proposed` or `Request for Comments`, not `Accepted`.
### For Tickets/PRs/CI
- Linear issues for architecturally significant work should have an "ADR" subtask or an explicit acceptance criterion that an ADR be added or updated.
- PR templates should include an "ADR link" field; reviewers reject architecturally significant PRs missing the link.
- Where a Compliance section names a fitness function, CI must run it — the ADR's enforcement claim is a lie if the check is not wired up.
