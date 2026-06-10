# ASO Audit Checklist

Use this checklist when reviewing an app product against the ASO Doctrine. It complements the ASO Scorecard: the scorecard tells you *how healthy* each area is; this checklist tells you *what to look at* before drawing those conclusions. Treat it like a PR review — find the gaps, file Linear issues, don't push directly to App Store Connect or Google Play Console.

## Metadata & Search

- [ ] **Title** is ≤30 characters and front-loads the value prop, not just keywords.
- [ ] **Subtitle (App Store)** complements the title; doesn't duplicate words from it.
- [ ] **Short Description (Google Play)** is rich in target keywords and stays within 80 characters.
- [ ] **Keyword Field (App Store)** uses comma-separated singulars, no spaces, no repetition of words already in title/subtitle, no competitor brand names.
- [ ] **Long Description (Google Play)** front-loads primary keywords in the first 2–3 sentences; repeats key terms (without stuffing); uses HTML formatting for readability.
- [ ] **Developer Name** is set with the brand keyword if available (e.g., "Foo, by Bar" patterns).
- [ ] **App Bundle ID / Package Name** contains target keywords where possible (Google Play indexes this).
- [ ] **IAP names (App Store)** use up to 30 characters each and contain relevant keywords; visible in search results.
- [ ] **In-App Event names (App Store)** target seasonal or trending keywords; descriptions optimized.
- [ ] **Category** chosen for ranking strength, not just literal accuracy; secondary category set on App Store.
- [ ] **Plurals & compound words** tested in target locales — both forms included where Apple/Google's matching is weak.
- [ ] **Free Ranking Keywords** (iPad, iPhone, app, free, category names) intentionally *not* eaten in metadata.

## Conversion Creatives

- [ ] **Icon** is distinct at small sizes; no emojis (Google Play policy); no "best/#1" claims; tested in the last 12 months.
- [ ] **First three screenshots** carry the value prop. Captions are readable on the smallest preview, with strong type contrast.
- [ ] **Screenshot order** considered — the first screenshot is the only one most viewers see in search results.
- [ ] **Visual Word Recognition:** target keywords appear *visually* in the screenshots, not just in metadata.
- [ ] **App Video** opens with the value prop (no logo intro that wastes the first 3 seconds); captions for sound-off viewing.
- [ ] **Poster Frame (App Store)** chosen deliberately — it's the static fallback when video can't autoplay.
- [ ] **Feature Graphic (Google Play)** drives the video; high contrast and informative even if the video doesn't play.
- [ ] **Custom Background (App Store)** considered for branded story carousels.
- [ ] **What's New / Release Notes** updated in the last 30 days; reflects recent wins, not just bug fixes.
- [ ] **Promotional Text (App Store, editable without re-submission)** used for time-sensitive announcements.

## Localization

- [ ] **Locale priorities** match install/revenue analytics, not gut feel.
- [ ] **Same-language regional variants justified.** Do not add `en-*` variants
  just to rewrite copy; the storefront fallback may already serve the market.
  If a same-language variant is necessary, do not set or change `name.txt`
  unless a deliberate title rename has been approved and availability checked.
- [ ] **Title and subtitle / short description** professionally translated (or native-reviewed) in revenue-critical markets.
- [ ] **Keyword research repeated per locale** — not a literal translation of the English list.
- [ ] **Multi-Index Strategy (App Store)** used in territories that index multiple locales (e.g., Spanish (MX) metadata visible to US users).
- [ ] **Culturalized creatives** — at minimum for FIGS / PR / CJK markets with significant install share.
- [ ] **Custom Store Listings (Google Play)** used when one locale spans multiple countries with different needs.
- [ ] **Custom Product Pages (App Store)** used for audience-segmented campaigns or seasonal pushes.
- [ ] **Seasonal calendar** maintained for the app's category in each major market.

## Ratings & Reviews

