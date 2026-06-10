# Chapter 20: Minimal Product

## Premise
The familiar movie — P1/P2/P3 priority lists, engineering estimates that come in months over budget, frantic feature-cutting until something incoherent ships — is the natural consequence of a broken process. The right move is to identify the *minimal* product up front, collaboratively with engineering, and validate it with users *before* committing engineering capacity. After that point, the response to schedule pressure is to slip dates, not cut features.

## Key Principles
- The product manager's job, with the designer, is to come up with a high-fidelity prototype that has the *minimal* functionality necessary to meet the business objective — yet a UX that users can figure out and actually want to use. Minimal functionality minimizes implementation time and user complexity.
- An engineer (architect or lead) must participate from the very start of the design process, helping the team understand the relative and absolute costs of product ideas, flagging dangerous directions, and investigating uncertainty.
- By the time the prototype is ready, engineering must have provided detailed estimates of the surviving features — estimates they can commit to.
- The prototype must be validated with real target users before the full product team is committed. Believing the definition is good is not enough; you must test, just as you would not ship code an engineer merely *believed* worked.
- Once you have found and validated the minimal product, you can't later cut more features and assume it will still work. If you could, you hadn't found the minimum.
- Once engineering is underway, the product manager can't keep tossing in new requirements. Most spec churn comes from not really thinking through the requirements in the first place — the high-fidelity prototype forces those questions to the surface earlier.
- Slips, when they do occur in this model, are neither as severe nor as frequent as we are used to — because cutting already happened, estimates are stronger, and there is less product to build.

## Practices
- Build the minimum into the prototype, not into a priority annotation. By the time the spec ships to engineering, strip out the P1/P2/P3 labels and make clear the spec describes the *entire* product.
- Make the trade-offs about what's in and what's cut collaboratively, while the prototype is being built — not after the spec hits engineering.
- Treat estimates produced against a high-fidelity prototype as better than the norm: engineering had more time to evaluate, feels more ownership, and there is less product to estimate.
- When something does take longer than expected, slip the schedule rather than cut a feature. The cutting was already done.
- Have the engineer who's been with the prototype since the start own the estimate — they have more context, more time to evaluate, and more ownership of the number than someone estimating cold off a Word doc.

## Pitfalls
- The P1/P2/P3 game: pack the spec, watch engineering estimate over budget, then negotiate by cutting features, minimizing QA and beta, and hiring contractors against a ticking clock. What ships is far from a coherent whole, and nobody is happy with it.
- Treating Agile/Scrum as a substitute for finding the minimal product. Cagan notes these methods don't really address this problem and introduce some of their own (see the Agile chapter).
- Believing you can keep adding requirements after engineering starts. Each addition is usually evidence the requirements weren't thought through.
- Cutting a feature from a validated minimal product and assuming it will still work. As Cagan's old boss put it, "if you remove a leg, that dog won't hunt."

## Notable Frameworks / Definitions
- **Minimal product.** The smallest feature set that (a) meets the business objective and (b) presents a UX users can figure out and want to use. Identified collaboratively up front via prototype + early engineering involvement + user validation.
- **Cuts come first, then commitments.** Trade-offs happen during prototype design with engineering in the room. After the spec is final, the response to overruns is date slip, not feature cut.
