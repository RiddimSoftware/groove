# 2026 ASO Audit Checklist

The audit pass walks every product through this checklist. Each line is graded **PASS / FAIL / PARTIAL** with evidence (the actual current value). Failures generate scorecard rows; high-confidence failures generate Linear issues.

Synthesized from Phiture's 2026 ASO Stack redux, AppTweak's ranking-factor guidance, MobileAction's 2026 ranking-factor breakdown, Apple Developer documentation, and the July / October 2025 App Store platform updates.

## App-level metadata (per locale)

### Title — 30 character limit

- [ ] **Character usage ≥ 24c.** Wasted characters are wasted ranking surface. Apps brand-only ("Bettrack") underweight the highest-weighted indexed field.
- [ ] **Primary keyword present.** The single highest-volume term the app should rank for. Title + subtitle are the most heavily weighted text fields per AppTweak / MobileAction.
- [ ] **No stuffing.** Reads as a human-written brand line, not a keyword salad. Apple's NLP-based ranking now downranks unnatural metadata.
- [ ] **No regulated terms** (e.g. "FREE", "#1", competitor names) — Apple rejects on review.

### Subtitle — 30 character limit

- [ ] **Character usage ≥ 24c.**
- [ ] **No exact-token overlap with title.** Repeating a keyword across title + subtitle wastes character space and adds no ranking value.
- [ ] **Intent-matched, action-oriented.** Describes the user job ("Track every habit, every day") not the company tagline.
- [ ] **Localized human-translated, not machine-translated.**

### Keyword field — 100 character limit

- [ ] **Character usage ≥ 90c.**
- [ ] **Comma-separated, no spaces around commas.** Spaces eat character budget; Apple tokenizes around commas.
- [ ] **No stop words** (the, and, app, free, best, top, etc.).
- [ ] **No token overlap with title or subtitle.** Already-indexed tokens add nothing. Walk the title + subtitle, strip those tokens from the keyword field.
- [ ] **No plural / singular duplication where one indexes both.** Apple indexes singulars and plurals together for most English terms.
- [ ] **No competitor brand names.** Rejected on review.

### Promotional text — 170 character limit

- [ ] **Used.** Promotional text is *not* indexed for search but appears above the description and is the only field that can be updated without an app review submission.
- [ ] **Refreshed within the last 30 days** for active products. Stale promotional text signals an inactive app.

### Description

- [ ] **First 2 lines hook conversion.** Above-the-fold visible without "more". Per Phiture, this is the second-highest-impact CVR surface after screenshots.
- [ ] **Not indexed on iOS for search ranking** — but indexed for editorial discovery and category browse, and *is* fully indexed on Google Play. If the product ships on both stores, the same description must work for Play indexing too.

## Visual assets

### Icon

- [ ] **Tested within the last 6 months** OR is the original launch icon. SplitMetrics reports avg +26% CVR on icon tests.
- [ ] **Distinguishable at 60×60 pt.** Render at icon search-result size; if the icon is unreadable at thumbnail size, recommend a redesign test.

### Screenshots

- [ ] **First 3 screenshots are caption-led and action-oriented.** First 3 appear in search results; first frame is the most valuable marketing real estate on the listing.
- [ ] **Caption text is indexed** (since June 2025). Avoid generic phrases ("All-in-One Solution"); use action verbs ("Track Your Run", "Edit 4K Video").
- [ ] **Localized visually, not just textually.** Currency, units, language inside chrome elements.
- [ ] **Tested within the last 6 months** OR is the launch set. SplitMetrics avg +18% on screenshot tests; per Phiture, most app categories average < 4 screenshot updates per year — competitive opportunity.

### App preview video (optional)

- [ ] **30s muted-autoplay-safe.** Apple's video plays muted by default — captions and motion must communicate without audio.
- [ ] **Tested.** If the product has a video, when was the last variant tested?

## Custom Product Pages

CPPs went organic in July 2025. Limit doubled to 70 per app on October 29, 2025. CPPs do not introduce new keywords to the index — they swap which page renders for an already-indexed term.

- [ ] **At least 5 CPPs created.** Below this is materially under-using a free organic surface.
- [ ] **Each CPP linked to a keyword cluster** distinct from the default page's primary intent. A fitness app: "run tracker" CPP shows running visuals; "workout log" CPP shows strength visuals.
- [ ] **Deep links populated.** CPPs can deep-link into specific in-app content; not using this is leaving CVR on the table.
- [ ] **Coverage of the full keyword field.** Walk the keyword field; for each non-default cluster of 3+ semantically related terms, expect a CPP.

## In-app events

Indexed since iOS 15.6; under-used by most teams.

- [ ] **At least 1 active in-app event.** Apple uses these for browse + search surfaces.
- [ ] **Event name + summary keyword-relevant.** Apple indexes both fields.
- [ ] **Event imagery localized.**

## Behavioral signals

- [ ] **30-day rating ≥ 4.0.** Below 3.5 visibility falls off a cliff per AppTweak; below 4.0 is the warning band.
- [ ] **Update cadence ≤ 4 weeks.** Per AppTweak's ranking-factor guidance, regular updates are a positive signal.
- [ ] **D1 retention ≥ 35%, D7 retention ≥ 15%.** 2026 algorithm benchmarks per the synthesis. (Pulled from analytics if `analyticsReportRequests` available; skipped with a note otherwise.)

## Localization

- [ ] **Top-15 markets covered** per the product's `topLocales` registry entry.
- [ ] **Same-language variants are justified and title-safe.** Do not add
  `en-*` regional localizations unless the target storefront lacks an adequate
  fallback or there is measured country-specific upside. If one is added, body
  copy may vary; `name.txt` stays absent unless a title rename is explicitly
  approved and name availability is known.
- [ ] **No machine-translated keyword fields.** Detected by token-for-token mapping to en-US.
- [ ] **Screenshots visually localized** in covered markets.

## Update / refresh hygiene

- [ ] **Last metadata change ≤ 8 weeks.** Phiture's 2026 cadence guidance is iterative metadata refresh tied to update releases.
- [ ] **Promotional text ≤ 30 days stale** (covered above).
- [ ] **Screenshot set ≤ 6 months stale** OR last test < 6 months ago.

## Out-of-band signals (informational, not graded)

- Editorial featuring history (read from registry / past notes).
- Apple Search Ads spend / impression share if surfaced (not changed by this role).
- Category rank trajectory (from analytics if available).
