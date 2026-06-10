# Mobile, Courtesy, and Accessibility Doctrine

A distillation of chapters 10-12 of *Don't Make Me Think*. The book's core principles (self-evidence, scanning, mindless choices, word economy) apply unchanged on mobile, in copy, and for users with disabilities. This file captures what's specific to those contexts.

## Mobile is just usability, with sharper constraints (Ch 10)

> "If anything, people are moving faster and reading even less on small screens."

The basic principles don't change. What changes is the constraint envelope, and most serious mobile problems are bad tradeoffs against that envelope.

### Constraints and tradeoffs

- **Itty-bitty living space.** Screens are small; precious real estate gets *more* precious, not less.
- **Mobile First** is a useful prioritisation discipline — *what's essential?* — but a flawed feature filter. Users do everything from their phone. Don't omit features because "people wouldn't do that on mobile"; instead, prioritise so frequent/urgent things are close at hand and everything else is reachable with extra taps.
- **More taps are fine** as long as the user stays confident the next thing they want is one tap away. Confidence is what's expensive, not taps.
- **The maxim:** "Managing real-estate challenges shouldn't be done at the cost of usability."

### Responsive / scalable design

- It's a lot of work, and very hard to do well.
- If you can't go fully responsive, at minimum:
  - **Allow zooming.** Few things are more annoying than a phone-rendered page that refuses to zoom.
  - **Don't leave me standing at the front door.** Deep links from email / social must land on the linked content, not the mobile home page.
  - **Always provide a path to the full site.** Mobile/Full toggle in the footer is convention.

### Affordances on touch screens

- **No cursor = no hover = no clue.** Features that depended on hover (tooltips, dropdown previews, button-state changes) silently disappear on touch. Replace them.
- **Flat design is a tradeoff.** It removes visual decoration *and* visual information about affordances. If you adopt flat aesthetics, lean harder on remaining dimensions (position, contrast, typography) to keep buttons looking like buttons and inputs looking like inputs.
- **Don't hide affordances under a bushel.** Affordances are the meat-and-potatoes of a UI; by definition they're the last thing you should hide.

### Performance is a usability problem

- Slow ≠ frustrating-but-fine; slow = goodwill drain.
- Don't ship responsive designs that load desktop-sized payloads to phones.
- Real connections are flaky. Test under Wi-Fi *and* 4G/3G.

### Mobile-app usability attributes

Krug's working definition still leans on the core trio (learnable, effective, efficient). Three attributes get extra weight on mobile:

- **Delightful** — "the new black." Worth pursuing because the app market is crowded, but never an excuse to be unusable. Building delight usually means marrying a thing people would love to do with technology that finally makes it possible.
- **Learnable** (deeper than on the Web) — apps that pack more than a handful of features need a real onboarding (quick tour + inline practice) plus discoverable help. "One screen of hints then nothing" is not enough.
- **Memorable** — can the user remember how to use it next week? If you have to relearn from scratch every time, the app gets uninstalled. The best route to memorability is making it incredibly clear and learnable the *first* time.

### Mobile usability testing

The process is the same as desktop testing (see `usability-testing-doctrine.md`); the logistics differ:

- Decide whether participants use their own device or yours.
- Decide whether observers need to see hands/gestures or just the screen.
- Krug recommends a camera attached to the device (his "Brundlefly" rig: webcam + clamp + gooseneck) rather than mirroring, so observers see fingers as well as pixels.
- Skip the face-camera unless someone insists; it's a distraction.

## Usability as common courtesy (Ch 11)

> "Besides 'Is my site clear?' you also need to be asking, 'Does my site behave like a mensch?'"

Users arrive with a **reservoir of goodwill**. Friction empties it; thoughtfulness refills it. Properties of the reservoir:

- **Idiosyncratic.** Some users are patient, some prickly. Don't count on a large reserve.
- **Situational.** A user who's already had a bad day shows up with less.
- **Refillable.** Mistakes can be recovered from by doing things that show you're on the user's side.
- **One-shot-drainable.** Some single insults (e.g. a registration form with 30 fields) can empty it instantly.

### Things that drain the reservoir

- Hiding info the user came for: support phone numbers, shipping rates, prices.
- Punishing users for not formatting data your way (credit-card spaces, phone-number parentheses).
- Asking for information you don't need.
- Faux sincerity / shucking-and-jiving ("Your call is important to us").
- Bloated marketing sizzle when the user is in a hurry.
- Amateurish presentation that signals "no one cared."

### Things that refill it

- Knowing the top tasks users come to do, and making those easy.
- Telling users upfront what they want to know — including the awkward things (fees, outages, restrictions).
- Saving steps wherever possible (tracking-number link instead of tracking number).
- Putting visible effort into support content.
- FAQs that answer questions people *wish* you'd asked, kept current, candid even on awkward topics.
- Graceful error recovery.
- Apologising when you genuinely can't do what the user wants.

## Accessibility (Ch 12)

> "Unless you're going to make a blanket decision that people with disabilities aren't part of your audience, you really can't say your site is usable unless it's accessible."

### Two common arguments that *don't* land with most developers/designers

- "X% of the population has a disability." Sounds inflated to a 22-year-old developer, so the rest of the case gets discounted.
- "Accessibility benefits everyone." True but slim — closed captions are the only example most people can name. Sounds like the Tang argument for the space programme.

### The argument that *does* land

- **It's the right thing to do.** Blind people, with access to a computer, can read almost any newspaper or magazine on their own. That alone is a profound payoff for doing your job a little better.

### Two fears designers/developers have

- **More work** layered on already-tight schedules.
- **Compromised design** — "buttered cats," cases where the accessible thing seems to hurt the experience for everyone else.

Both fears are real but usually overstated. Most accessibility wins are not visual compromises.

### Four things you can do right now

1. **Fix the usability problems that confuse everyone.** If the page confuses sighted users, it'll be worse for users with disabilities. Confusion is the primary accessibility barrier.
2. **Read an article** to build empathy for the problem. Krug recommends Theofanos & Redish, *Guidelines for Accessible and Usable Web Sites: Observing Users Who Work with Screen Readers* — note the finding that "screen-reader users scan with their ears."
3. **Read a book.** Krug recommends *A Web for Everyone* (Horton & Quesenbery) and *Web Accessibility* (Thatcher et al.).
4. **Go for the low-hanging fruit.** The implementation work most teams can do without becoming experts:
   - Appropriate `alt` text on every image (`alt=""` on decorative).
   - Correct semantic headings (`<h1>`, `<h2>`, …) with CSS for visual styling.
   - Forms with proper `<label>` associations so screen readers announce fields.
   - "Skip to Main Content" link at the top of every page.
   - All content reachable by keyboard.
   - Significant contrast between text and background.
   - An accessible template (e.g. a WordPress theme that has been designed for accessibility).

### The bigger ask

Building accessible sites is harder than it should be. The tooling, screen readers, and design processes have to keep maturing. Until then, treat the four steps above as the floor — not the ceiling.
