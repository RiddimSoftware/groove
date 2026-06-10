# Usability Review Checklist

A quick pass before shipping any page, flow, or screen. Distilled from *Don't Make Me Think*. Use it as a self-review, a code-review-style gate, or a warm-up before a usability test.

## The trunk test (60 seconds, any page)

Imagine you've been blindfolded, locked in a trunk, and dropped onto this page. Without studying it, can you point to:

- [ ] **Site ID** — what site is this?
- [ ] **Page name** — what page am I on, and does it match what I clicked to get here?
- [ ] **Sections** — what are the major sections of this site?
- [ ] **Local navigation** — what are my options at this level?
- [ ] **"You are here" indicator** — where am I in the scheme of things?
- [ ] **Search** — how do I search?

If any of these aren't obvious at a glance with blurry vision, fix that before anything else.

## The big-picture test (home page or any landing page)

Within a few seconds, can a stranger answer:

- [ ] What is this?
- [ ] What can I do here?
- [ ] What do they have here?
- [ ] Why should I be here — and not somewhere else?
- [ ] Where do I start (search, browse, sample the best stuff, sign in / register)?

A clear tagline near the Site ID and a short Welcome blurb usually do most of the work.

## Don't-make-me-think pass

- [ ] Every page is self-evident; the few that can't be are at least self-explanatory.
- [ ] Names of sections, links, and buttons are obvious — not cute, clever, marketing-induced, or internal jargon.
- [ ] Everything clickable *looks* clickable. Nothing un-clickable looks clickable (e.g. headings styled like links).
- [ ] No needless instructions where the design could be self-explanatory instead.
- [ ] No "Happy talk" intros ("Welcome to our site…").
- [ ] No mission statements as Welcome blurbs.

## Billboard-design pass (designing for scanning)

- [ ] Page follows web conventions for layout, behaviour, and appearance — or deviates only with a clearly better idea.
- [ ] Visual hierarchy: more important = more prominent; related things look related; nesting reflects containment.
- [ ] Page broken into clearly defined areas (`$25,000 Pyramid` test: glance and label each area's purpose).
- [ ] Plenty of headings, not floating between paragraphs but anchored to the section *below*.
- [ ] Short paragraphs. Single-sentence paragraphs are fine.
- [ ] Bulleted lists wherever a series of comma- or semicolon-separated items appears.
- [ ] Key terms highlighted, but sparingly.
- [ ] Noise turned down: no shouting, no disorganisation, no clutter. Everything that's not contributing has been cut.

## Word-economy pass (Krug's Third Law)

- [ ] First read-through: cut half the words.
- [ ] Second read-through: cut half of what remains.
- [ ] No "happy talk." No greetings. No throat-clearing.
- [ ] Instructions cut to the bare minimum, or eliminated by making the design self-explanatory.
- [ ] Forms: no instructions for things every user already knows ("Type a keyword and press Enter").

## Navigation pass

- [ ] Persistent navigation on every page (except forms, where a minimal version is fine).
- [ ] Persistent nav includes: Site ID, Sections, Utilities, Search, Home link.
- [ ] Site ID looks like a Site ID — top-left (LTR), distinctive typeface, recognisable at any size.
- [ ] Search is a simple box + button + "Search" label or magnifying glass icon. No fancy wording, no scope options unless truly needed.
- [ ] Lower-level (third-level and deeper) navigation works as well as the top two.
- [ ] Breadcrumbs (in deep sites) at the top, with `>` between levels and the current page boldfaced.
- [ ] Page name is prominent, in the right place (framing unique content), and *matches the words the user clicked*.
- [ ] "You are here" indicator is unambiguous — not too subtle.
- [ ] Tabs (if used) have clear visual front/back, with active tab connecting to content below.

## Choice pass (Krug's Second Law)

- [ ] Each click/tap is a mindless, unambiguous choice. Ambiguous "Animal, Vegetable, or Mineral?"-style decisions have been eliminated or given just-in-time guidance.
- [ ] When guidance is needed, it is **Brief**, **Timely**, and **Unavoidable**.
- [ ] Forms make questions easy to answer; complex options are staged across screens instead of dumped at once.

## Goodwill pass (Chapter 11)

- [ ] Top user tasks are obvious and easy from the home page and entry points.
- [ ] Costs, fees, and outages are stated up front.
- [ ] No information artificially hidden (phone numbers, shipping rates, prices) to pad funnel metrics.
- [ ] No "shucking and jiving" sincerity copy.
- [ ] FAQs are real questions, kept up to date, and candid even on awkward topics.
- [ ] Errors are easy to recover from. When the user can't get what they want, the site apologises.

## Mobile pass (if mobile or responsive)

- [ ] Zoom works, or the page is responsive.
- [ ] Deep links go to the linked content, not the mobile home page.
- [ ] A path to the full / desktop site is available (usually a toggle in the footer).
- [ ] Affordances are still visible despite flat design. Buttons look like buttons; inputs look like inputs.
- [ ] No reliance on hover for critical info or controls.
- [ ] Performance: small payloads, no responsive design that ships desktop-sized images to phones.
- [ ] Apps: a learnable first-run flow exists, and important features are memorable on the second visit.

## Accessibility floor (Chapter 12)

- [ ] Site fails no obvious accessibility tests (e.g. resizing browser text actually works on at least the non-fixed-size text).
- [ ] Every image has appropriate alt text (`alt=""` for decorative).
- [ ] Semantic headings (`<h1>`, `<h2>`, …) used correctly.
- [ ] All form fields associated with `<label>` elements.
- [ ] "Skip to Main Content" link at the top of each page.
- [ ] All content reachable by keyboard.
- [ ] Sufficient text/background contrast.
- [ ] If using a template (e.g. WordPress theme), the template is accessible.
- [ ] Most-confusing-for-everyone usability problems fixed *before* code-level accessibility tweaks.

## Final gate

- [ ] At least one person who didn't build the thing has tried to use it for a real task.
- [ ] At least one round of usability testing has happened on whatever stage the design is in (sketch, wireframe, prototype, or live page).
- [ ] The three most serious problems found in testing have been fixed — not the ten easiest.
