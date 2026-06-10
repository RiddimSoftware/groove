# Follow-up Protocol

**Loaded on demand.** Read this when your skill or situation calls for filing a follow-up Linear ticket.

---

## 1. When to file a follow-up

File a follow-up when you observe **concrete, actionable work outside your current ticket's scope**:

- A blocker that prevents completing the current ticket's acceptance criteria
- A reproducible bug adjacent to your working area (with a concrete repro step)
- A QA/smoke verdict of **fail** (with named failing test or observed behavior)
- A security vulnerability in surrounding code (with named file, line, or call chain)
- A doc or README that is verifiably wrong or stale adjacent to your current change
- A CI failure not caused by your PR (with build URL or log excerpt)
- A performance regression with measured numbers

---

## 2. When NOT to file

Do **not** file when:

- The observation is vague, stylistic, or a personal preference ("could be cleaner")
- You cannot write a one-sentence repro or name a failing artifact
- The work is **in scope** for the current PR — fix it now, don't split it out
- Confidence is low and the evidence is circumstantial
- The observation is speculative ("might cause problems later")

Litmus test: can you write a concrete title ≤ 80 characters and one verifiable acceptance criterion? If not, skip the ticket and leave a PR comment instead.

---

## 3. How to file

1. Invoke the `backlog-team` skill from the current workspace.
2. Describe the finding: what you observed, what file/line/test/log confirms it, and why it is outside your current ticket.
3. The `backlog-team` skill shapes the issue per [`linear-standards.md`](linear-standards.md) and calls `save_issue`.
4. **Do NOT call `save_issue` directly or shortcut the skill.** The skill enforces required sections, team scoping, and relation wiring that direct calls miss.

---

## 4. Where to file (team scoping)

**Default: same Linear team as the originating issue.**

Cross-team only when the discovered work clearly belongs to a different repository per [`repositories.yaml`](repositories.yaml).

If ambiguous: file in the same team and post a Linear comment on the new issue naming the ambiguity for human triage. Do not block filing on the ambiguity.

---

## 5. De-dup first (mandatory)

Before calling the `backlog-team` skill, search Linear for existing issues:

```
list_issues(query="<title keywords or file path or error signature>", teamId=<same team>)
```

- If a matching open issue exists: post a comment on it with your new evidence instead of creating a duplicate.
- If no match: proceed to file.

The `ci-failure` label's auto-close-on-pass handler is the model for this discipline: one canonical issue per failure, evidence accumulates via comments.

---

## 6. Breadcrumb (mandatory)

Every follow-up MUST be linked back to the originating ticket. Wire the relation in the **same `save_issue` call** that creates the follow-up — not after the fact.

| Situation | Relation type |
|---|---|
| Follow-up must complete before the originating ticket can close | `Blocks` (follow-up blocks originator) |
| Adjacent discovery that does not block the originating ticket | `Related` |

Never leave a follow-up floating — an unlinked follow-up cannot be triaged.

---

## 7. Blocks/BlockedBy discipline (when blocking)

When the follow-up is a hard prerequisite for the current ticket:

1. Set the follow-up as `Blocks` the current ticket (in the `save_issue` call).
2. **Do NOT mark the current ticket Done.**
3. Post a Linear comment on the current ticket: name the blocker and link the follow-up issue ID.
4. Leave the current ticket in `In Progress` or transition it back to `Backlog` depending on skill conventions.
5. **Do not put the originating issue identifier in the PR title or body** — the Linear–GitHub integration auto-transitions on PR merge, which would incorrectly close the still-blocked ticket.

---

## 8. Quality bar

Every follow-up must meet this bar before filing:

- Title is an imperative verb phrase, ≤ 80 characters
- Description follows [`linear-standards.md`](linear-standards.md) required sections
- A cold reader can pick it up without consulting the filer
- At least one verifiable acceptance criterion exists
- The relation to the originating ticket is wired

---

## 9. Confidence threshold by skill

| Tier | Examples | Action |
|---|---|---|
| **HIGH** — file aggressively | QA/smoke fail with named test, security finding with repro, CI failure log, crash-on-launch, perf regression with numbers | File immediately via `backlog-team` |
| **MEDIUM** — file when concrete | Code review structural issue with named files, arch dependency-rule violation with named modules, doc-rot with named doc | File if you can name a file and write one verifiable AC |
| **LOW** — PR comment only, no Linear | Style nits, "consider refactoring," subjective preferences, unverifiable hunches | Leave a PR review comment; do not file a ticket |

---

## 10. Worked example — the EVI-21 failure mode

**Situation:** A developer is implementing EVI-21 ("prove golden path on known-good build"). During the run they discover that `main.swift` does not invoke `SmokeCLI` — the harness is wired in a library but never called from the entry point. This is outside EVI-21's scope but blocks its acceptance criteria.

**Wrong response:** Mark EVI-21 Done, mention the gap in a PR description, or silently skip it.

**Correct response:**

**Step 1 — De-dup.** Search for existing EVI issues mentioning "SmokeCLI" or "main.swift wiring". None found.

**Step 2 — File the follow-up via `backlog-team`.** The skill shapes and files:

```
mcp__claude_ai_Linear__save_issue({
  teamId: "<EVI team ID>",
  title: "Wire main.swift to invoke SmokeCLI",
  description: "...(required sections per linear-standards.md)...",
  stateId: "<Todo state ID>",
  relations: [{ type: "blocks", relatedIssueId: "<EVI-21 issue ID>" }]
})
// Returns new issue — e.g. EVI-42
```

**Step 3 — Post verdict comment on EVI-21.**

```
mcp__claude_ai_Linear__save_comment({
  issueId: "<EVI-21 issue ID>",
  body: "Blocked: EVI-42 (Wire main.swift to invoke SmokeCLI) must merge first. EVI-21 left In Progress."
})
```

**Step 4 — Leave EVI-21 in `In Progress`.** Do not transition it to Done. Do not include the string `EVI-21` in any PR title or PR body — the Linear–GitHub integration would auto-close it on merge.

**Result:** EVI-21 remains open and blocked. EVI-42 enters the queue as `Todo` with a `Blocks EVI-21` relation. The next agent or developer picks up EVI-42 independently.
