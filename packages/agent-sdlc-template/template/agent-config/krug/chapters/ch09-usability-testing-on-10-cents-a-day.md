# Chapter 9: Usability Testing on 10 Cents a Day

*Keeping testing simple — so you do enough of it.*

> Why didn't we do this sooner? — what everyone says at some point during the first usability test of their Web site.

## How testing usually happens (badly)

Krug used to get a lot of last-minute calls: "We're launching in two weeks and want to do some usability testing." Two interpretations:

- **Two weeks** → disaster check before launch.
- **Two months** → settle an internal debate, usually about aesthetics.

What the test usually reveals: the things being argued about don't matter much — the bigger problem is that no one understands the value proposition of the site, or some other deeper issue.

The fundamental problem: testing as a one-off at the end is the wrong model.

## Focus groups are not usability tests

- **Focus group:** 5-10 people sit around and *talk about* a product, opinions, past experiences, reactions to ideas. Good for sampling what users think — in the abstract.
- **Usability test:** one person at a time *tries to use* the thing — Web site, prototype, sketch — to do typical tasks. Good for detecting and fixing things that confuse or frustrate them.

Focus groups belong in the planning stages, *before* you build. Usability tests belong throughout the entire process.

## Several true things about usability testing

- **If you want a great site, you've got to test.** Once you've worked on a site for weeks, you can't see it freshly any more. Watching others use it is the only fix.
- **Testing one user is 100% better than testing none.** Even bad tests show you important things.
- **Testing one user early is better than testing 50 near the end.** Early changes are cheap; late changes are expensive and resisted.

## DIY usability testing — Krug's recipe

The book covers the same ground in more depth in *Rocket Surgery Made Easy*. The core comparison:

| | Traditional Testing | DIY Testing |
| :--- | :--- | :--- |
| Time per round | 1-2 days of tests, then a written brief; then a process to decide what to fix | One morning a month: tests, debrief over lunch, decide what to fix by early afternoon |
| When | Near completion | Continually, throughout development |
| Rounds | 1-2 per project | One per month |
| Participants per round | 8+ | 3 |
| Recruiting | Carefully to match target audience | Loosely; doing testing often matters more than testing "actual" users |
| Where | Off-site lab with one-way mirror | On-site, conference room, screen sharing to observers |
| Who watches | Few people | More people (live, on-site) |
| Reporting | 25-50-page "Big Honkin' Report" | 1-2-page email summary of debrief decisions |
| Who decides fixes | The person running the test | The whole team, over debrief lunch the same day |
| Primary purpose | Identify all problems, prioritise by severity | Identify the most serious problems and commit to fixing them by next round |
| Out-of-pocket cost | $5,000-$10,000 per round | A few hundred dollars or less |

### How often?

One morning a month. Three users, lunch debrief. Done.

Why a morning a month?

- **Simple enough that you'll keep doing it.**
- **Yields enough.** Three users will surface enough serious problems to keep you busy for the month.
- **No "when to test" decision** — pick a day of the month (third Thursday) and that's testing day. Schedules slip; testing days shouldn't slip with them.
- **More attendable.** Predictable schedule encourages observers to come.

### Why only three users?

- The point isn't to *prove* anything. Proving requires quantitative testing, large samples, rigorous protocols. DIY tests are **qualitative**: identify, fix, iterate.
- You'll never find all problems anyway. Doesn't matter.
- **You'll find more problems in half a day than you can fix in a month.** Severity, not count, is the bottleneck.

### Recruiting

> Recruit loosely and grade on a curve.

Find people roughly like your audience; allow for differences in their reactions ("Would our users have that problem, or only because they don't know what our users know?"). Always include some people *outside* the target audience because:

- Don't design so only your target audience can use it.
- We're all beginners under the skin.
- Experts are rarely insulted by clarity that's good enough for beginners.

Find participants via user groups, trade shows, Craigslist, customer forums, on-site pop-ups, or asking friends/neighbours. Nielsen Norman Group's free *How to Recruit Participants for Usability Studies* is a good source. Incentive: $50-$100 per hour for average users, up to several hundred for hard-to-recruit professionals. Pay slightly above going rate.

### Where, who, what

- **Space:** quiet room with desk, computer, two chairs.
- **Observation room:** another room, computer with screen-sharing, projector or speakers.
- **Facilitator:** anyone patient, calm, empathetic, a good listener. Read from a script — wording matters.
- **Observers:** as many as possible. Real benefit of testing is on the observers. Feed them well.
- **Form for observers:** write down the top three usability problems each session. Forces prioritisation.

### When and what to test

Test from before there's a design (test competitor sites). Test sketches, wireframes, comps, prototypes, live pages. Throughout.

Make a list of tasks users need to be able to do. Word each task so participants understand what to do. Where possible, let participants choose part of the task ("Find a book *you* want to buy" beats "Find a cookbook under $14").

Aim for ~35 minutes of tasks in a one-hour test.

### Session structure (≈60 min)

- **Welcome (4 min):** explain how the test will go. Emphasise: testing the site, not the person.
- **Background questions (2 min):** put them at ease; sense their Web-savvy.
- **Home-page tour (3 min):** open site, ask them to look without clicking and narrate.
- **Tasks (35 min):** the heart. Don't lead. Prompt with "What are you thinking?", "What would you do if I weren't here?"
- **Probing (5 min):** questions about what happened; questions from observers.
- **Wrap up (5 min):** thank, pay, walk out.

## Typical problems

- **Users are unclear on the concept.** They don't get what the site is for.
- **The words they're looking for aren't there.** Vocabulary mismatch.
- **There's too much going on.** They aren't seeing what's in front of them because of noise or weak hierarchy.

## The debriefing: deciding what to fix

Over lunch right after the tests. The point is to commit to fixes.

> Focus ruthlessly on fixing the most serious problems first.

### The method

- **Make a collective list.** Each observer names the three most serious problems. Mark repeats with checkmarks.
- **Pick the ten most serious** — usually those with most checkmarks.
- **Rate them 1-10**, worst at the top.
- **Create an ordered list.** For each, rough idea of how to fix it, who, by when, what resources.

Stop when you've allocated the available time/resources for the month.

### Fix discipline

- **Keep a separate list of low-hanging fruit** — fixable in under an hour without permission.
- **Resist the impulse to add.** When users miss something, the instinct is to add an explanation; the right move is usually to remove what's obscuring it.
- **Take new-feature requests with a grain of salt.** Participants aren't designers. The request usually evaporates as they describe it.
- **Ignore "kayak" problems.** A temporary wobble where the user recovers without help and without losing confidence. No harm, no foul. If second guesses are always right, that's good enough.

## Alternative formats

- **Remote testing.** Participants test from their own computer via screen sharing. Pool: "almost anyone."
- **Unmoderated remote testing** (e.g. UserTesting.com). Send tasks + link; receive a video. No real-time interaction, but very cheap and low-effort.

## Top five objections to testing

- **"We don't have the time."** Done right, testing *saves* time by ending arguments and avoiding rework.
- **"We don't have the money."** A few hundred dollars per round. Less with volunteers.
- **"We don't have the expertise."** Almost no test fails to produce useful results.
- **"We don't have a usability lab."** A room with two chairs and a computer is enough.
- **"We wouldn't know how to interpret the results."** The most serious problems are hard to miss — everyone watching tends to see them.

Try it. You'll want to keep doing it.
