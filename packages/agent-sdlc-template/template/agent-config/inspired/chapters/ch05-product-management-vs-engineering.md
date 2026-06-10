# Chapter 5: Product Management vs. Engineering

## Premise
The product manager is responsible for building the *right* product; engineering is responsible for building the product *right*. They are peers, not subordinates, and the quality of their relationship — especially how early engineering is pulled into discovery — is one of the biggest determinants of whether the team ships something valuable. Neglecting the engineering side of that partnership shows up later as a "we have to stop and rewrite" crisis, which is usually product management's fault, not engineering's.

## Key Principles
- The product manager and engineering lead are peers. Neither role is subordinate to the other.
- A great product comes from combining a real customer need with a solution that's just now becoming possible — and engineers know best what's possible.
- Engineers should be involved in discovery, not handed a finished spec over the wall.
- The PM's job is not to define the ultimate product; it is to define the smallest possible product that meets the goals.
- Once engineering begins building, minimize churn. The build phase is not when you try out your latest-and-greatest ideas.
- Talented engineers often make excellent product managers — they know what's possible and can tackle the bigger question of what to build.
- Infrastructure is a debt that must be paid. Neglect it and you eventually have to stop everything and rewrite, often while watching customers leave for competitors.
- Outsource for the right reason: to assemble the best team for the product, not to save money. Productivity differences in the same job class can be 20×, which dwarfs perceived cost savings.

## Practices
- **Three ways to use engineers to make the product better:**
  1. Get them in front of users and customers — invite them to prototype testing — so they see users struggle first-hand and develop better solutions.
  2. Enlist their help in exploring what's becoming technically possible and brainstorming how new technologies might solve the problem at hand.
  3. Involve engineers (or at least a lead engineer / architect) at the very start of discovery to get early relative-cost estimates and to surface better solutions before requirements harden.
- **Three ways the PM helps engineering do its job:**
  1. Keep the focus on the *minimal* product that meets the goals.
  2. Minimize churn — changes to requirements and product definition — once development is underway.
  3. When implementation questions arise (and they will, even with the best teams), get answers back as fast as humanly possible, always keeping focus on minimal product and minimum churn.
- **Reserve roughly 20% of engineering capacity off the top as "headroom"** — to spend on rewrites, re-architecture, refactoring, performance, database swaps, or anything else needed to avoid having to say "stop, we have to rewrite." If you're already in trouble, raise this to 30%+; if a team thinks they can get away with much less than 20%, be nervous.
- **For remote development teams:**
  1. Invest disproportionately in the product spec — and use a *high-fidelity prototype* as the primary communication mechanism, not written documents — because the further away the team is, the worse natural-language specs translate.
  2. Designate a single local owner of coordination with the remote team so accountability is unambiguous and resource conflicts are resolved fast.
  3. Use the full communication stack (email, IM, video, VoIP), but also insist on quarterly in-person time with the remote architects and managers; exchange programs help further.
- **If a rewrite is already unavoidable:**
  1. Build a realistic schedule, line-item by line-item; rewrite estimates from engineering tend to be wildly optimistic because few engineers have lived through a real rewrite.
  2. Break the rewrite into chunks so user-visible product work can continue in parallel — even at 25–50% of capacity — to stay relevant in the market.
  3. With the limited user-visible capacity left, pick the right features and define them carefully.

## Pitfalls
- Throwing a finished product definition over the wall to engineering, deferring the "wanted vs. possible" negotiation until there's no time left for good decisions.
- Treating engineering as subordinate, or letting engineering treat product as subordinate.
- Pounding engineering to deliver as many features as possible for years while neglecting infrastructure — eventually all software hits a ceiling. The "engineering wants to rewrite" crisis (eBay 1999, Friendster, Netscape vs. Microsoft) is usually a delayed bill from product management, not an engineering failure. Most companies never recover.
- Outsourcing purely for cost savings — especially when "cheaper" people are also less productive — and ending up with a 15-person team that ships less than five strong people would have.
- Assuming a remote team can succeed with the same lightweight specs and ad-hoc communication that work for a co-located team.

## Notable Frameworks / Definitions
- **Build the right product vs. build the product right.** The PM owns the former; engineering owns the latter.
- **Headroom (the 20% rule).** Product management takes ~20% of engineering capacity off the top and gives it to engineering to spend as engineering sees fit — rewrites, re-architecture, refactoring, system performance — to keep the product's infrastructure ahead of growth in users, transactions, and functionality. Raise to 30%+ if already in trouble.
- **The three rewrite-survival steps.** Realistic schedule with line-by-line estimates; break the rewrite into chunks while continuing user-visible work; carefully pick and define the few features your reduced capacity can still ship.
- **Outsourcing rationale.** Outsource to assemble the right people for the product, not to save money. The bar is the caliber of the team, not its location. (eBay, MySQL, and a Sweden/Silicon-Valley/Boston/India infrastructure team are Cagan's examples of distributed teams that succeeded because they were chosen for skill, not for postcode.)
