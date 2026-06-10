# Chapter 7: Performance Reporting Dashboards & ASO Tools

## The Challenge of Isolating Organic Installs
Total Installs = Organic Installs (Search/Browse) + Non-Organic Installs (Ads).
Because App Store Connect and Google Play do not cleanly separate organic from non-organic installs (e.g., Apple Search Ads are mixed into Search), relying on a **Mobile Measurement Partner (MMP)** — Adjust, AppsFlyer, Branch, Singular, Kochava — is essential for trustworthy attribution.

**Naming differs across stores:**
*   **App Store "Downloads"** = first-time downloads (new users only).
*   **Google Play "Acquisitions"** = installs by users who didn't already have the app on any other device.

**App Store Connect Source Types** (filter your conversion analysis by these):
*   *Search* — the cleanest ASO signal.
*   *Browse* — featurings, recommendations, charts.
*   *App Referrer* — clicks from another app.
*   *Web Referrer* — clicks from the web.
*   *App Store Promotion* — direct deep links into IAPs or events.
*   *Institutional Purchase* — Apple Business/Education Manager.
*   *Unavailable* — pre-iOS 14.3 traffic, etc.

Filtering by Source Type before claiming credit for any ASO change is mandatory — a featuring (Browse) and a KWO win (Search) move different metrics.

## Key ASO KPIs

### KPIs of Visibility
*   **App Store:** Impressions (Unique Devices).
*   **Google Play:** Store Listing Visitors.
*   *Note:* Browse impressions spike during featurings, while search impressions spike from successful KWO.

### KPIs of Conversion
*   **App Store:** Conversion Rate (App Units / Page Views) averages ~30%. Install Rate (App Units / Impressions) averages ~4%.
*   **Google Play:** Conversion Rate (Acquisitions / Store Listing Visitors) averages ~34%.
*   *Note:* Search conversion rates are generally higher than Browse due to high user intent.

## Measuring Specific Optimizations
*   **Keyword Optimization:** Should yield an immediate increase in specific keyword rankings, followed by a rise in search impressions.
*   **Getting Featured:** Look for massive spikes in Browse/Explore impressions. If downloads don't follow, the featuring's context may not match your app's core value.
*   **Category Switching:** Moving to a less competitive category can increase category rankings and subsequently boost Browse traffic.
*   **Healthy Android Vitals:** Google heavily penalizes apps with bad vitals (crash rate, slow starts, excessive wakeups). Bad vitals primarily cause drops in Explore traffic.
*   **Store Asset Experiments (A/B Testing):** Compare conversion rates between variants. Calculate annualized incremental downloads to understand the true business impact, keeping seasonality in mind.

## Console & Reporting Tools
Avoid jumping between consoles manually. Use data visualization tools like **Google Data Studio** to pull metrics from App Store Connect, Google Play, and MMPs. Create interactive dashboards filtered by date and country/language to act as a single source of truth for stakeholders.

### Third-Party ASO Tools
*   **General ASO:** App Radar, AppTweak, Asodesk, MobileAction, Sensor Tower.
*   **Keyword Discovery:** Google Keyword Planner, Google Trends.
*   **A/B Testing:** ASO Giraffe, Geeklab, SplitMetrics, Storemaven, Upptic.
*   **Competitive Intelligence:** Appfigures, Apptopia.
*   **Review Management:** Appbot, AppFollow, Apptentive, Haystack Reviews.
*   **Screenshot Builders:** Fastlane, AppLaunchpad, LaunchMatic.
