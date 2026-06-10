# ASO Doctrine

This document serves as the canonical source of truth for App Store Optimization (ASO) at Riddim Software. It codifies the principles described in "Advanced App Store Optimization: A Complete Guide to ASO" (2022 edition) by Moritz Daan, Maggie Ngai, and Simon Thillay, built around the **ASO Stack** framework originally developed by Phiture in 2016.

## Definition

**App Store Optimization is the process of improving an app's visibility in an app store and maximizing its appeal to users throughout the app's lifecycle, with the objective of increasing downloads.**

Modern ASO is not "SEO for apps." It is a multi-disciplinary practice covering search ranking, browse placement, paid acquisition synergies, creative conversion, ratings management, localization, and reporting.

## Core Principles

- **Two Goals, One System:** Every ASO activity serves either **Visibility** ("how do we get the app in front of more people?") or **Conversion** ("how do we turn impressions into downloads?"). The two goals reinforce each other — higher conversion improves keyword rankings; higher visibility surfaces more conversion data.
- **The Algorithm Rewards Both:** Both Apple and Google rank apps using a blend of indexation (metadata), historical performance (downloads, conversion rate, retention), and ratings. Optimizing one without the other is a leak.
- **Test, Don't Assume:** ASO best practices vary by category, locale, and lifecycle stage. Any non-trivial change should be hypothesis-driven and measured against a baseline.
- **Low-Hanging Fruit First:** Prioritize high-impact, low-effort activities (e.g., metadata keyword optimization) before cross-functional work (e.g., redesigning screenshots, building custom product pages).
- **ASO Is an Ongoing Cycle, Not a Project:** Keyword optimization, creative testing, and review management are iterative. Stores, algorithms, and competitors all move.

## I. The ASO Stack

The ASO Stack is a four-vertical framework that divides ASO into **Goals** and **Foundations**:

### Goals

- **Increase Visibility (Vertical 1):** Get the app in front of more people inside the store.
  - **Search:** Title, Subtitle (App Store), Short Description (Google Play), Keyword Field (App Store), Long Description (Google Play), In-App Purchase names, In-App Event names, App Bundles, App/Developer name.
  - **Feature:** Editorial placements — App/Game of the Day, Editor's Choice, banners, story collections.
  - **Browse & Explore:** Category switching, Top Charts, recommended apps, trending searches, burst campaigns.
  - **Store Ads:** Apple Search Ads, Google App Campaigns.
  - **Plus:** Android Vitals, Localization, Ratings & Reviews, 3rd-party Android distribution, Black Hat ASO (avoid).

- **Increase Conversion (Vertical 2):** Convince viewers to download.
  - **Visual elements:** Icon, Screenshots, Video & Poster Frame, App Size & Permissions.
  - **Text elements:** Title/Subtitle, Description, What's New, Developer Reply, IAP names.

### Foundations

- **Tools (Vertical 3):** App Store Connect, Google Play Console, third-party ASO tools (AppTweak, Sensor Tower, etc.), keyword research, ratings & sentiment tracking, replying to reviews, competitive intelligence, A/B testing, screenshot builders.
- **Supporting Insights (Vertical 4):** Correlation coefficients (organic uplift, ratings/conversion), share of voice, organic cannibalization (Search Ads / App Campaigns eating your own traffic), feature visibility, macro influences (seasonality, OS releases, competitive pressure), Search Ads intelligence, benchmarks.

### The ASO Stack Report Card

Color-code each box of the Stack to track status across a product:
- **Green:** Well-executed, producing measurable impact.
- **Yellow:** Being executed with difficulties.
- **Red:** Failing to deliver, or impact not being measured.
- **Gray:** Not applicable to this app's strategy right now.

## II. Visibility: The Search Algorithm

### Three Factors for Ranking

1. **Indexation (Eligibility):** Is the keyword present in your metadata? Apple and Google each weight different fields (e.g., Title is the highest-weighted field on both stores; Apple's keyword field is hidden but indexed; Google's long description has heavy weight when keywords are repeated).
2. **Relevance:** Where is the keyword placed? Front-loading in Title, Subtitle, or first lines of the Google Play long description signals higher relevance.
3. **Ranking Strength:** Historical performance for that keyword — primarily **download velocity**, **conversion rate for the keyword**, **retention rate for the keyword** (especially Google Play), and **ratings**.

### Algorithm Particularities

- **Week-Long Keyword Boost (App Store only):** New iOS apps get an artificial visibility boost in their first 7 days. Launch with your strongest metadata in place.
- **Free Ranking Keywords (App Store):** Apple indexes some keywords without them appearing in metadata: device names (iPad, iPhone), "app/apps," "free" (if free), category names (e.g., "business"), most misspellings, most plural/singular variants.
- **Plural & Compound Mismatches:** Apple does not always rank an app for the plural/compound of a keyword that's in metadata. When in doubt, include both variants. Singular/plural matching is weaker for non-English searches.
- **Exact match > variant match.** If "podcast" and "podcasts" both have meaningful volume, include both.
- **Google Play uses neural network models** (skip grams) to associate related keywords beyond literal metadata text. Apple's algorithm is simpler.

