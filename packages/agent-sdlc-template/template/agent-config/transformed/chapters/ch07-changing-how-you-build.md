# Chapter 7 — Changing How You Build

The first of three transformation dimensions.

## From Projects to Products

In most prior models, every technology effort is treated as a **project**. Funded, staffed, planned, executed, delivered. People then roll off.

> "Realize that everything we build has two outputs that could create value: what we make and what we learn. In the project model, we lose most of what we learn."

When the same area needs work again, the company relearns at cost. Teams that don't have to live in the code they build treat it differently — *this is why technical debt is so rampant in the project model.*

> "It's similar to the difference between remodeling a house to sell it versus to live in it."

This is also how outsourcing is done. *"If this is how you want to work, then you may as well hire Accenture, because that company is better at working this way than you are ever likely to be."*

## In the Product Model

Products are managed as **ongoing efforts** — improving every week (in strong product companies, many times a day) for several years. The team continues investing until the company decides to stop investing or sunset the product.

## Small, Frequent, Reliable Releases

> "If each of your product teams is not releasing at least once every two weeks, then you will not be able to take care of your customers as you need to."

- Small releases are **safer**, not riskier — easier to ensure changes are working and don't cause regressions.
- Big-bang releases concentrate risk.

Every release must be:
- **Instrumented** — so you know how customers are using it
- **Monitored** — so you detect problems before customers do
- **Provable** — A/B tests prove value before broad deployment

## A Note About Agile

Many companies adopted Agile expecting this outcome — and failed. *Fake Agile* (especially SAFe, but also Scrum with monthly/quarterly releases) lets companies fool themselves into thinking they've improved.

> "If your company is still releasing yearly, quarterly, or even monthly, it doesn't matter how many Agile rituals you follow or how many so-called Agile coaches you may employ. The truth is that you are not Agile (or even lowercase agile) in any meaningful sense, you are not getting the benefits, and you will not be able to serve your customers or your business as you need to."

You don't *need* Agile to release frequently. Many of the best product companies practice CI/CD without any formal Agile process. Conversely, organizations that invest enormously in Agile coaches, rituals, roles, and methods but still release quarterly are stuck.

Whatever flag you fly, you need each product team to deliver **frequent, small, reliable releases no less than once every two weeks**. If your current people can't do that, bring in experienced engineering leaders, engineers, or a product delivery coach to show them how.

## Source

For the data behind small frequent releases: *Accelerate: The Science of Lean Software and DevOps* by Forsgren, Humble, Kim (IT Revolution Press, 2018).

## Related

- [Product Model Concepts](../product-model-concepts.md) — see Concept 4: Product Delivery
- [Chapter 8 — Changing How You Solve Problems](ch08-changing-how-you-solve-problems.md)
- [Chapter 18 — Product Delivery](ch18-product-delivery.md)
