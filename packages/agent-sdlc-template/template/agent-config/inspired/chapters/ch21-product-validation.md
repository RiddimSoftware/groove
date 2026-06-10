# Chapter 21: Product Validation

## Premise
Before you hand engineering a final spec, you owe yourself and the team *evidence* that the spec describes a winning product — evidence the product will be feasible to build, usable by target users, and genuinely valuable to them. Validation used to be costly enough to be reserved for products like automobiles; today it is cheap enough that there is no excuse to skip it, yet most teams still rely on beta feedback as their first real test, which is far too late.

## Key Principles
- One of the biggest and most common mistakes product teams make is to have far more confidence in their specifications than they should.
- Beta is past the point of major changes; "we'll fix it when we get beta feedback" is why so many initial releases miss the mark.
- It is the product manager's responsibility to prove to themselves and to the team that the spec they hand over describes a winning product.
- The high-fidelity-vs-low-fidelity prototype debate is over: high-fidelity costs have dropped low enough, and the feedback quality is high enough, that the trade no longer favors paper.
- Once real engineering begins, a special inertia sets in — significant changes become very difficult and the cost of those changes rises dramatically.

## Practices
- Perform three forms of validation before handing engineering a final spec:
  - **Feasibility testing.** Engineers and architects investigate technologies and explore approaches. Some paths will be dead ends — find out now, not after time and money are spent. Address significant technical risk early.
  - **Usability testing.** Designers iterate on how to present the functionality so users can figure out how to use it. Plan on multiple iterations. Usability testing often surfaces missing requirements and reveals that other "requirements" are unnecessary.
  - **Value testing.** Determine whether users actually find the product valuable and want to buy/use it. Usually combined with usability testing, on the same prototype, but asking different questions: usability is *can they* do the task; value is *do they care about* the task and how well you've solved it.
- For most products — anything with complex interactions or new uses of technology — use prototypes, not paper. For some products the prototype is clickable pages; for others it may be a physical device or device + software combination. The bar is that it is realistic enough that target customers can give useful feedback.
- Acknowledge the supplementary techniques. Especially for Internet services, there are other easy and effective validation methods beyond prototypes — but prototyping remains the workhorse.

## Pitfalls
- Treating the prototype as if it could become the production product. They are different animals — Cagan likens it to a scale model of a house versus the actual home.
- Treating beta as your validation pass.
- Skipping prototyping because of historical objections — slow prototyping tools, or management that didn't understand the prototype-vs-product distinction. Modern tooling is fast and modern management generally understands the difference; both objections are no longer valid.
- Doing usability testing without value testing, or vice versa. You need both: feasible, usable, *and* valued.

## Notable Frameworks / Definitions
- **Product validation.** Verifying — without actually building and deploying the product — that the spec describes a product you have evidence will be successful.
- **Three types of validation:** Feasibility, Usability, Value. (Together these correspond to the foundational *valuable, usable, feasible* test from the book's introduction.)
- **Usability vs. value, on the same prototype.** Usability testing asks whether users can figure out how to do the necessary tasks. Value testing asks whether they care about those tasks and how well you've solved them.
