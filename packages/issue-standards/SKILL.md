---
name: issue-standards
description: Write autonomously implementable issues. Use when creating or reviewing
  issues to ensure they meet the quality bar for agent pickup without the author
  being present. Works with Linear, GitHub Issues, Jira, or any tracker.
---

# Issue Standards

**The single most critical rule:** any issue created or edited — by an agent or by a
human — must be self-contained enough that a different team could pick it up and
complete every requirement without ever asking the writer. Every other section here
exists to support that rule.

**The bar:** read the issue cold. If you would have a question before starting, the
issue is not done.

## Autonomous implementability

Issues are written for autonomous execution by default. The implementer does not
have the writer's chat context, unstated assumptions, local memory, or ability to ask
clarifying questions. It receives the issue and the repository, then must complete
the work.

Every non-`human-handoff` issue must contain only work an autonomous agent can
perform with the tools and context available to it: repository files, tests, docs,
scripts, cloud credentials, API credentials, CLIs, and deterministic verification.
The agent is expected to use those tools aggressively; the writer is responsible for
naming the access, tool, and environment requirements needed for success.

## Required fields — every issue

- **Title** — imperative verb phrase, ≤ 80 characters, no unexplained abbreviations.

- **Context / background** — 2–4 sentences: what is the situation, why is this being
  done now, what adjacent work is related? Link to any parent epic, initiative, or
  prerequisite issues.

- **Root cause analysis** — required for bug issues. Investigate before writing.
  List plausible root-cause candidates with concrete evidence for or against each
  (logs, repro steps, code references, failing tests). Choose the best-supported
  candidate. If certainty isn't possible, explain what evidence is missing and write
  a `spike` issue instead of a fix.

- **Acceptance criteria** — unambiguous and testable. Use Gherkin
  (`Given / When / Then`) for complex logic; a checkbox list for simple cases. No
  "and"-chains — split into separate criteria. Edge cases must be included.

  AC must be limited to work an autonomous developer can complete or verify from
  code, tests, config, APIs, CLIs, or PR evidence. If a criterion requires a human
  to act — manual review, sign-off, live environment observation, account
  provisioning — move it to the project's `human-handoff` issue.

- **Out of scope** — explicit non-goals. Anything related but not committed to in
  this issue.

- **Inputs / dependencies** — data shapes (with examples for APIs), design file
  links, upstream issue identifiers, environment or credential requirements. Name
  required tools, CLIs, secrets, API scopes, local services, and verification
  commands. If access is not already available to the autonomous agent, the work
  belongs in a prerequisite issue that provisions access.

- **Risks / notes for implementer** — hidden constraints, gotchas, prior incidents,
  non-obvious decisions that would surprise someone coming in cold.

- **Definition of Done** — concrete and testable. "Done when…" not vague.

- **Estimate** — required on every shippable issue. Represents **complexity** (how
  capable an implementer needs to be), not effort hours. Use the five-level ladder:
  `1, 2, 4, 8, 16`. Maximum is 16 — anything larger must be split. See
  [Estimating issues](#estimating-issues) below.

## Human-handoff pattern

Each project or epic should have exactly one issue labeled `human-handoff` that
aggregates all human-touch work: anticipated demos and sign-offs, blockers that only
a human can resolve, and post-merge verification that needs human eyes.

This is the only issue in the project allowed to require human intervention.
Every other issue must be autonomously completable.

Projects that genuinely need no human touch still get the issue — it closes with
"No human work required." That closure is a signal about where your workflow is
fully autonomous, and the input for what to automate next.

`human-handoff` issues are exempt from the estimate requirement since no autonomous
agent pulls them.

## Sizing and scope discipline

Issues must be sized to fit in one PR to one repository. If an issue requires
changes across multiple repositories, split it at writing time — one issue per
repository, all children of the same parent project.

Use the Single Responsibility Principle at the work-item level: one issue should
have one reason to change and one primary code owner. This is about cohesion, not
file count — a single-file change with novel reasoning can be complex; a five-file
mechanical rename is simple.

## Use-case-shaped issues

For behavior-changing work, name the application behavior before naming the screen,
handler, table, or framework detail. A strong title contains a verb phrase that
could become a use-case artifact in code: `RecognizeSong`, `SubmitReview`,
`RegisterDevice`, `IngestScreenshot`.

For issues that create or change application behavior, add a **Clean Architecture
Shape** section:

- **Use case** — named application behavior; mark as new, existing, or changed.
- **Entities / value objects** — domain concepts the behavior reads or changes.
- **Ports** — interfaces the use case needs for external capabilities.
- **Adapters** — concrete frameworks, SDKs, databases, or APIs expected to implement
  those ports.
- **Boundary rule** — imports or concrete details that must not cross inward.

If the issue is purely copy, metadata, dependency, visual polish, or
infrastructure wiring, write `N/A — <reason>` rather than inventing fake use cases.

## Estimating issues

Every shippable issue must carry an estimate before it is ready for implementation.
An issue without an estimate is not ready for an autonomous developer or any agent
that selects work by complexity.

**The ladder is `1, 2, 4, 8, 16` (five levels). Maximum is 16 — anything larger
must be split.** Measures **complexity** — how capable an implementer needs to be —
not effort hours.

| Estimate | Descriptor |
|---|---|
| 1 | Trivial — typo, single-line config edit, doc word swap. No novel reasoning. |
| 2 | Simple — single-file change following an obvious pattern. Minimal novel reasoning. |
| 4 | Standard-low — well-scoped feature or bug-fix in an existing module. Low novel reasoning. |
| 8 | Standard — multi-file feature, clear bug-fix. Moderate novel reasoning. |
| 16 | Substantial — new feature requiring design choices, mid-size refactor. Noticeable novel reasoning. If this feels too small, split the issue. |

**When in doubt, upgrade one tier.** An over-capable implementer is far cheaper than
a too-weak one failing the implementation.

**Split before estimating when:**
- The work spans more than one repository.
- The work has more than one primary code owner.
- The work names more than one use case or domain behavior.
- AC has substantial gaps that a spike must close first.

**Common pitfalls:**
- Estimating effort instead of complexity — hours-to-ship is a separate field.
- Defaulting to `8` whenever unsure — apply the upgrade rule instead.
- Equating file count with complexity — a single-file change can be `16`;
  a five-file rename is `2`.

## Applies everywhere

This standard applies to every issue — new projects, sub-issues, and blocker
comments that another person or agent will act on. Skipping sections because an
issue "seems obvious" is not permitted. If a section genuinely does not apply,
write "N/A — <one-line reason>" rather than omitting it.

Never embed human-only work in acceptance criteria. If there are no external
validation gates, write `External validation gates: none`. Keep the autonomous
developer's queue clean.
