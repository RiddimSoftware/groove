# Conversion Playbook

Tactical playbook for the **Conversion** half of the ASO Stack — turning impressions into downloads. Pairs with [`visibility-playbook.md`](visibility-playbook.md). Both are derived from "Advanced App Store Optimization" (2022).

Without a stable or improving conversion rate, top-line impressions don't compound — and both store algorithms feed conversion rate back into ranking. Visibility wins decay; conversion wins compound.

## 1. The Metrics

### App Store has four conversion rates

| Metric | Formula | What it tells you |
| :--- | :--- | :--- |
| **Click-Through Rate** | Page Views (unique) / Impressions (unique) | How well your search-result preview (icon, title, subtitle, first 3 screenshots, rating, price) pulls users into the product page |
| **App Page Conversion Rate** | First-Time Downloads / Page Views (unique) | How efficient your product page is at closing the sale once a user lands on it |
| **Install Rate** | First-Time Downloads / Impressions (unique) | The overall storefront conversion — search-result preview *and* product page combined |
| **Search Conversion Rate** | First-Time Downloads / Impressions, filtered by Source Type = Search | The cleanest ASO signal. Insulated from paid UA campaigns, featurings, and other noise. Can exceed 100% if most installs come straight from search results without a product page visit. |

**Default ASO KPI: Search Conversion Rate.** It removes the most confounding noise.

### Google Play has one

- **Store Listing Conversion Rate** = Store Listing Acquisitions / Store Listing Visitors. Google reports peer-group benchmarks (28-day median) directly in the Play Console.

### Why App Store and Google Play conversion rates *aren't* comparable

- Google Play **only counts users who clicked into the listing**.
- App Store counts users who downloaded straight from search (without visiting the product page) too.
- App Store conversion will *look* lower numerically; that's measurement, not performance.

### Category benchmarks matter more than raw numbers

A 6% install rate is excellent in some categories (Photo & Video) and mediocre in others (Shopping at 12.4%, Utilities at 10.5%). Don't compare across categories. Pull category benchmarks from your ASO tool (AppTweak / Sensor Tower / AppFollow publish them) or directly from Google Play Console.

Selected App Store install rate benchmarks (US, 2021):

| Category | App Page CR | Install Rate |
| :--- | :--- | :--- |
| Shopping | 47.6% | 12.4% |
| Utilities | 60.5% | 10.5% |
| Finance | 42.4% | 10.7% |
| Photo & Video | 78.6% | 6.5% |
| Social Networking | 48.4% | 5.4% |
| Health & Fitness | 53.9% | 4.0% |
| Travel | 11.6% | 5.3% |
| Magazines & News | 35.5% | 0.3% |
| Games — Casino | 9.6% | 5.3% |
| Games — Puzzle | 12.0% | 2.2% |

(High click-through with low page CR like Travel/Casino = users browse a lot but rarely commit. High page CR with low CTR like Photo & Video = strong product page, weak search-result preview.)

## 2. The CRO Loop (six steps)

Phiture's systematic approach to CRO.

### Step 1 — Conduct Research

Three directions:

- **Looking Inward**
  - True value proposition (benefit, not feature: "lose weight" beats "calorie counter").
  - Feature usage data: which features do retained users actually use? Those are the ones to surface.
  - User testing on the product page (interview store visitors, not active users).
  - Reviews mining (good *and* bad — they tell you why people stay or leave).
  - Brand alignment with marketing site, ads, in-app onboarding.
  - **PET-ASO model:** Every viewer needs **Persuasion** (rational benefit), **Emotion** (visceral pull), **Trust** (social proof, ratings, brand cues, security claims). Audit your listing for all three.

- **Looking Outward**
  - Competitor product pages — what they emphasize, in what order.
  - Best-in-class apps in *other* categories — borrow design patterns.
  - ASO best practices from industry publications.

