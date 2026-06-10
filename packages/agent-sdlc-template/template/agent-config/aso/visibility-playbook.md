# Visibility Playbook

Tactical playbook for the **Visibility** half of the ASO Stack — getting your app in front of more people inside the App Store and Google Play. Pairs with [`conversion-playbook.md`](conversion-playbook.md) on the other side of the dichotomy. Both are derived from "Advanced App Store Optimization" (2022).

Visibility comes from four channels: **Search**, **Feature**, **Browse & Explore**, and **Store Ads**.

## 1. Search Visibility (KWO)

### Is your app a fit for KWO?

KWO pays off most for apps that solve a **clearly defined need** users already know how to search for ("period tracker," "puzzle game," "language learning app"). Niche apps in poorly-defined markets ("plumber invoice scheduling") may need to target broader, more generic terms to capture any volume — at the cost of competition.

Ask:
- Does the app solve a recognizable need?
- Is the market category well-defined (users already know how to search)?
- For games: does it fit a known genre players search for ("puzzle game," "match-3")?

If "no" to all three, KWO still helps long-tail discoverability but you'll need supplementary visibility (paid, partnerships, PR).

### How the algorithms work

| Factor | What it means | Where it lives |
| :--- | :--- | :--- |
| **Indexation** | Is the keyword in your metadata? | Title, Subtitle/Short Desc, Keyword Field (App Store), Long Desc (Google Play), Developer Name, Package Name (Google), IAP names, Event names, Bundle names, Category names |
| **Relevance** | How heavily weighted is its placement? | Title (highest) > Subtitle/Short Desc > Keyword Field / Long Desc > IAP/Event names > Long Desc (lower lines on Google Play) |
| **Ranking Strength** | Historical performance for that keyword | Downloads, download velocity, conversion rate for the keyword, retention rate for the keyword (Google Play especially), ratings |

### Where each store indexes

| Field | App Store | Google Play |
| :--- | :--- | :--- |
| Title (30 chars) | High | High |
| Subtitle (30 chars, App Store) | High | — |
| Short Description (80 chars, Google Play) | — | High |
| Keyword Field (100 chars, hidden, App Store) | Medium | — |
| Long Description (4000 chars) | Not indexed for ranking | Medium-high; repetition matters |
| Developer Name | Medium | Medium |
| Package Name / Bundle ID | Not indexed | Medium |
| In-App Purchases | Indexed (App Store) | Not indexed |
| In-App Events | Indexed (App Store) | Not indexed |
| User Reviews | Potentially | Indexed |
| Visual Assets (file names, captions) | Not indexed | Potentially |

### Apple-only quirks

- **Week-long keyword boost on launch.** Apple artificially boosts new apps for ~7 days while it gathers performance data. Launch with your strongest metadata in place. Use this window to capture early signal on high-volume terms, but understand that ranks will drop after the boost expires unless real performance justifies them.
- **"Free Ranking" keywords:** You don't need them in metadata. Examples: `iPad`, `iPhone`, `app`/`apps`, `free` (if free), primary/secondary category names, most misspellings of your title, most singular/plural variants, sometimes related root/variant pairs.
- **Plural and compound matching is imperfect**, especially in non-English locales. If volume differs meaningfully between `podcast` and `podcasts`, include both. For `mice` vs. `mouse` (where matching fails entirely), you *must* include both.
- **Apple uses a simpler algorithm** than Google. Apple allows ranking for keywords not in metadata if matching rules apply. Google uses neural network skip-gram models to rank for related terms beyond literal text.

### The Keyword Optimization (KWO) Cycle

A 4-step loop. Iterate every release cycle, or quarterly minimum.

#### Step 1 — Research

