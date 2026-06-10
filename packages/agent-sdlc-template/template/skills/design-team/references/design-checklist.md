# Design Checklist (2026)

The consolidated rubric the five voices run against. Each section is one voice. The Scorecard Meeting walks all five; focused meetings use only the relevant section.

Severity scale (applies to every finding, every section):
- **9–10** — broken / blocking. Ship-stopper or active harm to users / brand.
- **7–8** — visible problem a real design team would not ship.
- **5–6** — friction or polish gap; below the bar but not blocking.
- **3–4** — minor; would surface in a thorough critique.
- **0–2** — nit / preference; usually not worth filing.

A finding becomes a Linear issue regardless of severity (see "Operating principles" in SKILL.md). Severity drives prioritization, not write-out.

---

## 1. Design Lead — visual quality (Refactoring UI rubric)

Source: Wathan & Schoger, *Refactoring UI*. The bar is "intentional, disciplined, looks designed."

### Hierarchy
- Primary action is unmistakable from across the room. One CTA per screen carries the most visual weight.
- Secondary actions are visibly subordinate (lighter weight, smaller, text-only, or muted color).
- Section headings and body text differ in size **and** weight, not just size.
- Important information (price, status, CTA) breaks out of the body baseline.

### Spacing
- Spacing values come from a consistent scale (4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 — or another disciplined progression). No arbitrary `padding: 13px`.
- Vertical rhythm: similar elements have equal spacing between them.
- Padding inside interactive elements ≥ touch-target minimum (44 × 44 CSS px, ideally 48).
- Whitespace is treated as a feature, not absence. Cramped layouts are a finding.

### Typography
- 1–2 font families. Pairs are intentional (e.g., display + body, not random).
- 4–6 font sizes total across the surface.
- 2–3 weights total. No Light + Regular + Medium + Semibold + Bold + Black sprawl.
- Line-height: 1.5+ for body text; tighter (1.1–1.3) for display.
- Line length: 50–75 characters for long-form body.
- Letter-spacing: tight on display, default on body, wider on uppercase labels.

### Color
- Limited palette: 1 brand color + 1–2 supporting + neutrals.
- Semantic use: red for destructive / error, green for success, brand for primary action. Don't use brand color for everything.
- Backgrounds use multiple shades of one neutral, not pure white + pure black.
- Icons / borders are subdued (low contrast vs background) unless they're the focus.

### Borders, shadows, depth
- Prefer shadows + background-color shifts + spacing over borders.
- Shadows are realistic — light source consistent across the surface, blur scales with elevation.
- No borders on every card; pick one technique per surface and stick to it.

