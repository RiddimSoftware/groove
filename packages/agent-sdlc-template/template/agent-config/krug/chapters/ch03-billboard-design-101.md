# Chapter 3: Billboard Design 101

*Designing for scanning, not reading.*

Given that users are whizzing by, scanning rather than reading, satisficing rather than optimising, the design has six jobs:

1. Take advantage of conventions.
2. Create effective visual hierarchies.
3. Break pages up into clearly defined areas.
4. Make it obvious what's clickable.
5. Eliminate distractions.
6. Format content to support scanning.

## 1. Take advantage of conventions

Conventions are widely-used or standardised design patterns. Like stop signs and the gas-pedal-on-the-right convention in cars, Web conventions tell users where to look and how to behave with very little cost. They make life easier because users don't have to figure out from scratch what things are and how they work each time they visit a new site.

Web conventions cover:

- **Where things are located.** Logo top-left, primary navigation across the top or down the left.
- **How things work.** Shopping-cart metaphor, similar forms for payment/shipping.
- **How things look.** Standard appearance for play buttons, search icons, social share controls.

Conventions also vary by site *kind*: commerce, colleges, blogs, restaurants, movies — each category has its own evolved patterns because each is solving the same set of problems.

### Where designers go wrong

Designers are often *reluctant* to use conventions because they want to do something new and different — and praise/awards rarely cite "best use of conventions." This usually amounts to time spent reinventing the wheel.

Krug's rule: **innovate when you *know* you have a better idea; lean on conventions when you don't.** When you do replace a convention, what replaces it must be either (a) so clear and self-explanatory that there's no learning curve, or (b) so valuable that the small learning curve is worth it.

### Clarity trumps consistency

Within a site, consistency is usually good. But:

> Clarity trumps consistency.

If a slight inconsistency makes something significantly clearer, choose clarity.

## 2. Create effective visual hierarchies

A clear visual hierarchy uses appearance to portray relationships — what's important, what's related, what's part of what.

Three traits of a clear visual hierarchy:

- **More important = more prominent.** Larger, bolder, more distinctive colour, more white space around it, or nearer the top.
- **Logically related = visually related.** Group with headings, common style, or shared containers.
- **Nested visually to show containment.** A section heading visually frames the items inside the section.

When the hierarchy is right, the page is preprocessed for the user; they parse it almost instantly. When it's missing or wrong (a heading that spans things it doesn't apply to), the user is forced to read every word and reconstruct the structure themselves — which is much more work.

Newspapers are a long-standing example. The biggest headline = the most important story. A headline spanning multiple columns groups them as one story.

## 3. Break pages up into clearly defined areas

A well-designed page should pass the `$25,000 Pyramid` test: glance at any area, and you can describe what's in it ("Things I can do on this site!", "Links to today's top stories!", "Navigation to get to the rest of the site!").

Users decide *very quickly* which areas are likely to contain what they need; they then largely ignore the others. Banner blindness — users ignoring areas they associate with ads — is the extreme case.

## 4. Make it obvious what's clickable

Users scan for visual cues that indicate clickability: shape (buttons, tabs), location (menu bar, navigation column), formatting (colour and/or underlining).

A short history of clickability:

- **Paleozoic era (~1995):** stock HTML text links and buttons — ugly but obviously clickable.
- **Wild West (~2000):** designers pushed back against HTML's limits with images as links; "click here" had to be spelled out because nothing looked clickable any more.
- **Golden Age (~2005-on):** CSS gave one colour for clickable text, etc. Users got it; life was good.

It's resurfacing as a problem in mobile (flat design), but on desktop you'll usually be fine if you pick one colour for all text links — or make sure shape/location identify them. Don't use the link colour for non-clickable headings, and vice versa.

## 5. Eliminate distractions (keep noise down)

Three kinds of visual noise:

- **Shouting.** Everything on the page clamours for attention — exclamation points, bright colours, slide-shows, pop-ups. *Everything* can't be important. Shouting is a symptom of failing to make hard decisions about what's most important.
- **Disorganisation.** A ransacked-room look that signals "no underlying grid."
- **Clutter.** Too much *stuff*. Low signal-to-noise ratio. Useful content is buried.

When editing pages, **presume everything is noise until proven innocent.** Cut anything that's not making a real contribution.

## 6. Format content to support scanning

- **Use plenty of headings.** Well-written, thoughtful headings act as an informal outline. Use *more* than you'd think and put *more time* into writing them. Critically: don't let headings float between paragraphs — they must be visually anchored to the section they introduce (closer below than above).
- **Keep paragraphs short.** "Wall of words" is daunting. Single-sentence paragraphs are fine online. If a paragraph is long, there's almost always a place to split it.
- **Use bulleted lists.** Anything that *can* be a bulleted list probably *should* be. Add a small amount of space between items.
- **Highlight key terms.** Bold the most important words/phrases at first appearance, sparingly. Too much highlighting loses its effect.

For more on writing scannable content, Krug recommends Janice (Ginny) Redish's *Letting Go of the Words*.
