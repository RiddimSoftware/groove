# Krug Doctrine

A distillation of *Don't Make Me Think, Revisited* by Steve Krug (3rd ed., 2014). The book is a thin, opinionated guide to usability for Web sites and mobile apps. This doctrine captures its core stance.

## Definition of usability

A thing is usable if

> a person of average (or even below average) ability and experience can figure out how to use the thing to accomplish something without it being more trouble than it's worth.

Krug accepts the longer industry list — *useful, learnable, memorable, effective, efficient, desirable, delightful* — but treats *learnable + effective + efficient* as the load-bearing core. Useful is a marketing question. Desirable is a market-research question. Delight is the "extra credit" that hit apps rely on, but it never excuses a thing being unusable.

## Krug's Three Laws of Usability

1. **Don't make me think.** Every page or screen should be self-evident. If it can't be self-evident, it has to be self-explanatory. The designer's job is to eliminate question marks over the user's head.
2. **It doesn't matter how many times I have to click, as long as each click is a mindless, unambiguous choice.** Number of clicks is the wrong metric. What matters is the cognitive load and uncertainty per click. As a rule of thumb, three mindless clicks ≈ one thoughtful click.
3. **Get rid of half the words on each page, then get rid of half of what's left.** Words that no one will read still add noise, hide the useful content, and make the page feel daunting. Strunk & White's rule 17 applied ruthlessly.

These laws are tie-breakers, not commandments. When two designs both seem defensible, Krug's laws decide.

## How people really use the Web

Three "facts of life" that designers must build for, not against:

- **We don't read pages. We scan them.** Users glance, skim for words that match the task, and click the first plausible hit. They're on a mission, they don't need to read everything, and they've been scanning print their whole lives.
- **We don't make optimal choices. We satisfice.** Term coined by Herbert Simon; popularised in design by Gary Klein's *Sources of Power*. Users pick the *first reasonable* option, not the *best* option, because they're in a hurry, the penalty for guessing wrong is one Back-button click, and guessing is more fun than analysing.
- **We don't figure out how things work. We muddle through.** Most users use software, sites, and appliances with vaguely wrong mental models. They don't care how it works; they care that it works. Muddling gets the job done, but it's inefficient and error-prone — so designs that help users actually "get it" win in the long run.

The user's experience of a Web page is therefore much closer to *"billboard going by at 60 miles an hour"* than to *"great literature."* Design for the billboard.

## The reservoir of goodwill

Users arrive with a reservoir of goodwill. Friction drains it; thoughtfulness refills it. When it hits zero they leave, and they tell others.

- **Things that drain the reservoir:** hiding what the user wants (prices, phone numbers, shipping), punishing them for not formatting data your way, asking for information you don't need, faux sincerity ("Your call is important to us"), bloated marketing sizzle, amateurish presentation.
- **Things that refill it:** making the top tasks obvious and easy, telling people what they want to know up front, saving steps wherever possible, putting visible effort into help and support, candid FAQs that answer the questions people *wish* you'd asked, easy error recovery, and — when you can't give people what they want — apologising for it.

A usable site is one that behaves like a *mensch*: a stand-up entity that does the right thing by its user.

## What this doctrine is not

- It is not a list of hard-and-fast rules. The honest answer to most usability questions is "It depends." Krug's laws are the few principles worth keeping in mind always.
- It is not a substitute for testing. Religious debates ("Does anyone like pull-downs?") are unwinnable because there is no Average User. The only useful question is "Does *this* element, *this* wording, on *this* page, work for the people who'll use *this* site?" — and that question is settled by watching one user at a time.
- It is not a stance against creativity. Innovate when you *know* you have a better idea; lean on conventions when you don't. "Clarity trumps consistency" — and clarity also trumps cleverness.

## How to apply this doctrine

When you're designing or reviewing a screen, ask, in order:

1. Is this self-evident? If not, is it at least self-explanatory?
2. Is every choice on this screen mindless and unambiguous? Where it can't be, is the guidance brief, timely, and unavoidable?
3. Can I cut half the words without losing meaning? Then half again?
4. Does this design work *with* scanning, satisficing, and muddling — or does it assume an attentive, optimising, comprehending user?
5. Is the reservoir of goodwill being refilled or drained by this experience?
6. Have actual people tried to use this? If not, the answers above are still guesses.

These questions are the spine of every chapter of the book; the chapter files in `chapters/` apply them to specific surfaces (home page, navigation, forms, mobile, accessibility).
