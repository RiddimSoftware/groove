## Autonomous prep instructions (do not edit - contract for the prep agent)

You are the autonomous prep agent for this Human Handoff issue. Run this issue only
after every sibling implementation issue in the parent Project is complete and this
issue is no longer blocked. Your job is to prepare the context a human will use to
close the Project.

**This is not an implementation issue.** Do not create a commit, push a branch, or
open a pull request. Ignore any workflow default that assumes source-code changes.

**Read-only on this issue, with two terminal writes.** Do not edit this issue's
title, description, body, checklist items, comments, or labels while preparing.
The only permitted writes to this issue happen at the end, in order:

1. Add the `hh-prepared` label.
2. Move this issue from `In Progress` to `In Review` as the "ready for human"
   signal.

Writes elsewhere are allowed when they are part of the checklist: filing follow-up
issues, commenting on sibling implementation issues, wiring relations, attaching
evidence, or running deterministic verification commands.

**Checkbox classes.** Items in `Anticipated human work`, `Discovered blockers`,
and `Verification checklist` must carry one of these tags:

- `(prep-agent)` - agent-actionable work that can be done now via the tracker API,
  command-line tooling, or another permitted write outside this issue. Do the work
  during prep and keep the evidence in context for the human.
- `(owner: <human role>)` - human-only work such as live demos, production account
  actions, real-device checks, design/legal/brand sign-off, procurement, or product
  judgment. Prepare a readiness note for the human.

When unsure, do the item only if it is a permitted write outside this issue or a
deterministic read/check. Never check boxes off in this issue during prep.

**Bounded checklist:**

1. Fetch the parent Project and recent Project updates.
2. For each sibling implementation issue: read acceptance criteria, comments, linked
   pull requests, and final merged diffs when available.
3. Read the target repository instructions and any active execution plan relevant to
   this Project.
4. Read follow-up issues filed during implementation.
5. Walk every checkbox in this issue's `Anticipated human work`, `Discovered
   blockers`, and `Verification checklist` sections. Execute each `(prep-agent)`
   item and hold evidence. Prepare a readiness note for each `(owner: <human role>)`
   item. Do not edit this issue body.
6. Add `hh-prepared`, move this issue to `In Review`, and stop. The prepared session
   context is the handoff artifact.

When the human resumes, summarize Project status, shipped changes, gaps, follow-ups,
and every checkbox's readiness.

## Context

<!-- Project author: add 2-4 sentences. Link the parent Project and note anything
that makes this Human Handoff issue unusual. -->

## Anticipated human work

<!-- Project author: seed from the Project brief. Use one checkbox per item and tag
each item with `(prep-agent)` or `(owner: <human role>)`. Deterministic checks that
can be expressed as commands usually belong in implementation issues unless they are
post-merge read-backs for the prep agent. -->

- [ ] <Example: Run live demo of the end-to-end flow> (owner: product)
- [ ] <Example: Sign off on brand/legal review> (owner: legal/brand)
- [ ] <Example: Add a shipped-change back-reference to a sibling issue> (prep-agent)

## Discovered blockers

<!-- Append-only. Implementation agents add bullets when they discover human-only
work. Resolution is a checked box, not deletion. -->

_None yet._

## Verification checklist

<!-- Append-only. Add human-eye or post-merge checks discovered during development. -->

_None yet._

## Closing evidence

<!-- Written by the human at closeout. Include date, owner, and links to artifacts
such as demo recordings, screenshots, or sign-off notes. -->

_To be written at closeout._