### The Keyword Optimization (KWO) Cycle

A 4-step iterative loop:

1. **Research:** Build a keyword backlog from brainstorming, competitor metadata, App Store autofill, Apple Search Ads keyword finder, Google Keyword Planner, keyword shufflers, and user reviews. Exclude competitor brand names (forbidden by both stores).
2. **Prioritize:** Filter by **volume** (Apple's 5-100 Search Popularity is exponential), **relevance** (does intent match your app?), and **competition/difficulty** (current top-10 strength).
3. **Target:** Place top-priority keywords in the highest-weighted fields. Don't repeat keywords across fields (especially in Apple's keyword field). Reflect targeted keywords visually in screenshots ("Visual Word Recognition") for compounding effect.
4. **Measure:** Track keyword ranks, impressions, downloads, keyword-level conversion and retention, and organic uplift.

## III. Conversion: The CRO Loop

### Conversion KPIs

- **App Store:**
  - *Click-Through Rate:* Page Views (unique) / Impressions (unique) — flow through the store.
  - *App Page Conversion Rate:* First-Time Downloads / Page Views (unique) — product page efficiency.
  - *Install Rate:* First-Time Downloads / Impressions (unique) — overall storefront conversion.
  - *Search Conversion Rate:* First-Time Downloads / Impressions filtered by Source Type = Search — purest ASO KPI. Can exceed 100% if most installs come straight from search results.
- **Google Play:**
  - *Store Listing Conversion Rate:* Store Listing Acquisitions / Store Listing Visitors. Google reports peer-group benchmarks directly in the console.

Conversion rates on Google Play typically look higher than App Store because Google's metric only counts users who clicked through to the listing; Apple's includes users who installed straight from search results.

### Phiture's CRO Loop (Six Steps)

