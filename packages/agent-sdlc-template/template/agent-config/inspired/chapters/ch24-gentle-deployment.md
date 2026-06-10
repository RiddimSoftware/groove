# Chapter 24: Gentle Deployment

## Premise
"User abuse" is what happens when you mistreat your users — unintentionally — by releasing changes the way *you* want to release them rather than the way *they* can absorb. Users don't actually like change, even when they clamor for new functionality, and the modern internet amplifies the cost of a bad release. The solution is not to stop changing the product; it is to deploy change intelligently and carefully — "gentle deployment."

## Key Principles
- Users generally don't like change. They want the software to be great and they ask for new functionality, but most people aren't excited about taking the time to learn a new way to do something they can already do.
- We are nonetheless in the business of change — needs, technologies, and markets change, and our software must change with them. The solution is to be smart about *how* we deploy that change, not to stop deploying it.
- For 1.0 products, you get to start fresh; backwards-compatibility and retraining aren't issues yet. Most teams, though, are shipping updates to an existing community — gentle deployment is for those.
- The internet has changed the cost calculus: bad updates that aren't corrected quickly draw serious community backlash, amplified by user reviews and word of mouth. Large-scale consumer Internet services must consider community impact in everything they do.
- Goodwill is a reserve, not an entitlement. Save it for when you really need it — don't burn it through user abuse.

## Practices
- **Communicate in advance** via newsletters, on-site education, and tutorials. Recognize this can only take you so far — many people won't read what you write.
- **Redouble QA** when there's any reliability, scale, or performance risk in the new version. Rolling back compounds community angst.
- **Use gentle deployment when the change is significant.** Three approaches:
  - **Parallel deployment.** Run the new version next to the old. Let users opt in; let them set the new version as default if they like it. Once most have converted, flip the default and allow opt-out for users who still need the old version. Give clear notice when support for the old version ends. Expect this to take *months* for a significant service with a large community, and expect heat from engineering and site ops because parallel versions are expensive to support.
  - **Regional/incremental rollout.** Deploy the new version first to a limited area of the country or world, then expand.
  - **Bite-size increments.** Introduce changes in pieces over time rather than as one disruptive event.
- Sensitivity to disruption is the through-line. Give people the opportunity to learn the differences when they have the time; minimize the impact of any problems your changes cause.

## Pitfalls
- Surprise releases — no notice, no education, dropped on users who weren't in the mood for a surprise.
- No way to keep using the old version while users find time to learn the new one.
- Shipping a release that doesn't actually work, or that's incompatible with older versions (e.g., for data access).
- Change perceived as gratuitous.
- Change fatigue — too many updates in too short a window.
- Forcing changes through where users have built their own layer of process or behavior on top of the previous version, breaking their workflow and forcing them to rebuild it.
- Relying solely on advance communication ("we told them in the newsletter") when most users don't read newsletters.
- Underestimating that "gentle" really does take months for big services.

## Notable Frameworks / Definitions
- **User abuse.** Releasing changes to the user community that they don't appreciate — usually because the change was sprung on them, broke compatibility, was unreliable, was perceived as gratuitous, or piled onto change fatigue.
- **Gentle deployment.** The discipline of deploying updates intelligently and carefully to a large community: communicate in advance, raise the QA bar, and — for significant changes — use parallel, regional, or incremental rollouts so users can absorb change on their own schedule.