### Icons
- Simple, recognizable, consistent stroke weight. One icon family per surface (don't mix line + filled + duotone arbitrarily).
- Icons paired with labels until the icon is universally understood (search, settings, user).
- Decorative icons are sized down vs functional icons.

### Density and whitespace
- Information density matches the user's task. Dashboards earn density; marketing pages earn whitespace.
- Group related items tighter, separate unrelated items wider (Gestalt proximity).
- "Above the fold" is overrated; vertical scrolling is fine if hierarchy is clean.

### Motion
- Transitions: 150–250 ms, ease-out. No 1-second interpolations on click feedback.
- `prefers-reduced-motion`: respected. No required animation for completing a task.
- Motion has a job (focus, state change, spatial continuity). Motion-for-decoration is a finding.

---

## 2. Brand Guardian — brand consistency

The Brand Guardian compares the captured surface against the brand spec (`references/brand-spec.md` if present) AND against other Riddim surfaces (cross-surface drift).

If `brand-spec.md` is missing or stub-only, the Brand Guardian degrades to surface-to-surface-drift-only and surfaces a missing-spec issue once per product per quarter.

### Logo treatment
- Clear-space around the logo respects the spec (default: half the logo's height on all sides).
- Minimum size respected.
- Color variants: full color on light backgrounds; monochrome on photography or off-brand backgrounds.
- No stretched, recolored, drop-shadowed, or outlined treatments.

### Color
- Primary brand colors match the spec hex values exactly.
- Secondary palette is from the spec, not invented.
- Color contrast in brand applications meets a11y minimums (see Accessibility Auditor).

### Typography
- Display + body fonts match the spec. No substitutions from the system stack unless the spec explicitly allows it.
- Weights / sizes consistent with spec scale.

### Voice and tone
- Marketing copy reads in the brand voice (the spec describes voice — e.g., "direct, technical, dryly funny" or whatever the spec defines).
- Product copy and marketing copy are written by the same voice. Drift between the two surfaces is a finding.
- No em-dash-heavy AI-slop tells in marketing copy.

### Imagery
- Photography style matches the spec (e.g., real / candid vs studio / staged).
- Illustration style matches the spec. No mixed styles within one surface.
- Stock 3D-render imagery is a flag unless the spec endorses it.

### Cross-surface drift
For every audit, compare the captured surface against the previously-captured surfaces of the same product (and adjacent Riddim products). Drift findings:
- Same component renders differently on website vs product (button radius, padding, font weight).
- Brand color hex shifts between surfaces.
- Tagline / one-liner copy differs across surfaces.
- Logo treatment differs (full color in one place, mono in another, no rationale).

---

## 3. Accessibility Auditor — WCAG 2.2 AA

Every WCAG 2.2 AA failure is a bug. Default conformance target: **AA**. AAA findings surface as recommendations in the scorecard but don't open issues unless the user opted in.

### Perceivable
- **1.1.1 Non-text Content** — every image has appropriate alt text; decorative images have empty alt; icons-as-buttons have accessible names.
- **1.3.1 Info and Relationships** — semantic HTML; headings in order; lists are lists; form labels are associated.
- **1.4.3 Contrast (Minimum)** — body text 4.5 : 1; large text (18pt+ or 14pt bold) 3 : 1.
- **1.4.10 Reflow** — content reflows at 320 CSS px without horizontal scroll.
- **1.4.11 Non-text Contrast** — UI components (form borders, focus rings, icons-as-info) 3 : 1 against adjacent colors.
- **1.4.12 Text Spacing** — content survives line-height 1.5×, paragraph-spacing 2×, letter-spacing 0.12×, word-spacing 0.16×.

### Operable
- **2.1.1 Keyboard** — every interactive element is reachable and operable from keyboard alone.
- **2.1.2 No Keyboard Trap** — focus can leave any component via keyboard.
- **2.4.3 Focus Order** — focus order is logical (typically left-to-right, top-to-bottom).
- **2.4.7 Focus Visible** — focus indicator is always visible on every focusable element.
- **2.4.11 Focus Not Obscured (Minimum)** *(NEW in 2.2)* — focused element is not entirely hidden by sticky headers, cookie banners, or other overlays.
- **2.4.13 Focus Appearance** *(NEW in 2.2)* — focus indicator has sufficient size and contrast (≥ 2 CSS px outline OR equivalent area, ≥ 3 : 1 contrast).
- **2.5.7 Dragging Movements** *(NEW in 2.2)* — any drag interaction has a single-pointer alternative (click / tap).
- **2.5.8 Target Size (Minimum)** *(NEW in 2.2)* — interactive targets ≥ 24 × 24 CSS px (with documented exceptions for inline links, etc.).

### Understandable
- **3.2.6 Consistent Help** *(NEW in 2.2)* — help mechanisms (contact link, chat widget) appear in consistent locations across pages.
- **3.3.7 Redundant Entry** *(NEW in 2.2)* — information already entered in the same process is auto-filled or available to the user (e.g., shipping = billing checkbox).
- **3.3.8 Accessible Authentication (Minimum)** *(NEW in 2.2)* — auth doesn't require cognitive function tests (transcribing a code from one tab to another, solving puzzles) without an alternative.

### Robust
- **4.1.2 Name, Role, Value** — custom widgets expose proper ARIA name / role / state.
- **4.1.3 Status Messages** — status updates (form errors, search results count) announced via live regions or `role="status"` / `role="alert"`.

### Beyond WCAG (always check)
- Forms: labels visible (placeholder is not a label); error messages associated with inputs; required fields marked accessibly.
- Dynamic content: focus management on route change / modal open / dialog dismiss.
- `prefers-reduced-motion`: respected.
- `prefers-color-scheme`: dark mode usable, contrast preserved.
- Touch targets: 44 × 44 CSS px recommended (24 × 24 is the WCAG floor, not the bar a world-class team ships at).

---

## 4. Interaction Critic — Nielsen + Krug

### Nielsen's 10 heuristics (1994, reconfirmed 2020)
1. **Visibility of system status** — the surface tells the user what's happening (loading, success, error, progress) within ~1s of an action.
2. **Match between system and real world** — language matches the user's mental model, not the implementation. No `null`, no internal IDs, no "ERROR_INVALID_TXN_STATE".
3. **User control and freedom** — undo, cancel, back. Multi-step flows have a clear exit. Destructive actions are reversible or confirmed.
4. **Consistency and standards** — established UI patterns (search icon = search, hamburger = nav, etc.). Internal consistency across the surface.
5. **Error prevention** — disable invalid actions; constrain inputs; confirm destructive actions; default to safe.
6. **Recognition rather than recall** — show, don't make me remember. Recently-used items, autocomplete, visible options.
7. **Flexibility and efficiency of use** — power users can move fast (keyboard shortcuts, bulk actions); novices have an obvious path.
8. **Aesthetic and minimalist design** — every element earns its presence. Visual noise is a finding.
9. **Help users recognize, diagnose, recover from errors** — error messages explain what happened, why, and how to fix. Plain language. No error codes alone.
10. **Help and documentation** — accessible from where the user is stuck, not buried.

### Krug's "Don't Make Me Think" (additional)
- **Self-evident first; if not, self-explanatory.** A user should not have to puzzle out the page.
- **Cut the words in half, then half again.** Marketing copy and product UI both bloat. Cut filler.
- **Conventions over creativity** for established UI patterns. Be unique where it matters; be conventional everywhere else.
- **Trunk test** — pick a random page; can a user identify what site they're on, what page, the main sections, the primary action, and the search box, in 5 seconds?

### State coverage (often missing)
Every interactive surface has six states. If any are stubbed, generic, or missing, that's a finding:
1. Loading
2. Empty (zero data)
3. One item (often visually broken vs many items)
4. Many items
5. Error
6. Stale / partial / offline

---

## 5. Content Strategist — copy quality

### Microcopy
- Buttons are verbs (`Save changes`, not `OK`). Action labels match the action they trigger.
- "Click here" is a finding. Write descriptive link text.
- Default placeholders / labels are a finding. `Enter your email` is acceptable; `email@example.com` as a placeholder is fine; the input should still have a real label.

### Errors
- Error messages explain what happened, why, and how to fix it.
- Plain language. No `ERR_INVALID_TOKEN_42`.
- Errors are paired with the input that caused them, not just shown at the top.

### Empty / loading / zero states
- Empty states are instructive — they teach the user what to do next, ideally with a primary action.
- Loading states use skeletons (matching the eventual shape) over spinners. Spinners signal "I have no idea how long this takes."
- Zero states use real numbers / examples so the user understands what populated state will look like.

### Voice and tone
- Matches the brand spec voice. Drift is a Brand Guardian + Content Strategist co-finding.
- Marketing voice and product voice are coherent — both written by the same brand.
- AI-slop tells in copy: em-dash-heavy lists, "delve into," "in today's fast-paced world," excessive parallelism, tricolons in every paragraph.

### Localization-readiness
- No hard-coded plurals (`1 items`).
- Avoid idioms unless intentional brand voice ("touchdown!" doesn't translate).
- Date / number formats use locale-aware formatting.
- Length: copy that fits English may overflow in German / Russian / Finnish. Note risk on dense layouts.

### Filler and bloat
- "In order to" → "to."
- "At this time" → "now" (or delete).
- "Please note that" → delete.
- "We are excited to announce" → just announce it.

---

## 6. AI-slop detection (cross-voice)

Run after the voices report. Flag the surface if it shows two or more of:
- Default Tailwind / shadcn / Bootstrap palette and component shapes, unmodified.
- Gradient hero with abstract 3D-render imagery and "modern minimalist" feel.
- Identical card grids with no clear hierarchy between cards.
- Em-dash-heavy marketing copy with parallel lists.
- "We help [X] [verb] [Y]" or "The [adjective] way to [verb]" hero copy.
- Generic stock illustrations (the chunky-isometric-flat-3D style).
- Inconsistent spacing values that don't lie on a scale.
- Single CTA color used everywhere with no semantic distinction.
- "Lorem ipsum" or placeholder text in production.

AI-slop findings have a severity floor of 6 — these compound across surfaces and erode brand. Pair every AI-slop finding with a concrete intentional alternative (a specific palette swap, a specific hero rewrite, a specific component re-treatment).

---

## 7. Performance and polish (cross-voice; lightweight)

Not a full perf audit — those belong to a separate engineering pass. The Design Team flags only what shows up to the user as polish.

- **LCP < 2.5s** on a 4G / mid-tier device.
- **CLS < 0.1** — no layout shift after first paint.
- **INP < 200ms** — interactions feel responsive.
- Loading states for any operation > 100ms.
- Optimistic UI for actions where rollback is cheap (likes, toggles, drag).
- Images: explicit `width`/`height` to prevent CLS; `loading="lazy"` below the fold.
- 60fps on transitions and scroll.
