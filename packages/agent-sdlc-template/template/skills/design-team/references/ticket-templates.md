# Linear issue templates

Every flagged finding from the Design Team becomes one design issue using one of these templates. Templates conform to the global Linear quality standard (`/YOUR/WORKSPACE/DIR/agent-config/context/linear-standards.md`): self-contained enough that an implementor cold-picks-it-up and ships without coming back.

Common rules across all templates:

- **Team:** the Linear team supplied as input to the session (e.g. `LOOK`, `WEB`, `BAP`).
- **Status:** `Todo` (never transition past Todo from this skill).
- **Estimate:** set per the complexity ladder in [`context/linear-standards.md` § *Estimating issues*](/YOUR/WORKSPACE/DIR/agent-config/context/linear-standards.md#estimating-issues). When in doubt, upgrade one tier.
- **Labels:** secondary label per template (`a11y`, `brand`, `polish`, `content`, `usability`, `bug`, `experiment`). Stack labels when a finding crosses voices. There is no `spike` label and no investigative / finding-only issues — every issue is implementation work that lands a versioned artifact via a PR gated by CI; the investigation needed to spec a fix is the writer's pre-work, done before the issue exists.
- **Linkage:** link the issue to the open Refresh Project for the product if one exists; otherwise link to the Design Initiative.
- **Title format:** `[<surface-shorthand>] <imperative verb phrase>`, ≤ 80 chars. Examples: `[bettrack-home] Increase primary CTA contrast to 4.5:1`, `[riddim-website] Replace generic gradient hero with brand treatment`.
- **Target repo + path:** every implementation issue names the target repo (the input repo supplied to the session) and the directory under that repo where the surface's code lives. Confirm the target repo matches exactly one entry's `name` field in `/YOUR/WORKSPACE/DIR/agent-config/context/repositories.yaml` (rendered as `YourGithubOrg/<name>`).

---

## 1. Accessibility issue

**Use when:** a WCAG 2.2 AA criterion fails. Always tagged `a11y` + `bug` (AA failures are bugs, not enhancements).

**Estimate guidance:** color/contrast tweak → 1–2; missing label or aria → 2; focus management or keyboard path → 4–8; full pattern rework (e.g., custom dropdown rebuilt accessibly) → 8–16.

```markdown
## Context / background

<Where on the surface this fails. Exact selector, screenshot reference, or screen + element name. What the user-impacting outcome is.>

This was surfaced by the design-team Accessibility Audit on YYYY-MM-DD against [surface](url). Severity: <0–10>.

## WCAG 2.2 criterion

- **Criterion:** <e.g., 1.4.3 Contrast (Minimum) — AA>
- **Conformance level:** AA (failing)
- **Measured value:** <e.g., 3.1 : 1 contrast on `.btn-primary` text against `bg-orange-500`>
- **Required value:** <e.g., 4.5 : 1 for body text>

## Acceptance criteria

- [ ] <specific element> meets <specific criterion> at the measured value of <X> or better.
- [ ] Verified with <method — automated tool name, screen reader, keyboard test>.
- [ ] No regression on adjacent elements <list the ones to check>.

## Out of scope

- N/A — <or list the related findings that have their own issues>.

## Inputs / dependencies

- Target surface: <URL or screen>
- Current value: <exact measurement>
- Required value: <exact measurement>
- Suggested fix: <specific change — exact hex, exact aria attribute, exact behavior>
- Screenshot: <attach or link>

## Risks / notes for implementer

<Any constraint the implementor should know about — e.g., "this hex is locked by the brand spec; if changing it isn't acceptable, change the background instead.">

## Definition of Done

- [ ] Criterion passes verified value when re-measured.
- [ ] Adjacent elements still meet their own a11y criteria.
- [ ] Screenshot attached to the closing comment showing the fix.
```

---

## 2. Brand consistency issue

**Use when:** a Brand Guardian finding — drift, off-spec treatment, or voice/tone mismatch.

**Estimate guidance:** hex swap → 1; logo or asset swap → 2; component restyle → 4; copy rewrite across surfaces → 4–8.

```markdown
## Context / background

<What looks or reads off-brand. Where it appears. Why it matters — usually because another surface does it the right way and this one drifts, or because the brand spec defines the right way and this one doesn't follow it.>

This was surfaced by the design-team on YYYY-MM-DD against [surface](url). Severity: <0–10>.

## Brand spec reference

- **Spec entry:** <path:section, or NONE if spec is missing>
- **What the spec says:** <exact rule>
- **What the surface does:** <exact observation>

## Drift evidence (if cross-surface)

| Surface | What it does | Link |
|---|---|---|
| <surface A — current> | <exact observation> | <url> |
| <surface B — reference> | <exact observation> | <url> |
| <surface C — reference> | <exact observation> | <url> |

## Acceptance criteria

- [ ] <surface> matches <spec entry / reference surface> on <exact dimension>.
- [ ] No knock-on regression on <related surfaces / components>.

## Out of scope

- <Other drift findings, each with its own issue.>

## Inputs / dependencies

- Brand spec entry: <path:section>
- Suggested fix: <exact change — exact hex, exact font weight, exact copy rewrite>
- Screenshot before / after: <attach or link>

## Risks / notes for implementer

<E.g., "if the brand-orange contrast issue (LOOK-XXX) lands first, this issue's hex changes — re-check before merging.">

## Definition of Done

- [ ] Surface matches spec / reference on the named dimension.
- [ ] Cross-surface check confirms no new drift introduced.
- [ ] Closing comment includes before / after screenshot.
```

---

## 3. Visual / polish issue (Design Lead finding)

**Use when:** a Refactoring UI rubric finding — hierarchy, spacing, typography, color, depth, motion, density.

**Estimate guidance:** single-property tweak → 1; component restyle → 2; layout rework → 4; cross-component pattern fix → 8.

```markdown
## Context / background

<What's visually off. Where. Why it matters in terms of user effect — "the secondary CTA has equal weight to primary, so users hesitate.">

This was surfaced by the design-team Scorecard on YYYY-MM-DD against [surface](url). Severity: <0–10>. Dimension: <hierarchy / spacing / typography / color / depth / motion / density>.

## Refactoring UI rubric reference

- **Rule:** <e.g., "Spacing values come from a consistent scale">
- **What the surface does:** <e.g., "padding values include 13px, 17px, 22px — not on any scale">
- **What it should do:** <e.g., "round to the nearest 4px-scale value: 12, 16, 24">

## Acceptance criteria

- [ ] <specific element / pattern> is corrected per the rule above.
- [ ] No regression in adjacent components that share the pattern.
- [ ] Visual diff reviewed by a peer or the design-team Readout Meeting.

## Out of scope

- <Other rubric findings, each with its own issue.>

## Inputs / dependencies

- Affected element / selector: <exact>
- Current values: <exact>
- Target values: <exact>
- Screenshot: <attach or link>

## Risks / notes for implementer

<E.g., "this spacing is inherited from a global utility class — fixing one element will cascade; check the four other places it's used.">

## Definition of Done

- [ ] Element / pattern matches target values.
- [ ] Visual regression check on adjacent surfaces.
- [ ] Closing comment includes before / after screenshot.
```

---

## 4. Content / microcopy issue

**Use when:** a Content Strategist finding — bad button label, vague error, missing empty state copy, voice mismatch, AI-slop tells.

**Estimate guidance:** single-string rewrite → 1; multi-string flow rewrite → 2; voice/tone consistency pass across a surface → 4.

```markdown
## Context / background

<What's wrong with the copy. Where. Why — explain in terms of what the user has to do or feel because of it.>

This was surfaced by the design-team on YYYY-MM-DD against [surface](url). Severity: <0–10>.

## Current copy

> <exact current copy>

## Issue with current copy

<E.g., "button label `OK` doesn't describe the action; users hesitate before clicking.">

## Proposed copy

> <exact proposed replacement>

## Acceptance criteria

- [ ] String replaced verbatim with the proposed copy.
- [ ] Localization keys updated for all locales currently shipped (or flagged for translation if not).
- [ ] No layout overflow at proposed length on the smallest target viewport.

## Out of scope

- <Other copy findings on the same surface — each with its own issue.>

## Inputs / dependencies

- Current string and its location (file path, key, or selector): <exact>
- Voice / tone reference: <brand spec entry, or `NONE — derived from Voice Guardian observation`>
- Locale coverage: <list of locales currently shipped>

## Risks / notes for implementer

<E.g., "this copy appears in two places — confirm both are updated.">

## Definition of Done

- [ ] String updated in code and any CMS surfaces.
- [ ] Closing comment includes before / after screenshot.
```

---

## 5. Usability heuristic issue (Interaction Critic)

**Use when:** a Nielsen heuristic or Krug "don't make me think" finding. Tag `usability` + secondary as appropriate.

**Estimate guidance:** wording / state-display fix → 2; UI-state addition (e.g., add empty state) → 4; flow rework → 8–16.

```markdown
## Context / background

<What heuristic is violated. Where. What the user has to do or feel as a result.>

This was surfaced by the design-team on YYYY-MM-DD against [surface](url). Severity: <0–10>.

## Heuristic reference

- **Heuristic:** <e.g., "Visibility of system status (Nielsen #1)">
- **Violation:** <exact observation — "form submit button shows no loading or success state for 3 seconds before navigating">
- **Expected:** <exact expectation — "show a spinner inside the button on click, replace with success affordance on response">

## Acceptance criteria

- [ ] <state / behavior> is implemented per the expected description.
- [ ] All six interaction states verified: loading, empty, one-item, many-items, error, stale.

## Out of scope

- <Related heuristic findings on the same flow — each with its own issue.>

## Inputs / dependencies

- Affected component / flow: <exact>
- User journey: <which step in which flow>
- Suggested implementation: <specific pattern reference if applicable>

## Risks / notes for implementer

<E.g., "the form's submission already handles errors at the page level — moving error display inline may change the existing telemetry; confirm with the eng owner.">

## Definition of Done

- [ ] Behavior matches the expected description.
- [ ] All six interaction states verified.
- [ ] Closing comment includes a screen recording or sequence of screenshots.
```

---

## 6. AI-slop replacement issue

**Use when:** AI-slop detection flagged the surface (two or more tells). One issue per surface; replace generic with intentional. Tag `polish` + `brand`.

**Estimate guidance:** single-section replacement → 4; surface-wide treatment → 8–16.

```markdown
## Context / background

<Why the surface reads as AI-generated / generic. What it costs us — usually brand erosion and conversion drop because the surface looks like everyone else's.>

This was surfaced by the design-team Scorecard on YYYY-MM-DD against [surface](url). Severity: <6+; AI-slop has a severity floor>.

## Tells observed

- <tell 1 — exact, with selector or copy quote>
- <tell 2 — exact>
- <tell 3 — exact, if any>

## Proposed intentional replacement

| Element | Generic (current) | Intentional (proposed) |
|---|---|---|
| Hero copy | <exact current> | <exact proposed> |
| Hero imagery | <e.g., generic 3D-render> | <e.g., specific photographic treatment per brand spec> |
| CTA color | <e.g., default Tailwind blue-500> | <e.g., brand orange #FF6A00 with documented contrast pair> |
| Card grid | <e.g., 3 identical cards> | <e.g., one feature card 2x size, two supporting cards> |
…

## Acceptance criteria

- [ ] Each row in the replacement table is implemented.
- [ ] Surface re-runs through the design-team Scorecard with AI-slop status `clean`.

## Out of scope

- <Other findings on the surface unrelated to AI-slop, each with its own issue.>

## Inputs / dependencies

- Brand spec entries to follow: <list>
- Imagery assets: <list of asset slots and where to source>
- Copy direction: <reference voice / tone>

## Risks / notes for implementer

<E.g., "the hero is shared across landing variants; replacement needs to land in all of them or split the component.">

## Definition of Done

- [ ] All replacement-table rows implemented.
- [ ] AI-slop re-check passes.
- [ ] Closing comment includes before / after screenshots of the surface.
```

---

## 7. Investigation-backed implementation issue (investigation done as pre-work)

**Use when:** a finding looks like it needs investigation before implementation can be specced — e.g., "is this brand drift caused by a CMS data issue or a stylesheet override?", or "do users actually hesitate at the secondary CTA, or is this a critic-only issue?". There are no investigative / finding-only issues and no `spike` label: do the investigation as the writer's **pre-work** (read the code/CMS, run the user test, check the telemetry before the issue exists), then file a concrete implementation issue that lands the fix via PR. Tag with the relevant secondary label (`brand`, `usability`, `polish`, etc.). If the investigation concludes there is nothing to fix, record that in the scorecard — do not open an issue. If the open question genuinely needs a human product/brand decision, route it to the Project's Human Handoff issue rather than tracking a finding.

**Estimate guidance:** scope the implementation the pre-work identified — single-property/copy fix → 1–2; component or pattern fix → 4–8.

```markdown
## Context / background

<What the pre-work found, and the change it unblocks. State the hypothesis you tested and the evidence — e.g., "confirmed via the CMS export that the drift is a stale data field, not a stylesheet override.">

This was surfaced by the design-team on YYYY-MM-DD against [surface](url). Severity: <0–10>. The cause was confirmed as pre-work before this issue was filed.

## Acceptance criteria

- [ ] <specific element / surface> is corrected per the confirmed cause above.
- [ ] No regression in adjacent components that share the cause.
- [ ] Change verified with <method — re-measure, screen reader, keyboard test, before/after screenshot>.

## Out of scope

- Re-investigating the cause (settled as pre-work before this issue).
- <Other findings on the surface, each with its own implementation issue.>

## Inputs / dependencies

- Confirmed cause (from pre-work): <code reference / CMS field / telemetry / user-test result>.
- Affected element / selector: <exact>.
- Suggested fix: <exact change>.

## Risks / notes for implementer

<E.g., "the fix touches a shared utility — check the other places it's used before merging.">

## Definition of Done

- [ ] Change shipped via PR.
- [ ] Adjacent surfaces re-checked for regression.
- [ ] Closing comment includes before / after screenshot of the surface.
```
