# Chapter 22: Prototype Testing

## Premise
Putting a high-fidelity prototype in front of real users is the single most important activity in the product manager's job. The primary purpose isn't to communicate the spec to engineering — it's to gain deep understanding of the product and gather evidence that the idea will actually work *before* engineering spends months building something that won't. This testing is far cheaper and easier than most teams assume, and the product manager can run it themselves.

## Key Principles
- Testing prototypes with real users is, arguably, the single most important part of the PM's job. If a usability lab is available, use it; if outside firms ($10–20k per round of ~10 users) are unaffordable, do it yourself.
- The PM must attend every test in person. Real value comes from first-hand observation of as many users as possible. A proctor's summary will miss the slight hesitations, confused looks, and question nuances that contain the real signal.
- Good PMs and designers get past the fear of being too "close to the product" to test objectively. They expect to get it wrong initially and treat testing as the fastest path to an inspiring product.
- Watch what users *do* more than what they *say*. If users knew what they wanted, software would be a lot easier to create. Keep them in "use mode," not "critique mode."
- Body language and tone are often louder than words. When users like it, they'll ask to be notified at launch — or try to get early access.
- You don't have to freeze a prototype for a full round of 6–8 users before fixing things. Fix issues as soon as you've identified them, even after two or three users.
- You're done with a round when ~6 consecutive users understand the value, get through the key tasks, and appreciate the product.
- Deciding to shelve a product idea after testing is not failure — it's saving the cost of building and shipping a loser, and the opportunity cost of what engineering could have built instead.

## Practices
- **Finding test subjects:**
  - Charter user programs (if established).
  - Trade shows for business products.
  - Craigslist — keep the participant description a notch general; screen on the phone.
  - "Friends and family" for consumer products, avoiding people too close or in the tech industry; supplement with outside subjects.
  - User email lists narrowed with marketing's help.
  - Website volunteer signups — call and screen to avoid early-adopter skew.
  - For medium-to-larger companies, set up standing test sessions (e.g., every other Friday) with 10–20 users; PMs sign up for time slots.
  - Take the show to where users are: shopping malls for e-commerce, sports bars for sports products, customer offices for enterprise.
  - Compensate when warranted: $50 site credit, or a sincere thank-you and branded swag for consumer products.
  - Expect a high no-show rate (up to 30%). A personal phone call the day before drops it to 5–10%; email doesn't work as well.
- **Preparing the test:**
  - Define the usability tasks in advance. Focus on the primary tasks users will do most of the time; get to less common tasks only if there's time.
  - Use the one-time-only opportunity of a first-time visitor wisely. Before opening your prototype, see how the user thinks about this problem *today* — what sites do they use, how do they search? Then show your landing page and ask what they think you do and what might be valuable. Once they're inside your prototype, that first-time-visitor context is gone.
  - After they've tried the tasks, have a conversation — a one-person focus group. Ask what they use today, how much better this is, and the Net Promoter Score question: *How likely would you be to recommend this product to your friends?*
  - Structure questions on a numeric scale (e.g., 0–10) so you can track averages over iterations. One technique for gauging value: ask how much they'd be willing to pay, even if you have no intention of charging.
  - You don't need a complete prototype to start testing. If a user wanders into a dead end, ask: "And what would you expect to happen if you did that?"
- **The test environment:**
  - Formal labs (two-way mirrors, cameras) are nice but unnecessary. Cagan has run plenty of valuable tests at a Starbucks table for a laptop and three chairs; users often feel less like lab rats and are more candid.
  - Customer offices are excellent — users are "master of their domain" and more talkative, and you observe their real context (monitor size, network speed, how they communicate with colleagues).
  - Remote testing tools exist but don't substitute for face-to-face: you miss eyes and body language.
  - The PM administers (or, if a user researcher is present, takes notes while they administer). Ideally have one administrator and one note-taker. The note-taker is often the interaction designer; visual designers, managers, and especially engineers all benefit from attending.
- **Conducting the test:**
  - Greet warmly, offer water/coffee, and get to the prototype fast. If five minutes pass without them starting, you're talking too much.
  - Tell the user three things: (1) this is just a prototype/very early idea, not real; (2) they won't hurt your feelings — be honest, good or bad; (3) you're testing the prototype, not them — only the prototype can pass or fail.
  - Learn to keep quiet. Suppress the urge to help. Turn into a horrible conversationalist and get comfortable with silence.
  - **Act like a parrot.** Reflect what they're doing ("I see you're looking at the list on the right") to draw out their thinking without leading. Reflect questions back ("Will clicking on this make a new entry?") so they answer. Reflect actions neutrally ("You created a new entry") instead of "Great!" — parroting also gives the note-taker time to keep up.
  - Avoid asking critique questions like "What three things on the page would you change?" — unless the user is an interaction designer, the answer doesn't matter.
  - Note three outcomes per task: (1) got through cleanly with no help, (2) struggled and moaned but eventually got through, (3) frustrated enough that they would have left for a competitor.
  - You're hunting for places where the model the software presents is inconsistent with how the user thinks about the problem — that's what counter-intuitive really means. When spotted, it's usually not hard to fix and is a big win.

## Pitfalls
- Delegating attendance to a proctor and reading a summary.
- "Leading the witness" with hints, praise, or value-laden language.
- Running a forced narration that pushes the user into critique mode.
- Treating the round as gospel: refusing to fix obvious problems until 6–8 users have been hit by them.
- Treating "we shelved it after testing" as failure rather than a major win.

## Notable Frameworks / Definitions
- **The four-stage prototype-test protocol.** Finding test subjects → Preparing the test → The test environment → Testing your prototype, followed by **updating the prototype** between sessions.
- **The three outcomes per task.** (1) Got through with no problem and no help. (2) Struggled but got through. (3) Frustrated and (effectively) gave up.
- **"Use mode" vs "critique mode."** Keep subjects doing the tasks they came to do; do not push them into critiquing the page.
- **Parroting.** A non-leading testing voice: reflect actions, questions, and key points back instead of helping, judging, or interpreting.
- **Net Promoter Score (NPS) as the value-gauge question.** "How likely would you be to recommend this product to your friends?" — asked after the user has worked with the prototype.
- **Listening Labs (Creative Good).** A form of undirected, big-picture testing that surfaces issues task-based testing misses; several of the techniques in this chapter are adapted from this methodology. Cagan also recommends Steve Krug's *Don't Make Me Think* for the informal-testing case.