1. **Conduct Research** — Look Inward (value props, feature usage, user testing, reviews mining, brand alignment, PET-ASO model: Persuasion / Emotion / Trust), Look Outward (competitors, ASO best practices, market intelligence), Look Skyward (seasonality, world events).
2. **Hypothesize** — A hypothesis specifies *action* + expected *result* + research-grounded *reason*. Maintain a creative matrix and experiment index.
3. **Prioritize** — Score hypotheses with **RICE** (Reach, Impact, Confidence, Effort).
4. **Create Assets** — Visuals (icon, screenshots, video, custom backgrounds, feature graphic) and copy (title, subtitle, description, what's new, IAP names).
5. **Test Assets** — Google Play Store Listing Experiments (native A/B), App Store Product Page Optimization (native iOS 15+), third-party tools, or sequential before/after analysis with causal impact modeling. Watch for cohort homogeneity and seasonal contamination.
6. **Measure & Report** — Use statistical significance, not hunches. Calculate annualized incremental downloads.

### Element Priority

Industry consensus on conversion lift (varies by study):
- **App Store:** Icon (≈18–23% uplift), Screenshots (≈21–28%), Video (≈16–40%).
- **Google Play:** Screenshots (≈13–24%), Icon (≈11–20%), Video (≈17–24%), Feature Graphic.
- **Text metadata** (title, subtitle) drives less conversion lift (~8–15%) but is essential for indexation. Only ~2% of App Store users and ~5% of Google Play users read the full description.

**Rule:** Optimize the "big three" visuals first, but don't disregard any element — proper CRO eventually touches them all.

## IV. Localization & Seasonality

- **Available locales:** App Store supports 39; Google Play supports 77.
- **Multi-Index Strategy (App Store):** Some territories index multiple locales (e.g., the US indexes English (US), Spanish (MX), Arabic, Russian, Chinese (Simplified)). Use secondary-locale metadata to rank for additional English keywords in the same territory.
- **Same-language variants are low-value and title-risky.** Do not add a new
  regional locale only to split `en-US` vs. `en-CA` copy unless there is a
  measured reason. If a same-language variant is needed, tune the body fields
  (subtitle, keywords, description, promo text, screenshots) and leave the app
  name/title alone. Apple re-runs name uniqueness checks when a localization is
  created; Reach hit HTTP 409 when an explicit `en-US` localization tried to
  create `name = Reach` even though the US storefront already rendered the
  fallback listing as `Reach`.
- **The Four Levels of Localization:**
  1. **Minimum Viable Localization (MVL):** Machine-translate metadata to test signals; safer in App Store's hidden keyword field than in visible fields.
  2. **Keyword Research & Localization of Metadata:** Native research per locale — direct translation often fails (e.g., German "Filmredakteur" means film *editor* the job title, not film editing software).
  3. **Culturalization of Creatives:** Local slang, colors with appropriate cultural meaning, local models and landmarks, locale-appropriate fonts, units of measurement, date and currency formats.
  4. **Culturalization of In-App Content.**
- **Where to start:** Use existing app analytics, then default to **FIGS** (French, Italian, German, Spanish), then **PR** (Portuguese, Russian), then **CJK** (Chinese, Japanese, Korean) for Asian markets.
- **Custom Store Listings (Google Play, up to 5):** Different metadata + creatives per country or install state.
- **Custom Product Pages (App Store, up to 35):** Different creatives per audience or campaign; each has a unique URL.

**Seasonality** is localization across time. Health & Fitness peaks in January, Travel in summer, Games on weekends, Utilities midweek. Tweak titles, subtitles, screenshots, and icons to reflect events (Super Bowl, Black Friday, Christmas, regional holidays). Treat time-sensitive CRO as a luxury — only attempt it if baseline ASO is sound and the trend matters to your audience.

## V. Ratings & Reviews

- **The Lifeblood:** Apps below 4.0 stars rarely get installed; apps below 4.5 are disadvantaged versus higher-rated competitors. One 1-star review takes seven 5-star reviews to neutralize at a 4.5 baseline.
- **Active > Passive prompts.** Active prompts request a rating at a specific moment; passive prompts wait in settings.
- **Trigger Choice:**
  - *Simple Usage Triggers:* fired after X launches or Y hours of use.
  - *User Journey Triggers:* fired at the user's "aha moment" (e.g., after completing a positive action) — most effective.
  - *Anti-Triggers:* never prompt after a crash, in the first 1–7 days, after a previous dismissal, or more than once per ~4 months. Apple allows the native prompt 3×/365 days; Google allows ~once/month.
- **System vs. Custom Prompts:** System prompts let users rate without leaving the app (best UX). Custom prompts allow branding but require leaving the app.
- **Gating:** Asking "Do you like the app?" first, then routing "Yes" to the rating prompt and "No" to support. Common and effective; technically discouraged for native prompts.
- **Replying to Reviews:** Prioritize featured/upvoted reviews. Apologize, personalize, address specifics. Avoid copy-paste templates.
- **Keywords in reviews are indexed** (Google Play, and indirectly on App Store). Positive reviews can broaden discoverability.

## VI. Store Promotional Tools

- **Pre-Registration:** App Store Pre-Order (2–180 days); Google Play Pre-Registration (up to 90 days; supports a free in-app gift).
- **App Sampling:** Google Play Instant (15MB trial); Apple App Clips (10MB; discovered *outside* the App Store via Safari/iMessage/NFC/QR/Maps).
- **Targeted Pages:** Custom Store Listings (Google Play, country/install-state targeted); Custom Product Pages (App Store, unique URL per audience).
- **Events:**
  - **App Store In-App Events** are **indexed in search** — keywords in event names and descriptions boost rankings temporarily.
  - **Google Play LiveOps Cards** are *not* indexed.
- **In-App Purchases (App Store):** IAP names appear in search results and are indexed; bundle names (up to 85 chars) are also indexed.
- **Programs:** Google Play Points (loyalty), Google Play Pass (apps + games), Apple Arcade (games only, no ratings displayed, auto-playing video banner).
- **Privacy:** Apple Nutrition Labels and Google Data Safety sections appear near the bottom of product pages — minimal direct conversion impact, but a compliance must.
- **Google Play Star Rating Filter:** Filters on the *daily* average of new ratings, not the historical average — a strong app can temporarily disappear from the 4.5+ filter after a bad day.

## VII. Apple Search Ads (ASA) & Paid–Organic Synergy

### The ASA Stack (5 Layers)

1. **Campaigns:** Semantics-based structure per market — Brand, Generic, Competitor, Discovery (Broad Match + Search Match ad groups), Probing. Set high lifetime budgets to avoid pauses; use Daily Caps to throttle non-performers.
2. **Ad Groups:** Refine by Device (iPhone vs. iPad), Customer Type (New/Returning/Other-apps), Demographics, Limit Ad Tracking (LAT), Location, Ad Scheduling, Ad Group Structure (SKAGs — Single Keyword Ad Groups — for top performers), Search Match, CPA Goal, Custom Product Pages.
3. **Keywords:** Match Types — Exact (`[brackets]`, precise), Broad (variants, synonyms, plurals, misspellings), Search Match (Apple-driven, no keyword needed, ad-group-level, excellent for discovery). Bid management is core.
4. **Tools:** Automation scripts, Mobile Measurement Partners (MMPs like Adjust/AppsFlyer) + ASA Attribution API for ROAS optimization, App Store Connect (for cannibalization monitoring), competitive intelligence tools, third-party media buying platforms.
5. **Supporting Insights:** Organic uplift, benchmarks, share of voice, organic cannibalization, micro (endogenous) and macro (exogenous) influences.

### Synergies & Cannibalization

- **Organic Uplift:** Successful ASA campaigns lift download velocity for the same keyword, which lifts organic ranking — a paid–organic flywheel.
- **Cannibalization** happens when ASA buys an install that would have happened organically (most common on brand keywords). Monitor when ASA New Downloads spike while Search App Units drop.
- **Cost Per Protected Install:** Compare ad spend to the expected loss to a competitor bidding on your brand term. If a competitor would convert your brand traffic at conversion rate X with bid Y, defending the keyword is cheaper than letting them steal it.

ASA is available in **61 storefronts** (as of Feb 2022). Apple now exposes ads in the **Search tab** (pre-query) in addition to **search results**.

## VIII. Performance Reporting

### The Isolation Problem

Total Installs = Organic Installs (search/browse) + Non-Organic (ads). Neither App Store Connect nor Google Play Console separates organic from non-organic cleanly — Apple Search Ads installs are blended into Search. Use an **MMP** (Adjust, AppsFlyer, Branch, Singular) as the source of truth for blended attribution.

Naming differs across stores:
- **App Store "Downloads"** = first-time downloads.
- **Google Play "Acquisitions"** = installs by users who didn't already have the app on another device.

### What to Measure

- **Visibility KPIs:** Impressions (App Store), Store Listing Visitors (Google Play). Browse spikes → featuring. Search spikes → KWO success.
- **Conversion KPIs:** Conversion Rate, Install Rate, Search CR. Search CR is the cleanest ASO signal.
- **Source attribution:** App Store Connect lets you filter Source Type (Search, Browse, App Referrer, Web Referrer, App Store Promotion, Institutional Purchase, Unavailable).
- **Causal Impact:** When testing creative changes outside native A/B tools (or to validate a sequential rollout), use causal impact analysis to control for seasonality and external traffic.

Pull data into a unified dashboard (Google Data Studio / Looker Studio is the common choice) so stakeholders read one source of truth instead of switching consoles.

## IX. Organizational Codification (Riddim Standards)

### Ownership & Cadence

- **Scorecard cadence:** Each shipped product gets an **ASO Scorecard** refresh on a recurring cadence (see `aso-scorecard.md`). The scorecard quantifies Visibility, Conversion, Localization, Ratings, Tooling, and Insights health.
- **Audit checklist:** Before any store metadata or creative goes live, run it against `audit-checklist.md`. Treat the checklist like a PR review for the storefront.
- **No PR-style overrides for live store changes:** App Store / Play Console submissions are user-visible and hard to revert quickly. Default to staged rollouts and to backing each change with a hypothesis.

### Recommendations vs. Publication

- The ASO team is a **recommender, not a publisher**. Concrete changes go through the product owner of each app, even when an audit identifies a quick win.
- **Linear issues** are the artifact of every audit finding. One finding = one issue with: current state, recommended state, impact estimate, effort estimate, references to the relevant Stack vertical.

### Tooling Defaults

- **Primary ASO tool:** Use whichever of AppTweak / Sensor Tower / App Radar / AppFollow is contracted; each app product should declare its primary tool in its repo's `CLAUDE.md`.
- **MMP:** Required for any product running paid UA. Without an MMP, organic attribution claims are guesses.
- **A/B testing:** Use the native store tool first (Google Play Store Listing Experiments / Apple PPO). Reach for SplitMetrics / Storemaven / Geeklab only when native limits are blocking.

### Black Hat Discipline

- **Burst campaigns, incentivized installs, fake reviews, keyword-stuffed reviews, and competitor name stuffing are off-limits.** Both stores explicitly prohibit them, and detection penalties are severe and often permanent.
- Borderline practices (e.g., gating prompts) are allowed only where the books in the Stack consider them industry-standard *and* where the store's own guidelines do not flag them as violations.

## X. Repo-Local ASO

Each app product's repo should record:
- **App identifiers:** Bundle ID, App Store App ID, Google Play package name, App Store Connect / Play Console URLs.
- **Primary categories** on each store, with the rationale for current placement.
- **Current locales** the app is published in, plus the next localization priority.
- **Primary keywords** being targeted, with their current ranks and the date of last KWO refresh.
- **Conversion targets** by store (current vs. category benchmark) and the most recent A/B test results.
- **Rating snapshot** (current star average, volume, sentiment summary) and prompt trigger logic.
- **Custom Product Pages / Custom Store Listings** in use, with the campaign or audience each targets.
