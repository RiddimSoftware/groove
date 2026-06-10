# Usability Testing Doctrine

A distillation of Krug's stance on usability testing (chapters 8, 9, and 13 of *Don't Make Me Think*). The short version: test early, test cheaply, test often — and use what you learn instead of arguing about it.

## Why test at all

- **Religious debates are unwinnable without it.** Web teams burn time on "Do people like pull-downs / carousels / mega menus?" These are unanswerable in the abstract because **there is no Average User**. The only useful question is whether *this* control, with *this* wording, on *this* page, works for the people who'll use *this* site. Testing answers that.
- **You've lost the ability to see your own work freshly.** Once you've worked on a site for a few weeks you know too much. Watching strangers use it is the only way to recover that perspective.
- **Designers/developers are not their users.** Designers love elegance, developers love complexity, marketers love hype. None of those instincts predicts what an actual user will struggle with.

## Focus groups are not usability tests

- **Focus group:** several people sit around a table and *talk about* a product, their feelings, their preferences. Useful *before* you build anything to validate the proposition.
- **Usability test:** one person at a time *tries to use* the thing while you watch. Useful throughout the entire build, especially as soon as there's anything resembling a UI — sketches count.

Don't accept a focus group as a substitute for testing the actual artefact.

## Core maxims

- **If you want a great site, you've got to test.**
- **Testing one user is 100% better than testing none.** Even the worst test produces actionable findings.
- **Testing one user early beats testing 50 near the end.** Changes get cheaper the earlier they happen.
- **You can find more problems in half a day than you can fix in a month.** Focus is your scarce resource, not problems.
- **Focus ruthlessly on fixing the most serious problems first.** Severity beats count.

## DIY testing — the format Krug recommends

- **Cadence:** one morning per month. Test in the morning, debrief over lunch, decide what to fix.
- **Participants per round:** three. Three users hit most of the serious problems related to your tasks. Doing more rounds beats wringing more out of each round.
- **Recruiting:** **Recruit loosely and grade on a curve.** Pick people roughly like your audience, but don't gate testing on perfect recruits. Always include some participants from *outside* your target audience — domain knowledge is a tricky filter, and clarity that works for novices doesn't insult experts.
- **Incentive:** roughly $50-$100 per hour, more for hard-to-recruit professionals; pay slightly above going rate to lift no-show rates.
- **Location:** any quiet office or conference room. Screen-sharing software (GoToMeeting, WebEx, etc.) lets the team observe from another room. Screen-recording software (Camtasia, etc.) captures the session.
- **Facilitator:** anyone calm, patient, empathetic, and good at listening can do it. Read from a script — the wording is more important than it sounds.
- **Observers:** as many as you can get. Feed them well; good snacks beat formal reports. The transformative learning is in the room, not in the deliverable.

## What you test, and when

- Start *before* you build anything: test competitor or analogous sites with three participants. You'll learn what works and what doesn't, with no sunk cost.
- Redesign? Test the existing site first, so you know what not to break.
- Throughout: test sketches → wireframes → comps → prototypes → live pages. Whatever stage you're in, that's what you test.

## Choosing tasks

- Make a list of the things people need to be able to do with the artefact.
- Word each task carefully so participants understand exactly what you want them to try.
- Where possible, let participants pick a flavour of the task ("Find a book *you* want to buy" rather than "Find a cookbook under $14"). It increases engagement and gives more realistic exploration.
- Aim for about 35 minutes of tasks in a one-hour session.

## Session structure (≈60 minutes)

1. **Welcome (4 min)** — set expectations; emphasise that you're testing the site, not the person.
2. **Background questions (2 min)** — put them at ease; learn how Web-savvy they are.
3. **Home page tour (3 min)** — open the site; ask them to look around and narrate what they see, *without clicking*. Reveals first-impression and big-picture clarity.
4. **Tasks (35 min)** — let them work. Prompt only with neutral nudges ("What are you thinking?", "What would you do if I weren't here?"). Don't lead, don't help unless they're hopelessly stuck.
5. **Probing (5 min)** — questions about what happened, and questions the observers passed in.
6. **Wrap up (5 min)** — thank them, pay them, walk them out.

## Debriefing — turning observations into fixes

Right after the third session (over lunch is ideal), with everyone who watched:

- **Make a collective list.** Each observer names the three most serious problems they saw. Track repeats with checkmarks.
- **Pick the ten most serious.** Usually the ones with the most checkmarks.
- **Rate them 1-10**, worst at the top.
- **Decide a rough fix per top item.** Who, what, by when, with what resources.
- **Stop when you've spent the time/resources available for the month.** You'll always find more than you can fix.

### Fix discipline

- **Resist the impulse to *add*.** When users miss something, the first reaction is "let's add an explanation / banner / arrow." The right move is usually to remove something else that's obscuring it.
- **Take new-feature requests with a grain of salt.** Participants aren't designers. Often the request evaporates when they describe how it would work.
- **Ignore "kayak" problems.** A momentary wobble that the user recovers from without help and without losing confidence is not a problem.
- **Keep a separate "low-hanging fruit" list** for things you can fix in under an hour without anyone's permission.

## Typical problems you'll see

- **Users are unclear on the concept.** They don't get what the site is for — or they have a confidently wrong idea.
- **The words they're looking for aren't there.** Your terminology doesn't match the words a user would search/scan for.
- **There's too much going on.** Either reduce noise or pump up the visual hierarchy of the thing they need to find.

## Alternative lifestyles

- **Remote testing.** Participants do the test from their own machine via screen sharing. Expands the recruiting pool to "almost anyone."
- **Unmoderated remote testing.** Services like UserTesting.com hand off a video of someone doing your tasks while thinking aloud. No real-time interaction, but cheap, fast, low effort.

## Common objections and the standard responses

| Objection | Reality |
| :--- | :--- |
| "We don't have the time." | Done right, testing *saves* time by ending arguments and avoiding rework. |
| "We don't have the money." | A few hundred dollars per round. Less with volunteers. |
| "We don't have the expertise." | Almost no testing fails to produce useful results, however roughly it's run. |
| "We don't have a usability lab." | You need a room, a desk, two chairs, a computer, and another room with a screen. |
| "We wouldn't know how to interpret the results." | The most serious problems are hard to miss — everyone watching tends to see them. |

## Making it stick (Guide for the perplexed)

Krug's advice for getting usability funded and respected inside a sceptical org:

- **Get your boss (and her boss) to watch a session.** Live, not a recap. Even one session changes minds.
- **Do the first test on your own time.** No permission, no budget, volunteers. Then pick an easy-to-fix problem, fix it, and publicise the win.
- **Test the competition.** Easier to get buy-in for a test where the team has nothing personally on the line.
- **Empathise with management.** Not as a manipulation; as a way to understand the constraints they're working under.
- **Know your place in the grand scheme.** A little humility goes a long way. Share what you know, don't preach.

## Resist the dark forces

Usability tests reveal how to *help* users. They are sometimes asked to help *manipulate* users — make undesirable things look desirable, hide costs, trick installs, dark patterns. That work isn't part of the job. Push back. Users are counting on you.
