# Implementation Prompt

## Objective
<One sentence naming the artifact or behavior to ship.>

## Target
- Repository:
- Linear Project:
- Related issues/PRs:
- Project workflow role: <acceptance-test | implementation | project-acceptance-gate | architecture-verification | surface-verification>
- Sequencing lane: <foundation | parallel | integration | serial>
- Blocks:
- Blocked by:
- Human Handoff issue:

## Background
<2-4 sentences with the facts needed to understand why this issue exists, what previous work it depends on, and what future project gate will inspect it.>

## Source-of-truth inputs
- Project description:
- Sibling issues to inspect:
- Linked PRs or commits:
- Current `main` files to inspect:
- Standards, skills, or docs to load:
- Inputs that must not be assumed from chat history:

## Expected output
- Code PR:
- Linear Project comment:
- Linear follow-up issues:
- Other artifact:

## Project review output contract
<Use this section when the project workflow role is `project-acceptance-gate`, `architecture-verification`, or `surface-verification`. Otherwise write `N/A - implementation issue`.>

- Primary output:
- Verification comment or scorecard to post:
- Linear follow-up issues to create: <create zero or more concrete issues for remediation findings; this is a primary goal of review/gate issues>
- Follow-up issue target Project: <same Linear Project as this issue>
- Follow-up issue linking requirements:
- Findings that do not need follow-up:
- No-code expectation: <yes/no; if yes, this issue closes through Linear artifacts rather than a PR>

## Scope
- In scope:
- Out of scope:
- Minimum files or directories expected to change:
- Files or directories to avoid unless required for correctness:
- If additional files must change, include the rationale in the PR.

## Acceptance TDD contract
- Project acceptance goal:
- Mandatory project acceptance participation:
- This issue's acceptance-test responsibility:
- Red/green expectation:
- Acceptance test issue(s) this issue creates or greens:
- Acceptance test path(s):
- `project-acceptance` workflow expectation:
- Branch-protection expectation: `project-acceptance` remains non-required while `pr-build` stays required.
- Composition-root behavior exercised:
- Real adapters/objects that must be on both sides of the tested path:
- True edge fakes/sandboxes allowed:
- Write/control paths covered:

## Architecture gate
- Architecture standard or skill to satisfy:
- Architecture verification issue:
- Boundary, dependency, or composition-root constraints:
- Architecture decisions this PR must leave inspectable:

## Surface gate
- User-facing surfaces changed: <CLI | script | iOS | web | Linear artifact | N/A - reason>
- Surface standard or skill to satisfy:
- Surface verification issue:
- Accessibility identifiers required:
- Deterministic UI/surface tests:
- Model UI interaction: none; write or run deterministic tests instead.
- Human-only checks moved to Human Handoff:

## Implementation constraints
- Required behavior changes:
- Behavior that must stay unchanged:
- Data shapes, APIs, commands, or config values:
- Edge cases:
- External access, credentials, tools, or local services required:

## Acceptance criteria
- [ ] <Observable condition that proves success.>
- [ ] <Observable condition that proves success.>

## Verification matrix
- Check:
  - Command or deterministic test:
  - Expected exit/code result:
  - Expected observable result:
  - Proves:
- Check:
  - Command or deterministic test:
  - Expected exit/code result:
  - Expected observable result:
  - Proves:
- Human exercise:
  - Scenario:
  - Expected success signal:
  - Expected failure signal:

## Stop conditions
- Done when:
- For review/gate issues: done only after every concrete remediation finding is either filed as a Linear issue in this same Project or explicitly recorded as not needing follow-up.
- Stop and report a blocker when:
- Lightweight PR evidence:

## Failure trace
- First failing command or test:
- Short error excerpt:
- Likely failure class: <compile/test | env/secret/config | workflow/infra | data/setup | product ambiguity>
- Next debug step:
