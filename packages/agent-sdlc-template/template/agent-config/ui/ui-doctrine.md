# UI Doctrine

The surface-agnostic principle behind every Riddim Software UI standard. Read this before any surface-specific file (`cli-standards.md`, future `web-standards.md`, etc.).

## What counts as a UI

A **user interface** is any surface that lets a human (or agent) issue an intent and observe what the system did with it. Pixels are optional. A CLI is a UI. A script that prints "done" to stderr is a UI. A webhook reply that the developer sees in a log tail is a UI. An error message in a CI log is a UI. So is a screen, a voice prompt, an email, or an HTTP response body a developer will read while debugging.

If a human or agent will *observe* the output of something we wrote, that something has a UI, and this doctrine applies.

## The three laws

Three principles, transplanted from Krug to the full set of surfaces we ship. They are tie-breakers, not commandments — when two designs both seem defensible, these decide.

### 1. The reservoir of goodwill applies to every surface

Users — including paying customers, internal teammates, and our own future selves — arrive at a surface with a finite reservoir of goodwill. Friction drains it. Thoughtfulness refills it. When it hits zero they leave, write a one-star review, abandon the script, or stop trusting the tool.

Things that drain the reservoir on *any* surface:

- Silence after they took an action ("did the command even start?").
- Hiding what they came for (a price, an error, a result, a next step).
- Asking for input you don't need.
- Boilerplate that signals "no one cared."
- Fake reassurance ("Your call is important to us"; a spinner that doesn't track real work).
- Punishing them for not formatting input your way.

Things that refill it:

- Acknowledging the action immediately.
- Telling them up front what's about to happen and roughly how long it takes.
- Saving steps wherever possible.
- Candid, specific error messages with a next step.
- Apologising when you genuinely can't do what they wanted.

### 2. Don't make me think — generalised

Krug's first law was written for web pages, but it transplants directly: every surface should be **self-evident**. If it can't be self-evident, it must be **self-explanatory**. The designer's job is to remove question marks from over the user's head.

For non-visual surfaces, "self-evident" rephrases as:

- For a CLI: the user should never wonder *is this thing still running? what is it doing? when will it finish? did it succeed?*
- For an error: the user should never wonder *what just went wrong? what do I do about it?*
- For an API response or log line: the consumer should never wonder *which call produced this? which run? which version?*

### 3. Word economy applies everywhere

Krug: "get rid of half the words, then half again." The rule survives the jump to non-visual surfaces.

- A help text full of "happy talk" buries the flag the user needed.
- A log file that prints every framework heartbeat hides the one line that matters.
- An error trace that wraps a one-sentence cause in 40 stack frames pushes the cause off-screen.
- A README that opens with a mission statement makes the user scroll past it to find the install instructions.

Word economy is not minimalism for its own sake. It is the discipline of making the signal stand out. Noise *is* friction.

## Internal tools are products too

A common failure mode is to apply usability standards to "the product the customer pays for" and exempt scripts, internal CLIs, dev tooling, CI output, and admin surfaces. This doctrine rejects that split.

From Cagan (`inspired/inspired-doctrine.md`), the **usable** leg of valuable / usable / feasible is non-negotiable. From Krug (`krug/usability-scorecard.md`), the goodwill reservoir is paid out of by everyone who touches the surface. A developer running a release script, a teammate debugging CI, and a customer pressing a button in a mobile app are all *users*. They all have reservoirs. The reservoirs are filled and drained by the same things.

Internal tools tend to be the *worst* offenders precisely because the people who built them have already absorbed the muddle. Hold internal surfaces to the same bar as external ones.

## How to apply this doctrine

When designing or reviewing any user-facing surface, ask in order:

1. **Self-evidence.** Can a stranger answer "what is this / how do I use it / what's it doing right now" without thinking? If not, is it at least self-explanatory in the moment it appears?
2. **Goodwill.** Is this experience refilling or draining the user's reservoir? What's the most reservoir-draining moment in this flow, and can it be fixed?
3. **Word economy.** Have we cut half the words? Then half again? Does the signal stand out from the noise?
4. **Closure.** Does every action the user takes end with an unambiguous outcome they can read in one glance?
5. **Errors as a refill.** When something fails, do we tell the user what went wrong, what to try, and where to look — or just dump a stack trace?
6. **Equal standards for internal surfaces.** Would we ship this if a paying customer saw it?

Questions 1–6 are the spine of every surface-specific standard file in this directory. The per-surface files apply them to the constraints of a specific medium.

## What this doctrine is not

- Not a substitute for testing. "Does this CLI / script / page work for the people who will use it?" is settled by watching one user at a time, not by argument. Use the matching scorecard to structure the observation.
- Not a stance against creativity or innovation. Conventions exist because they reduce the cost of thought; deviate from them when you *know* you have a better idea, not when you're guessing. Clarity beats consistency, and clarity also beats cleverness.
- Not a checklist to satisfy. A score of 100/100 on a scorecard with three real users complaining is still a failure.
