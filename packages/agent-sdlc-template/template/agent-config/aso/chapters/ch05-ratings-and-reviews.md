# Chapter 5: Ratings & Reviews

## Why Are Ratings and Reviews So Important?
Ratings and reviews are the primary public indicators of an app's health and significantly impact conversion rates. Apps below 4.0 stars rarely get installed; apps below 4.5 are at a structural disadvantage versus higher-rated competitors. The book describes a **4.5+ sweetspot** with high volume — that's the corner you want to occupy.

Ratings convey a quick, quantitative measure of quality; reviews offer a substantive, qualitative measure. Both matter, but the rating average is the single largest data point affecting download conversion rate.

*   **New Apps:** Need ratings for social credibility and validation. Furthermore, keywords contained in positive reviews are indexed (Google Play directly; App Store potentially), broadening discoverability.
*   **Established Apps:** Need to maintain strong ratings to outshine competitors. The ASO Stack community observation: 100 high ratings have a larger impact on your app metrics than a single review.

## Creating a Review Strategy

### Passive vs. Active Prompts
*   **Passive Prompts:** A simple "Rate the app" button located in the app's settings. Less intrusive but yields fewer ratings.
*   **Active Prompts:** System-provided or custom pop-ups that interrupt the user flow to request a rating. Highly effective but must be timed correctly.

### Choosing the Right Trigger
Triggers dictate *when* to show the prompt.
1.  **Simple Usage Triggers:** Fired after specific actions (e.g., 10 app launches, 3 total hours of usage). 
2.  **User Journey Triggers:** Fired at the user's "aha moment" when they are happiest (e.g., after beating a difficult level, or scoring a rare reservation). This is the most impactful strategy.
3.  **Anti-Triggers:** Avoid prompting after crashes, during the first 1-7 days of use, or if the user recently dismissed the prompt.
*   **Trigger Quotas:** Apple limits the native system prompt to 3 times per 365 days. Google limits it to roughly once a month. A good rule of thumb is to prompt users at most once every four months.
*   **Server-Side Triggers:** By storing trigger logic on the server (using tools like Firebase Remote Config), you can A/B test and adjust thresholds without requiring users to download a new app update.

### Designing Your Prompt
*   **System vs. Custom Prompt:** The system prompt is seamless (users rate without leaving the app) but cannot be visually customized. Custom prompts allow for brand alignment and tailored messaging but require the user to leave the app to rate it on the store.
*   **Gating:** "Gating" involves asking a sentiment question first ("Do you like this app?"). Only users who say "Yes" are shown the rating prompt, while "No" users are directed to a private support channel. Though Apple and Google somewhat discourage gating native system prompts, it remains a common and effective practice.
*   **Voice and Experience:** Address users politely, mention the specific action that triggered the prompt (e.g., "Great score!"), and keep the flow to a minimum number of steps.

## Replying to Reviews
A single 1-star review requires seven 5-star reviews to recover to a 4.5-star average, so mitigating negative reviews is critical.
*   **Best Practices:** Apologize for inconvenience, be personable (use names), address specific concerns (mention if a fix is coming), and provide a support email.
*   **Prioritize:** Answer the most featured or upvoted reviews first, as they appear on the front page of your app listing.
*   **Avoid:** Do not use generic copy-paste templates for every reply.

## Measuring Rating and Review Impact
Track the volume and distribution of your ratings using App Store Connect, Google Play Console, and ASO tools. Monitor user journeys (e.g., screens seen before the prompt) to attribute increases in ratings directly to optimizations in your trigger flows.
