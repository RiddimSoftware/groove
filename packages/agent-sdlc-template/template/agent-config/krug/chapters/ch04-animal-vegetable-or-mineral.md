# Chapter 4: Animal, Vegetable, or Mineral?

*Why users like mindless choices.*

## Krug's Second Law of Usability

> "It doesn't matter how many times I have to click, as long as each click is a mindless, unambiguous choice."

Web teams spend a lot of time debating how many clicks are too many. Some teams even have rules ("never more than three clicks to any page"). It's the wrong metric.

What matters is not the *number* of clicks but how *hard* each one is — the cognitive load and the uncertainty about whether the user is making the right choice.

Krug's rule of thumb:

> **Three mindless, unambiguous clicks ≈ one click that requires thought.**

## The "scent of information"

A term from Peter Pirolli and Stuart Card's information-foraging research at Xerox PARC. Users follow links the way animals follow scent: clear, unambiguously labelled links give off a strong scent that the prey lies behind them. Ambiguous or poorly worded links give off a weak scent, and users hesitate or wander.

So: many clicks following a strong scent feels easy. Few clicks across ambiguous choices feels hard.

### Exceptions

There are limits. If users will drill the same path repeatedly, or the pages load slowly, the value of fewer clicks rises.

## What "mindless" means

The classic Twenty Questions opener — "Animal, vegetable, or mineral?" — is the gold standard of mindless choice: as long as you accept that anything not animal or vegetable is mineral, *everything* falls into one of those buckets without much thought.

Many Web choices fail this bar. Examples:

- **A printer-manufacturer site asking up front: Home / Office.** Which one *am* I? Even after I choose, I'm still uncertain. (Like the choice between two mail-boxes labelled "Stamped" and "Metered" with a business-reply card in hand — what do *they* consider it, and what happens if I drop it in the wrong box?)
- **A magazine article gate with three columns: "Subscriber but not online member" / "Online member" / "Not a member."** Heavy reading just to figure out what I am, before I can decide whether the article is worth the cost.

When users can't easily answer the question being asked, they often re-route to *a different question*: "Is this even worth it to me anymore?" That's how you lose them.

## Good ways to handle unavoidable choices

Sometimes life forces hard choices. *The New York Times* paywall handles it well: a top-level decision (login? subscribe?) leads to a separate screen with only the relevant questions. The user isn't confronted with all the details at once.

For forms, Caroline Jarrett's *Forms that Work: Designing Web Forms for Usability* is the recommended reference, especially the "Making Questions Easy to Answer" chapter.

## When guidance is needed, make it brief, timely, and unavoidable

When a difficult choice can't be removed, provide the right amount of help — but no more.

Three traits of good in-context guidance:

- **Brief.** The smallest amount of information that does the job.
- **Timely.** Placed where the user encounters it exactly when needed.
- **Unavoidable.** Formatted so the user can't miss it.

Examples: a tip next to a form field, a "What's this?" link, even a tool tip.

Krug's favourite example isn't on the Web at all — it's the **"LOOK RIGHT"** street paint on London street corners. *Brief* (two words, an arrow), *timely* (you see it as you step off the curb), and *unavoidable* (you almost always glance down at the curb). Likely lifesaver for tourists who instinctively look the wrong way.

## The bottom line

Choices are everywhere on the Web. Making them mindless is one of the most important things you can do to make a site easy to use.