Build a keyword backlog (Excel column or your ASO tool's backlog feature). Sources, in order of yield:

1. **Brainstorming:** Five-minute solo write-then-cluster sessions; what would *you* search for? Check the marketing website for terms.
2. **Competitor metadata:** Google Play shows competitors' titles and short descriptions directly. App Store hides the keyword field; use an ASO tool to infer indexed terms. Don't add competitor brand names — both stores forbid it.
3. **App Store Autofill:** Search bar auto-suggestions reflect real query volume. Try iOS device and `play.google.com` from desktop — results sometimes differ.
4. **Apple Search Ads keyword finder:** When you create an ASA campaign, Apple suggests keywords with `Popularity` scores (5–100, exponential). Best data source for Apple-specific volume.
5. **Google Keyword Planner / Trends:** Web search data, not store search. Use directionally.
6. **Keyword shufflers** (in ASO tools): combine root keywords into long-tail variants.
7. **User reviews:** Words real users use to describe what they love about the app.

Tag each candidate with its source for traceability.

#### Step 2 — Prioritize

Score each candidate on:

- **Volume:** Apple's `Search Popularity` (5–100, exponential — a 60 has ~5× the volume of a 50). Google estimates via third-party tools.
- **Relevance:** Search intent match. Use live search to inspect the top-10 — if they're nothing like your app, the term is wrong even if volume is high.
- **Competition / Difficulty:** Manually: check competitors' current ranks for the term and the volatility (does it move? how much?). Or use the difficulty score from your ASO tool.
- **Reach** (Google Play specific): tags can lift visibility in "Similar Apps."

Sort: high volume × high relevance × low difficulty = ship. High volume × high difficulty = long-term, build performance signal first via long-tail.

#### Step 3 — Target

Place keywords in metadata fields with awareness of weighting:

**App Store (per locale):**
- **Title (30 chars):** Top 1–3 primary keywords. Exact match. Don't keyword stuff at the cost of branding — the title is the strongest brand asset on the storefront.
- **Subtitle (30 chars):** High-relevance terms that complement, *not duplicate*, title words.
- **Keyword Field (100 chars):** Comma-separated singulars, no spaces, no repetition of title/subtitle terms. Don't add competitor names or trademarks.
- **In-App Purchase names (30 chars each):** Indexed; useful for secondary keyword targeting.
- **In-App Event names + descriptions:** Indexed during the event. Time-sensitive keyword opportunities.
- **App Bundle name (85 chars):** Indexed.

**Google Play (per locale):**
- **Title (30 chars):** Same as App Store — front-load primary keyword.
- **Short Description (80 chars):** Highest-weighted of Google's text fields after title. Pack the primary keyword + 1–2 secondary terms.
- **Long Description (4000 chars):** Keywords mentioned early and repeated 3–5× rank better. Don't stuff; use natural sentences.
- **Package Name / Bundle ID:** Indexed. Hard to change post-launch.
- **Developer Name:** Indexed.

**Cross-store:**
- **Visual Word Recognition:** Reflect target keywords *visually* in screenshots. Compounds with metadata indexing (especially on Google Play where Google can OCR/text-recognize assets).

#### Step 4 — Measure

Per-keyword tracking:

- **Keyword Rank:** Aim for Top 10. Top 3 captures the majority of impressions.
- **Impressions (App Store) / Store Listing Visitors (Google Play):** Trend per keyword.
- **Downloads / First-Time Downloads** filtered by keyword (App Store source tracking).
- **Conversion Rate per keyword:** Are you ranking for terms that convert?
- **Retention per keyword** (Google Play): the long-term ranking signal.
- **Organic Uplift:** Installs gained beyond a baseline or paid efforts.

A change in keyword targeting takes ~1–4 weeks to fully reflect in rankings. Don't iterate weekly on the same keyword — give signals time to stabilize.

## 2. Feature Visibility

Editorial featuring drives massive Browse/Explore spikes. Done well, it's the highest single ROI visibility action available.

### Where features happen

- **App Store:** App of the Day, Game of the Day, Story collections, "Apps & Games We Love," "New & Updated," category-specific banners.
- **Google Play:** Editors' Choice, Hero Banner, New + Updated Apps, themed Collections.

### How to get featured

- **Build an outstanding app.** Stable, high UI/UX quality, strong ratings, fast adoption of new OS features (Widgets, Dynamic Island, Material You, Live Activities). Both stores actively look for apps that show off their platform.
- **Strong positioning + story.** Editors don't feature features; they feature stories. What's unique? Who's the team? What's the audience pain point? What's the metric (e.g., "1M users in 6 months in Brazil")?
- **Pitch deck:** Short (3–4 slides), visual, KPI-driven. What the app does, who uses it, traction proof, what's launching next.
- **Relationships.** Build rapport with App Store / Play editors over time. Help when asked. Don't demand.

### Impact

- **App of the Day** vastly outperforms a list-style placement.
- **Feature → spike, then drop-off.** Lean on KWO to retain users beyond the feature window.
- Conversion rate during a feature matters — irrelevant featurings show high impressions and low downloads.

## 3. Browse & Explore Visibility (Outside Featuring)

### Top Charts

- **Ranking signal:** Download velocity (and revenue, for Top Grossing).
- **Tactic:** Pick the primary category strategically. A high relevant category placement beats a low irrelevant one. App Store allows secondary category; use it.
- **Pitfall:** Top Charts reward velocity, so a launch spike fades quickly. Sustain takes sustained velocity.

### Category Switching

Move to a less competitive category *if* the app honestly fits. Two criteria must both be true:

1. **Relevance:** The app fits the new category. Users discovering you there expect what you offer.
2. **Downloads:** Your current daily download volume exceeds what the new category's Top 10 needs.

ASO tools provide "daily downloads needed for Top 10" estimates. Category changes apply globally — a switch that helps in one locale must still make sense in others.

### Tags (Google Play)

Pick up to 5 highly relevant tags. They help Google's "Similar Apps" algorithm classify and recommend you.

### Similar Apps / "You Might Also Like"

Algorithmic. Hard to influence directly. Driven by:
- Keyword overlap
- User co-installation behavior (Google Play tracks installs across the device fleet)
- Tags (Google Play)
- Sometimes Apple uses these collections to feature lesser-known apps next to popular ones.

### Burst Campaigns

Short, intense (often incentivized) install volumes designed to climb Top Charts.

**Status:** Discouraged-to-forbidden by both stores. Google explicitly forbids inflating installs. Apple frowns on incentivized installs. Penalties include removal from charts, removal from search, or de-listing.

**Do not pursue.** Listed here for awareness, not as a recommendation.

## 4. Store Ads & Paid–Organic Synergy

Paid traffic affects organic ranking via download velocity and conversion rate signals. The stores don't differentiate traffic source for ranking purposes.

### Apple Search Ads (ASA) — high-level

ASA is the single most direct paid–organic lever on the App Store. See [`chapters/ch08-guide-to-apple-search-ads.md`](chapters/ch08-guide-to-apple-search-ads.md) for the full Stack.

Available in 61 storefronts (Feb 2022). Two surfaces:
- **Search results ads:** Above organic results for a queried keyword.
- **Search tab ads:** Surfaced pre-query when a user opens Search.

### Cannibalization

When ASA buys an install that would have happened organically. Most common on **brand keywords**.

**Monitoring signal:** ASA New Downloads spike while Search App Units drop for the same keyword.

**Cost-Per-Protected-Install:** If a competitor would bid `$Y` on your brand and convert at rate `X`, the expected loss to leaving the keyword undefended is `$Y / X` per install. Compare to your defensive ad spend per install. Defend if `defensive spend < expected competitor capture cost`.

### Other paid channels

- **Google App Campaigns:** Google's automated app install ads — affects both Play Store ranking and YouTube/Search/Display reach.
- **Facebook/TikTok/etc.:** Off-store, but installs still feed the velocity signal both stores reward.

### Consistency

The store page must **match the ad creative**. Inconsistent messaging breaks the funnel — high CPI, low conversion, no organic lift. Treat the store listing as part of the paid funnel, not as separate territory.

## 5. Anti-patterns to avoid

- **Title keyword stuffing** at the expense of branding — kills CTR.
- **Repeating keywords across fields** (title → subtitle → keyword field) — wastes character budget.
- **Listing competitor brand names** in metadata — forbidden, will trigger review rejection.
- **Auto-translating metadata** in revenue-critical locales — wrecks conversion even if it preserves indexation.
- **Optimizing for one keyword forever** — the iteration loop matters more than any single targeting decision.
- **Confusing impressions with installs** — a featuring that drives impressions without downloads is a near-miss, not a win.
- **Burst campaigns and incentivized installs** — short-term lift, long-term penalty risk.
- **Ignoring the App Store week-long boost** — launching with weak metadata wastes the only artificial boost Apple gives.
