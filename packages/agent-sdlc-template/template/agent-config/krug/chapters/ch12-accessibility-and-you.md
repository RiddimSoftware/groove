# Chapter 12: Accessibility and You

*Just when you think you're done, a cat floats by with buttered toast strapped to its back.*

(The chapter's epigraph is a tongue-in-cheek thought experiment from *The Journal of Irreproducible Results*: cats land on their feet, toast lands buttered-side down — strap them together and you have antigravity.)

## Is accessibility part of usability?

> Unless you're going to make a blanket decision that people with disabilities aren't part of your audience, you really can't say your site is usable unless it's accessible.

Yet almost every site still fails the three-second accessibility test — change browser Text Size to Largest and see if anything changes. Most sites don't budge.

## What developers and designers usually hear

Standard reasons to "do accessibility" — most of which don't land with the 22-year-old developers who'll actually implement it:

- "Good business sense. People with disabilities have money."
- "Everyone should have equal access."
- "Most adaptations benefit everyone." (The Tang argument — *space programme gave us Tang* — sounds thin when closed captions are the only example cited.)
- "X% of the population has a disability." (Sounds inflated.)
- "Section 508: it's the law."

Two of these in particular make developers/designers sceptical:

- The population statistic feels exaggerated. Once one claim feels untrue, the rest gets discounted.
- "Benefits everyone" usually amounts to one example (closed captions); the imagined cases where accessibility *worsens* the experience for everyone else loom larger.

## The argument that actually lands

> **It's the right thing to do.**

Not just right — *profoundly* right. The single most underused argument is how dramatically better it makes some people's lives. Krug's example: blind people, with a computer, can read almost any newspaper or magazine on their own. That alone is reason enough to do your job a little better.

How many opportunities do we have to materially improve people's lives just by doing our work a little better? Take them.

And for those who don't find that compelling: legislative pressure is coming, sooner or later. Count on it.

## What developers and designers fear

- **More work** layered on already-impossible schedules. Worst case, accessibility arrives as a top-down initiative with reports and reviews.
- **Compromised design** — "buttered cats." The fear that accessible design and good design will be in opposition.

In the best world, accessibility works like the sign in the Chicago taxi Krug saw — Braille embossed on a thin layer of Plexiglas over normal print. Both audiences got the *best* version of the sign instead of a compromise. Most accessibility wins look more like that than like the buttered cat.

## The truth: it can be complicated

People reading about accessibility find advice like "Run a validator to check WCAG compliance." Sounds promising. But validators are more like grammar checkers than spell checkers — they generate vague warnings and long lists of "things you should check" that may or may not be problems.

This is discouraging because it suggests there's an enormous amount to learn. And honestly, making a site accessible is harder than it should be. Screen readers, developer tooling, design processes — they all need to keep maturing.

## The four things you can do right now

You don't have to become an accessibility expert. You can make any site much more accessible by focusing on:

### #1. Fix the usability problems that confuse everyone

The strongest form of the "Tang argument" runs in reverse: **making sites more usable for the rest of us is one of the most effective ways to make them more effective for people with disabilities.** If a confusing error message stumps you, imagine hitting it without being able to see the page. People don't suddenly become smarter just because they have a disability — they have a harder time recovering from confusion.

The single best thing for your site's accessibility is to **test it often** and continually smooth out the parts that confuse everyone. Code-level fixes can't compensate for a fundamentally unclear page.

### #2. Read an article

Theofanos and Redish, *Guidelines for Accessible and Usable Web Sites: Observing Users Who Work with Screen Readers.* Watch 16 blind users using screen readers on real tasks. The most quoted finding:

> **Screen-reader users scan with their ears.** They listen to the first few words of a link or line; if it doesn't seem relevant, they jump to the next. Just as impatient as sighted users. Many set their voice to a very fast rate.

The article is short (~20 min) and worth more than most books on accessibility.

### #3. Read a book

Two recommended:

- *A Web for Everyone: Designing Accessible User Experiences* by Sarah Horton and Whitney Quesenbery. ("Good UX equals good accessibility. Here's how to do both.")
- *Web Accessibility: Web Standards and Regulatory Compliance* by Jim Thatcher et al. ("Here are the laws and regulations, and we'll help you meet them.")

### #4. Go for the low-hanging fruit

The implementation work most teams can do without becoming experts:

- **Add appropriate `alt` text to every image.** `alt=""` for decorative images screen readers should ignore.
- **Use semantic headings.** `<h1>` for the page or main heading, `<h2>` for major sections, `<h3>` for subheadings. Style with CSS, don't use headings for visual size.
- **Make forms work with screen readers** — use the HTML `<label>` element to bind labels to fields.
- **Put a "Skip to Main Content" link at the beginning of each page.** Without it, screen-reader users hear the global navigation on every single page.
- **Make all content accessible by keyboard.** Not everyone can use a mouse.
- **Create significant contrast between text and background.** No light-grey on dark-grey.
- **Use an accessible template.** If you're using WordPress, choose a theme designed for accessibility.

The WebAIM site (webaim.org) has practical articles on the nuts and bolts of almost every accessibility technique.

## The lingering hope

Krug ended this chapter seven years before this edition with the hope that he could *remove* the chapter in five years because dev tools, browsers, and screen readers would have matured to the point that people built accessible sites without thinking. *Sigh.* Still hoping.
