# ASO Linear Issue Templates

Every issue created by the ASO Team follows the global Linear issue quality standard (Title, Context/Background, Acceptance Criteria, Out of Scope, Inputs/Dependencies, Risks/Notes, Definition of Done, Estimate). The templates below are scaffolds — fill in the per-product specifics each time.

All issues are created in the supplied Linear team in `Todo` state. The ASO Team never transitions issues past `Todo`.

**Labels:** Apply `aso` on every issue. Add secondary labels per template below (`bug`, `task`, `experiment`). There is no `spike` label and no investigative / finding-only issues — every issue is implementation work that lands a versioned artifact via a PR gated by CI. Apply `aso-queued-for-next-refresh` when no refresh Project is currently open.

**Linking rules:**
- **Shippable refresh work** (templates 1–5, 8) — link to the open refresh Project if one exists. If none exists, link to the ASO Initiative and apply label `aso-queued-for-next-refresh`. The next cycle re-parents queued issues when a human opens the next refresh Project.
- **Continuous-monitoring work** (templates 6 rating drift, 7 competitor delta) — link to the ASO Initiative directly. Never to a refresh Project; these aren't part of any single refresh's shippable bundle.

## Linear fields to set on every `save_issue` (not body sections)

The templates below are the issue **body** — they populate the `description` field only. The fields below are passed as first-class arguments on the `save_issue` call itself. `estimate` is the one most easily dropped, because it has no place in the body scaffold — set it on every call.

