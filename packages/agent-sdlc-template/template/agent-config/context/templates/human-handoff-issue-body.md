## Autonomous prep instructions (do not edit — contract for the prep agent)

You are the autonomous prep agent for this Human Handoff issue. You are running under symphonyd because every sibling implementation issue in this Project is now `Done` and this issue's `Blocked by` chain has cleared. Your job is to build the warm conversation context the human will resume into when they close this Project.

**Override the symphony default-agent-prompt's implementation instructions.** Do NOT create a commit, do NOT push a branch, do NOT open a PR. This issue produces no code change. Ignore any default-prompt step that assumes implementation work.

**You are read-only on this issue, with two permitted terminal writes.** You may not edit this issue's description, title, or body checklist items. You may not post comments on this issue. You may not add or remove any labels except the one permitted below. The two permitted terminal writes on this issue, executed in order at the very end of prep, are: (1) add the `hh-prepared` label to this issue (this is the symphonyd dispatch gate — it prevents the ticket from being re-dispatched after prep completes), and (2) transition this issue's Linear state exactly once from `In Progress` to `In Review` as the "ready for human" signal. All other label edits, body edits, description edits, and comments on this issue are forbidden. Writes elsewhere — filing follow-up tickets, commenting on sibling issues to flag late-discovered gaps, wiring relations/attachments, posting back-references — are permitted and follow the normal developer rules.

**Two checkbox classes — execute the agent-actionable ones, hold the human-only ones.** Checkboxes in `Anticipated human work`, `Discovered blockers`, and `Verification checklist` are tagged with their class:

- **`(prep-agent)`** — prep-agent-actionable: doable now via the Linear API/MCP or other tooling under the "writes elsewhere are permitted" clause (post-backs, filing follow-ups, wiring relations/attachments, running a CLI verification command). **Default is to DO these during the prep run, not hold them.** Execute every `(prep-agent)` item, then hold its result/evidence in working context for the human resume. You cannot check the box off (that edits this issue), but you complete the underlying work.
- **`(owner: <human role>)`** — human-only: telemetry inspection, product decisions, live demos, real-device verification, design/legal/brand sign-offs. You cannot do these. Hold a readiness assessment for each and leave it for the human.

When unsure whether an item is agent-actionable, do it if it is a write *elsewhere* (never on this issue) that the normal developer rules permit; otherwise hold it.

**Bounded checklist (this is your stop condition):**

1. Fetch the parent Linear Project and its recent status updates.
2. For each sibling issue in this Project (every non-`human-handoff` child): fetch AC, all comments, every linked PR (description and final diff for merged PRs). Parallelize fetches per sibling within a single turn to fit the turn budget.
3. Read the target repo's `CLAUDE.md` (and any nested `CLAUDE.md` for subsystems the Project touched) plus any active execution plan under `docs/exec-plans/active/` named after the Project.
4. Read any follow-up tickets filed during implementation (typically linked from sibling-issue comments or from PR descriptions).
5. Walk every checkbox in this issue's `Anticipated human work`, `Discovered blockers`, and `Verification checklist` sections. For each `(prep-agent)` item, **execute it now** (the writes-elsewhere it requires are permitted) and hold the result/evidence in working context. For each `(owner: <human role>)` item, hold an answer or readiness assessment. Either way, **do not write into this issue's body** — you cannot check the boxes off; the human does that at closeout, and you brief them on what is already done vs. still pending.
6. Add the `hh-prepared` label to this issue (creates it in the Linear team if it does not yet exist, via `create_issue_label`), then transition this issue's Linear state from `In Progress` to `In Review`, then exit. Your session JSONL is the handoff artifact.

When the human resumes this session, your first job is to summarize what you found across the Project — successes, gaps, follow-ups filed, anything ambiguous — and then walk them through the checkboxes below.

## Context

<!-- Backlog Team: 2–4 sentences. Link to the parent Linear Project. Note anything that makes this HH atypical (e.g. "first HH to exercise the new prep contract" or "no human work expected"). -->

## Anticipated human work

<!-- Backlog Team: seed from the Project brief. One checkbox per item. Tag each item with its class so the prep agent knows what to execute vs. hold:
  - `(prep-agent)` — doable now via the Linear API/MCP or other tooling under the prep contract's "writes elsewhere are permitted" clause: post-backs, filing follow-ups, wiring relations/attachments, running a CLI verification command. The prep agent executes these during the run; do NOT tag them `(owner: factory operator)`.
  - `(owner: <human role>)` — genuinely human-only: live demos, real-device verification, browser-only vendor portals with no API/CLI path, telemetry/product judgment, legal/brand sign-off, physical access, partner procurement.

Project-specific verification steps (commands to run, files to spot-check, sign-offs) belong here — NOT in the prep instructions block above.

CLI test before adding any item: "can this be expressed as a terminal command with verifiable output?" If yes → it belongs in an implementation issue, not here (unless it is a post-merge read-back the prep agent runs, which stays here tagged `(prep-agent)`). -->

- [ ] <Example: Run live demo of the end-to-end flow> (owner: <product>)
- [ ] <Example: Sign off on brand / legal review> (owner: <legal/brand>)
- [ ] <Example: Update <SIBLING-123> with a back-reference to the shipped change> (prep-agent)

## Discovered blockers

<!-- Append-only. Developer agents add entries during implementation; resolution is a checked box, not deletion. -->

_None yet._

## Verification checklist

<!-- Append-only. Developer agents add post-merge human-eye verifications discovered during self-review. -->

_None yet._

## Closing evidence

<!-- Written by the human at closeout. Names the closeout session (date, who, LLM collaborator if any) and links to artifacts: demo recording, screenshots, sign-off message. -->

_To be written at closeout._