- [ ] **Star average** ≥4.5 on each major store; below 4.0 is treated as a structural blocker.
- [ ] **Rating prompt trigger** fires at a positive user moment, not on cold start or after a crash.
- [ ] **Prompt frequency** within native limits: ≤3/365 days (Apple), ~1/month (Google).
- [ ] **Server-side configuration** (Firebase Remote Config or equivalent) controls trigger thresholds without an app release.
- [ ] **Custom vs. system prompt** choice is intentional and consistent with brand guidelines.
- [ ] **Gating** (if used) routes negative sentiment to support, not silence.
- [ ] **Featured/upvoted reviews answered** with a personal reply within 72 hours.
- [ ] **Review themes** mined into a feedback log used by product, not only by support.
- [ ] **Negative-review fixes** announced in What's New when the underlying complaint ships a fix.

## Visibility Beyond Search

- [ ] **Top Chart positioning** monitored for primary category in major markets.
- [ ] **Similar Apps / You Might Also Like** placement audited — does the app appear next to its competitors' listings?
- [ ] **Feature pitch** sent to store editorial in the last 6 months when a launch, OS-feature adoption, or major content drop warrants it.
- [ ] **Pre-launch tools** (App Store Pre-Order, Google Play Pre-Registration) used for major launches.
- [ ] **App sampling** (App Clips, Google Play Instant) evaluated for top user flows.
- [ ] **In-App Events (App Store)** scheduled around seasonal opportunities; event metadata keyword-optimized.
- [ ] **LiveOps Cards (Google Play)** used for time-bound promotions even though they don't affect search.
- [ ] **Privacy disclosures** complete and accurate (Apple Nutrition Labels, Google Data Safety).

## Apple Search Ads

- [ ] **Campaign structure** semantics-based per market — Brand, Generic, Competitor, Discovery, Probing — not a single catch-all.
- [ ] **Brand campaign** defending the app's brand keyword; Cost-Per-Protected-Install modeled against likely competitors bidding on it.
- [ ] **Discovery campaign** uses Broad Match and Search Match ad groups to surface new keywords.
- [ ] **SKAGs (Single Keyword Ad Groups)** in place for top-performing keywords needing precise bid control.
- [ ] **CPA Goals** set on performance campaigns; removed/loosened on scaling campaigns.
- [ ] **Custom Product Pages** linked to ad groups whose intent diverges from the default product page.
- [ ] **MMP attribution** wired up; LAT-on subscribers extrapolated from LAT-off conversion ratios.
- [ ] **Storefronts** chosen to balance scale vs. ROAS; high-ROAS markets prioritized when budget is constrained.

## Tooling & Reporting

- [ ] **Primary ASO tool** configured with the right keyword backlog and tracking the right competitors.
- [ ] **MMP** wired up; organic vs. paid breakdowns trustworthy.
- [ ] **Unified dashboard** (e.g., Looker Studio) pulls App Store Connect + Play Console + MMP into one view for stakeholders.
- [ ] **Source Type filtering** (App Store Connect) used when claiming credit for ASO work — Search ≠ Browse ≠ Web Referrer.
- [ ] **Causal Impact analysis** (or paired t-test) used to validate creative changes when native A/B testing isn't available.
- [ ] **Android Vitals** dashboard reviewed — bad vitals primarily hurt Explore traffic, not search.
- [ ] **Cannibalization** between ASA New Downloads and organic Search App Units monitored on brand and high-volume keywords.

## Process & Governance

- [ ] **Findings filed as Linear issues** with current state, recommended state, impact estimate, effort estimate, and Stack vertical.
- [ ] **No direct App Store Connect / Play Console changes** without explicit product-owner sign-off.
- [ ] **Black-hat patterns absent** — no incentivized installs, fake reviews, keyword-stuffed reviews, competitor brand stuffing, or burst campaign manipulation.
- [ ] **Hypothesis recorded** for every non-trivial creative or metadata change, with expected metric movement and baseline.
- [ ] **Re-audit cadence** scheduled (per the doctrine's recurring cadence).