- `team` — the `ASO` Linear team (resolve once per session via `get_team`).
- `stateId` — **`Todo`**. The ASO Team never creates in `Backlog` and never transitions past `Todo`.
- `labels` — `aso` on every issue + the secondary label named in the template (`task` / `bug` / `experiment`); add `aso-queued-for-next-refresh` when no refresh Project is open.
- `estimate` — **hard requirement on every shippable issue.** A Linear field, *not* a body section. Use the complexity ladder `1, 2, 4, 8, 16` from [`context/linear-standards.md` § *Estimating issues*](https://github.com/YourGithubOrg/agent-config/blob/main/context/linear-standards.md#estimating-issues) — complexity (novel reasoning, AC ambiguity, architectural surface), not effort hours. When in doubt, upgrade one tier. An issue cannot move `Backlog` → `Todo` without it; an ASO issue with no estimate is the defect this section exists to prevent. Read linear-standards § *Estimating issues* once per session before writing issues.

**Typical starting estimates** — a starting point, not a cap; adjust on the ladder and upgrade one tier when the AC has gaps:

| Template | Estimate | Why |
|---|---|---|
| 1 Metadata copy refresh | `2` | One metadata text file, established pattern. |
| 2 Screenshot caption rewrite | `2` | First-3 caption text only, no artwork. |
| 3 Custom Product Page setup | `4` | Multi-file CPP spec + deep-link wiring. |
| 4 Localization expansion | `8` | Whole localized listing + locale keyword research. |
| 5 In-app event spin-up | `4` | Event JSON + optional in-app deep-link hook. |
| 6 Rating-drift response | by the scoped fix | Estimate the identified fix; if the root cause is unknown, investigate it as pre-work first, then file the implementation issue for the fix. |
| 7 Competitor-driven metadata/creative change | `2` | Competitor research is pre-work; the issue ships a concrete metadata/creative change via PR. |
| 8 Subtitle / icon A/B test | `4` | One-element variant spec + experiment file. |

---

## 1. Metadata copy refresh — labels: `aso`, `task`

**Title:** `[ASO] <product> — refresh <field> in <locale>`

**Context/Background:** Current `<field>` value is `<current>` (`<chars>/<limit>` chars used). Audit flagged: `<failure reason>`. Last changed `<date>`. Single highest-impact metadata field for this product per the 2026 ASO playbook (title/subtitle = most heavily weighted indexed text). Related to ASO Initiative: `<initiative link>`.

**Acceptance criteria:**
- New `<field>` value written to `app-store/metadata/<locale>/<field>.txt` in the owning app repo.
- Character usage ≥ `<target>`/`<limit>`.
- No exact-token overlap with `<adjacent field>`.
- Merged PR; approved GitHub Action confirms submission to App Store Connect.

**Out of scope:**
- Changes to other locales (separate issue per locale).
- Screenshot or icon changes.
- A/B testing — this is a single-variant ship; the test issue is separate.

**Inputs / dependencies:**
- Proposed value rationale: `<keyword research notes from this cycle's scorecard>`.
- Owning app repo and `app-store/` directory path.
- App review submission window.

**Risks / notes for implementer:**
- Apple may reject for `<flagged terms>` — fallback wording: `<alternative>`.
- Some metadata fields require a binary submission; metadata-only submissions work for others.

**Definition of Done:**
- `app-store/metadata/<locale>/<field>.txt` updated via merged PR; approved GitHub Action confirmed the submission; change visible on the public listing.

---

## 2. Screenshot caption rewrite — labels: `aso`, `task`

**Title:** `[ASO] <product> — rewrite first-3 screenshot captions in <locale>`

**Context/Background:** Current first-3 screenshot captions: `<list>`. Apple began indexing screenshot caption text in June 2025; current captions are tagline-style rather than action-oriented. First 3 screenshots appear directly in search results — they earn or lose the click before the user sees the listing. Related to ASO Initiative: `<initiative link>`.

**Acceptance criteria:**
- Each of the first 3 screenshot captions is verb-led, ≤ 7 words, action-oriented.
- New caption text incorporates the primary keyword cluster `<list>`.
- Captions written to `app-store/screenshots/<locale>/captions.json` in the owning app repo via merged PR; approved GitHub Action confirms upload to App Store Connect.

**Out of scope:**
- Layout / artwork changes (separate creative issue if needed).
- Screenshots 4–10.
- Other locales.

**Inputs / dependencies:**
- Current screenshot source files (Figma / design system).
- Designer time for re-render.
- Proposed caption text (in scorecard).

**Risks / notes:**
- Avoid words Apple flags ("FREE", "#1") — they will reject.
- Maintain readability at search-result thumbnail size.

**Definition of Done:**
- New caption set live in App Store Connect for `<locale>` via merged PR and approved GitHub Action.

---

## 3. Custom Product Page setup — labels: `aso`, `task`

**Title:** `[ASO] <product> — set up CPP for keyword cluster "<cluster>"`

**Context/Background:** CPPs surface in organic search since July 2025. Limit raised to 70/app on October 29, 2025. Audit shows `<N>/70` CPPs in use; cluster `<cluster>` is unclaimed and routes to the default page. Related to ASO Initiative: `<initiative link>`.

**Acceptance criteria:**
- CPP spec written to `app-store/custom-product-pages/<slug>/` in the owning app repo (keywords, screenshots, promotional text, deep link).
- Merged PR; approved GitHub Action confirms CPP created and submitted.
- Keywords `<list>` (subset of the existing keyword field) assigned to it.
- Deep link configured to `<in-app destination>`.

**Out of scope:**
- Adding new keywords to the keyword field (CPPs only swap which page renders for already-indexed terms).
- Other clusters (one CPP per issue; batch only if the user explicitly groups them).

**Inputs / dependencies:**
- Designer time for tailored screenshots.
- Engineering time for the deep link if not already implemented.

**Risks / notes:**
- Keyword overlap between CPPs is under-documented by Apple — measure baseline default-page traffic on `<cluster>` keywords for 2 weeks before launching the CPP, then track redistribution.

**Definition of Done:**
- CPP live; assigned keywords confirmed in App Store Connect; tracking in place to compare CVR vs. default page on cluster keywords for 4+ weeks.

---

## 4. Localization expansion — labels: `aso`, `task`

**Title:** `[ASO] <product> — add <locale> localized listing`

**Context/Background:** Top-15 markets audit flagged `<locale>` as missing. Estimated reachable installs `<estimate>`; ROI threshold passed. Industry benchmarks show ~128% more downloads and ~26% higher revenue per country after adding a localized listing. Related to ASO Initiative: `<initiative link>`.

**Acceptance criteria:**
- `<locale>` declared in `app-store/manifest.json` `locales` array (`apps/<product>/manifest.json` in the `aso` repo); `primary_locale` remains in `locales`; `device_classes` includes `APP_IPHONE_67`. **A listing locale is not delivered until it is declared in `locales`.** Schema: [`app-manifest.schema.json`](https://github.com/YourGithubOrg/riddim-release/blob/main/docs/app-store/schemas/app-manifest.schema.json).
- Listing files written to `app-store/metadata/<locale>/`: name, subtitle, keyword field, description, promotional text.
- Screenshot captions localized under `app-store/screenshots/<locale>/<device-class>/` (per the [canonical contract](https://github.com/YourGithubOrg/riddim-release/blob/main/docs/app-store-contract.md#directory-tree)).
- Translation is human-reviewed (not raw machine output).
- Keyword field is locally re-researched, not transliterated from en-US.
- Merged PR; approved GitHub Action confirms listing live.

**Out of scope:**
- In-app localization (separate engineering issue).
- Customer support coverage in this language (separate ops issue — flag as dependency).
- Authoring `ids.json` — ASC object IDs are reconciled by the delivery workflow against live App Store Connect, not committed in the artifact tree (see [REL-20](https://linear.app/riddimsoftware/issue/REL-20/make-delivery-stateless-drop-repo-committed-idsjson-resolve-ids-from)).

**Inputs / dependencies:**
- Translator (human, native; vendor TBD).
- Local keyword research (Apple Search Ads Discovery for the locale).
- Designer time for localized screenshots.

**Risks / notes:**
- Don't ship the listing if in-app experience is not localized — review trolling on language-mismatch is a real ratings risk.

**Definition of Done:**
- Listing live; first-week impressions and CVR captured for baseline.

---

## 5. In-app event spin-up — labels: `aso`, `task`

**Title:** `[ASO] <product> — launch first in-app event "<name>"`

**Context/Background:** App Store has indexed in-app events since iOS 15.6 and surfaces them in search and browse. Audit shows 0 active events — meaningful organic surface unused. Related to ASO Initiative: `<initiative link>`.

**Acceptance criteria:**
- Event spec written to `app-store/in-app-events/<slug>/manifest.json` (with `metadata/<locale>/` short/long descriptions, `badge-image.png`, `event-image.png`) per the [in-app event contract](https://github.com/YourGithubOrg/riddim-release/blob/main/docs/app-store-contract.md#directory-tree).
- Merged PR; approved GitHub Action confirms event submitted and scheduled for `<window>`.
- Engineering hook in place if the event surfaces in-app content gated by date.
- Tracking in place to measure event-card impressions and tap-throughs.

**Out of scope:**
- Recurring event series (do one first, learn, then series).
- Cross-product events.

**Inputs / dependencies:**
- Designer for event imagery.
- Engineering for in-app deep-link target if not already wired.
- Event copy (in scorecard).

**Risks / notes:**
- Apple rejects events that are not actually time-bounded — pick a real time-bounded moment (content drop, sale, feature release).

**Definition of Done:**
- Event live during its window via merged PR and approved GitHub Action; metrics captured for retro.

---

## 6. Rating-drift response — labels: `aso`, `bug`

**Title:** `[ASO] Rating drift: <product> <oldStars> → <newStars> (<window>)`

**Context/Background:** Rating drift watch fired this cycle. 30-day rating moved `<old>` → `<new>` (Δ `<delta>` stars). Top theme cluster: `<theme>` (severity `<n>`/10). Representative complaints (≤ 15 words each, quoted):
- `"<quote 1>"`
- `"<quote 2>"`
- `"<quote 3>"`

Links to ASO Initiative: `<initiative link>`.

**Acceptance criteria:**
- Root cause identified and either fixed or scoped for fix in the next release.
- Issue closed when 30-day rating recovers above `<threshold>` OR when the underlying issue is verified shipped.

**Out of scope:**
- Reply-to-reviews automation. Reviews are user-facing communication; replies require human review.

**Inputs / dependencies:**
- Crash logs / repro steps from review text where extractable.
- Engineering capacity in the next release.

**Risks / notes:**
- If drift is isolated to one locale, root cause may be a localization bug, not a feature bug.
- If drift correlates with a recent release, prior version's behavior is the comparison baseline.

**Definition of Done:**
- Fix shipped; rating recovers OR an explicit decision is recorded that the underlying complaint is wontfix.

---

## 7. Competitor-driven metadata/creative change — labels: `aso`, `task`

**Title:** `[ASO] <product> — claim/contest <competitor>'s <change> with <our change>`

**Context/Background:** Competitor delta flagged `<competitor>` made `<change>` since last cycle. The writer's pre-work has already settled the claim / contest / ignore call: `<competitor>`'s likely intent is `<intent>`, the change `<does / does not>` target a keyword we rank for or could rank for, and the recommendation is `<claim / contest>`. This issue ships the resulting concrete metadata/creative change. (If the pre-work concludes "ignore," no issue is filed — the finding lives in the scorecard.) Links to ASO Initiative: `<initiative link>`.

**Acceptance criteria:**
- The decided change ships as a versioned artifact under `app-store/` (e.g. `metadata/<locale>/keywords.txt`, a screenshot caption, or a CPP spec) via merged PR; approved GitHub Action confirms submission.
- Change targets the contested keyword cluster `<list>` identified in the pre-work.

**Out of scope:**
- Re-litigating the claim/contest/ignore decision (settled as pre-work before this issue).

**Inputs / dependencies:**
- Pre-work finding from the scorecard: what `<competitor>` changed, the intent, and the claim/contest rationale.
- App Store Connect (own metadata).
- Public listing of the competitor.

**Definition of Done:**
- The metadata/creative change is live via merged PR and approved GitHub Action; first-cycle impact captured for the next scorecard.

---

## 8. Subtitle / icon A/B test — labels: `aso`, `experiment`

**Title:** `[ASO] <product> — A/B test <element>: <hypothesis>`

**Context/Background:** Experiment proposal from this cycle's scorecard. Hypothesis: `<hypothesis>`. Expected lift: `<%>` on `<KPI>`. Sample-size estimate: `<days to significance>` at current traffic. Related to ASO Initiative: `<initiative link>`.

**Acceptance criteria:**
- Variant A (control) and Variant B (`<change>`) defined verbatim. Spec written to `app-store/ppo-experiments/<slug>/manifest.json` (plus `treatments/<name>/manifest.json` and treatment screenshots) per the [PPO experiment contract](https://github.com/YourGithubOrg/riddim-release/blob/main/docs/app-store-contract.md#example-3-ppo-screenshot-experiment).
- Test runs for `<duration>` or until significance, whichever first.
- Test runs in App Store Connect's Product Page Optimization (PPO) where applicable, OR in the org's chosen creative-testing tool (vendor selection requires user sign-off).
- Result documented as a comment on this issue: lift, significance, decision (ship variant / keep control / extend test).

**Out of scope:**
- Multi-variable tests (one element per issue).
- Shipping the winner (separate issue with label `task` once the result is in).

**Inputs / dependencies:**
- Designer / copywriter for the variant.
- Creative-testing tool (vendor sign-off pending if not PPO).
- Experiment manifest in `app-store/ppo-experiments/<slug>/`.

**Risks / notes:**
- PPO has a limited slot count and shared traffic budget; coordinate with concurrent tests.
- Stop the test early if Variant B is materially worse — don't spend traffic to confirm a loser.

**Definition of Done:**
- Test concluded; result recorded as a comment; shipping issue filed if winner.