- **Looking Skyward**
  - Seasonality (your category's calendar).
  - Macro events (Super Bowl, Black Friday, OS release, market shifts).
  - Competitive context (a major competitor launch may demand a defensive update).

### Step 2 — Hypothesize

A good hypothesis is *not* "let's try new screenshots." It has three parts:

- **Action:** Specific change. "Replace screenshot 1 with the new value-prop frame."
- **Result:** Expected metric movement. "Install rate +5% in US."
- **Reason:** Research-grounded rationale. "Reviews show users describe the app as 'fast,' but our current screenshot 1 leads with 'powerful' — switching to a speed claim aligns with how users describe value."

Maintain a **creative matrix** (variations × elements) and an **experiment index** (one row per hypothesis, with status and result).

### Step 3 — Prioritize

Score hypotheses with **RICE**:

- **Reach** — how many users see this change (impressions, page views)?
- **Impact** — expected uplift magnitude.
- **Confidence** — how strongly does the research back the hypothesis?
- **Effort** — design + dev + QA + test time.

`RICE = (Reach × Impact × Confidence) / Effort`. Stack-rank.

### Step 4 — Create Assets

Where to focus, in rough priority order. **Don't ignore any element — proper CRO eventually touches all of them.**

#### App Icon

- Recognizable at the smallest size (search-result preview, home screen).
- Visually distinct from competitors in the search-result thumbnail row.
- Brand-aligned (your color, your shape language).
- Industry data (mixed methodology): icon optimization drives ~11–23% CVR uplift, depending on category and store.
- Google Play prohibits emojis and "best/#1" claims in the icon.

#### Screenshots

The most impactful single creative on Google Play; second only to video on the App Store.

- **First three carry the load.** In search results, users see ~3 screenshots inline. Most never visit the product page.
- **Hierarchy:** Most important feature first.
- **Captions readable on small previews.** High contrast type, short phrases, no walls of text.
- **Styles to test:**
  - *Connected screenshots:* a single horizontal scene across all 5–10 frames (high impact, high effort).
  - *Visual pop-offs:* UI elements extend beyond the device frame.
  - *Custom backgrounds:* full-bleed art behind the device mock-up.
  - *Lifestyle photography:* device + real-world context (especially for fitness, travel, dating).
- **Visual Word Recognition:** Target keywords appear visually in captions. Compounds with metadata indexing (especially Google Play).

#### Video / App Preview

- **Value prop in the first 3 seconds.** No logo intro. No fade-in.
- **Captions for sound-off viewing.** Most users mute autoplay.
- **Poster frame** chosen deliberately — it's the still that shows when video can't autoplay.
- **App Store-specific:** up to 3 videos per locale; auto-plays muted on the product page. Industry data: ~16–40% CVR uplift, the widest range in the Stack.
- **Google Play:** one promo video, plays from the Feature Graphic. ~17–24% CVR uplift on average.

#### Title, Subtitle / Short Description

- **Front-load the value prop**, not just keywords. The first words show in search results.
- **Subtitle complements, doesn't duplicate** the title. If the title is the brand, the subtitle is the elevator pitch.
- **Title uplift averages ~8–15%** in A/B tests — meaningful, but smaller than visual changes.

#### Long Description

- Heavy on Google Play (indexed; repeated keywords matter); minor on App Store (only ~2% of App Store users read it; ~5% on Google Play).
- Use HTML formatting on Google Play (line breaks, bold).
- Lead with the value prop; expand with feature lists; close with social proof.
- Update it when you ship a major feature — both for users who read it and for keyword refresh.

#### What's New / Release Notes

- **Update every 30 days.** Even a small entry signals active development to users and store algorithms.
- Highlight features users asked for in negative reviews (closes the feedback loop publicly).

#### Developer Page

- App Store: a single page surfacing all your apps. Optimize it if you have multiple apps; users discover sibling apps here.

#### In-App Purchases (App Store)

- IAPs surface in search results. Their display names (30 chars each) are indexed and can drive both keyword targeting and conversion by previewing pricing/tiers.

#### Custom Backgrounds (App Store) & Feature Graphic (Google Play)

- App Store: a full-bleed background can be set behind the icon/title block on the product page for branded story moments.
- Google Play: Feature Graphic is the static fallback for the promo video; design it to communicate value alone.

### Step 5 — Test Assets

#### Native A/B Testing

- **Google Play Store Listing Experiments:** Built into the Play Console. Up to 5 variants. Tests title, icon, screenshots, feature graphic, video, description. Statistical significance computed by Google.
- **App Store Product Page Optimization (iOS 15+):** Native A/B for icon, screenshots, video. Up to 3 variants vs. control. Runs for up to 90 days.

#### Third-Party Tools

- SplitMetrics, Storemaven, Geeklab, ASO Giraffe — useful when native tools don't cover what you need (e.g., A/B test pre-launch, or test on traffic not routed by the store).
- Fake landing pages (Apple Creative Sets, dedicated landing pages with paid traffic) — for high-stakes redesigns where you want signal before staking on a store-side test.

#### Sequential Analysis

- Before/after a change, run **causal impact analysis** (Google's `CausalImpact` package, or a paired t-test) to control for seasonality and external traffic noise.

#### Pitfalls

- **Test too many variables at once → unclear winners.** Test one element at a time when possible.
- **Cohort homogeneity:** Make sure traffic during test = traffic in control. Paid campaigns during a test skew everything.
- **Bold vs. Incremental:** Bold tests find big lifts faster but with more risk. Incremental tests are safer but need higher traffic and longer runtime to reach significance.

### Step 6 — Measure & Report

- **Read native test statistics**, not absolute rates. A 30% → 32% conversion lift is meaningful if it crosses Google's significance threshold; it's noise otherwise.
- **Calculate annualized incremental downloads** to communicate business impact: `(new CR − old CR) × annualized impressions = lift`.
- **Watch for second-order effects:** A creative that boosts install rate but tanks retention is a loss long-term.
- **Re-baseline after a winning ship.** The new variant is now the control.

## 3. Element Priority — what to optimize first?

Industry consensus on average CVR uplift per element (sources: SplitMetrics 2020, Storemaven 2021; methodology varies):

| Element | App Store | Google Play |
| :--- | :--- | :--- |
| **App Video** | 16–40% | 17–24% |
| **Screenshots** | 21–28% | 13–24% |
| **App Icon** | 18–23% | 11–20% |
| **App Title** | 8–14% | 8–15% |

Rule of thumb: **Big three visuals (Icon, Screenshots, Video) first.** Text metadata is essential for indexation but doesn't move conversion as much.

Caveat: A/B tests measure CVR uplift, *not* traffic gained from improved metadata. Title changes can move both — the title's impact on installs is wider than CVR studies show.

## 4. Localization as Conversion

Localization is sometimes filed under "Visibility," but in practice it's a Conversion lever as much as a Visibility one. A non-localized listing converts dramatically worse in non-English markets even when impressions are unchanged.

**The 4 levels** (in order of investment):

1. **Minimum Viable Localization (MVL):** Auto-translate. Acceptable in the *hidden* App Store keyword field (no user impact, indexing benefit). Risky in visible fields (title, subtitle, short description) — auto-translations of marketing copy frequently miss the meaning (e.g., "film editor" → German "Filmredakteur" = a *journalist* who edits film stories, not video editing software).
2. **Keyword Research & Localization of Metadata:** Native research per locale. Different volume distributions, different vocabulary, different competitive landscape. Don't extrapolate from English ranks.
3. **Culturalization of Creatives:** Local models, local locations, local currencies + units, locale-appropriate fonts (Korean Hangul reads differently in Dodum/Nanum vs. system; Japanese has handwritten-vs-Gothic register conventions), units (miles vs. km), date formats (MM/DD/YYYY vs. DD/MM/YYYY), color symbolism (red = luck in China, danger elsewhere).
4. **Culturalization of In-App Content.**

### Multi-Index Strategy (App Store)

Some App Store territories index *multiple locales* per country. Example: the US App Store indexes English (US), Spanish (MX), Arabic, Russian, and Chinese (Simplified). You can put additional English keywords in the *Spanish (MX) locale's metadata* and rank for them in the US store — buying yourself another 100-character keyword field.

### Where to start

Use existing analytics. No analytics yet? Default to:
- **FIGS:** French, Italian, German, Spanish — high-revenue, mature markets, broad reach.
- **+ PR:** Portuguese (BR), Russian — high volume, less competition.
- **CJK:** Chinese (Simplified, Hong Kong), Japanese, Korean — only with serious investment (different design conventions, custom screenshots, possibly in-app culturalization).

### Custom Pages

- **Google Play Custom Store Listings (up to 5):** Different metadata + creatives per country or install state (e.g., pre-registration vs. installed). Great for one language across multiple countries with different needs.
- **App Store Custom Product Pages (up to 35):** Different creatives per audience or campaign. Each has a unique URL. Direct paid traffic at the page that matches the ad creative.

## 5. Seasonality

Localization across *time*.

- Health & Fitness peaks in January.
- Travel peaks in summer.
- Games spike on weekends.
- Utilities spike midweek.
- Shopping spikes Black Friday → Christmas.

Tactics:
- **Update screenshots and icon** for major holidays (Santa hat, autumn palette, summer scene).
- **Update title/subtitle** to capture surging keywords ("Super Bowl," "Black Friday," "Olympics"). Example: CBS Sports rotates its subtitle through seasonal events; ESPN doesn't, and lost rank on "Super Bowl" during the season.
- **Schedule In-App Events (App Store)** around seasonal moments — the event card is keyword-indexed during the event window.

### When to skip seasonal CRO

Time-sensitive CRO is a luxury, not a necessity. Only attempt it if:

1. Your **baseline ASO is sound**. Don't fix seasonality before you fix structural conversion.
2. The **trend matters to your audience**. "Black Friday" doesn't move a B2B SaaS app.
3. You can **test the optimization before applying it broadly** — even a 1-week native A/B test.

## 6. Ratings as Conversion

A 4.0-star app converts substantially worse than a 4.5-star app in the same category. Ratings affect ranking *and* conversion (the rating block shows on search results and product pages).

- **One 1-star review** requires seven 5-star reviews to recover a 4.5 baseline. Negative-review management is high-leverage.
- **Reply to featured/upvoted reviews.** Personal, specific replies build trust for *every viewer*, not just the reviewer.
- **Active prompts** (system or custom) at the user's "aha moment" beat passive prompts in settings every time.
- **Anti-prompt** after crashes, in the first 1–7 days, after a dismissal.

Full reviews strategy: see [`chapters/ch05-ratings-and-reviews.md`](chapters/ch05-ratings-and-reviews.md).

## 7. Anti-patterns

- **Optimizing creatives without research.** Pretty screenshots without a hypothesis lose more often than they win.
- **A/B testing without statistical significance.** Wishful interpretation of underpowered tests ships losing variants.
- **Skipping localization in revenue-critical markets.** A non-localized listing in Japan converts ~half as well as a culturalized one.
- **Ignoring the long description on Google Play.** Heavily indexed; lazy descriptions cap your reach.
- **Cluttering the title with keywords at brand expense.** CTR drops faster than rank improves.
- **One-and-done testing.** CRO is a loop. Re-baseline, re-research, retest.
- **Skipping causal analysis for off-platform changes.** Paid UA changes, PR events, OS releases all confound conversion data — control for them or your "wins" are noise.
