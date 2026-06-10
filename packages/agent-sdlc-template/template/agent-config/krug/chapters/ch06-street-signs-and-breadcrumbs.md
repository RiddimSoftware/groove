# Chapter 6: Street Signs and Breadcrumbs

*Designing navigation.*

> People won't use your Web site if they can't find their way around it.

This is the long chapter — navigation is most of the design problem on most Web sites.

## Scene from a mall

To buy a chainsaw at Sears, you walk in, look up at the department signs, head to Tools, scan aisle signs, find the right shelf, decide whether to buy. If wrong, back up; if frustrated, ask a clerk. The whole flowchart involves the store's signs and your ability to scan.

On the Web, the same shape applies — with one key extra decision: **do I ask first or browse first?** The Web equivalent of asking is **search**. Nielsen calls users who default to search **search-dominant**, and those who default to browse **link-dominant**.

## The unbearable lightness of browsing

Web space has key oddities that physical and print spaces don't:

- **No sense of scale.** Even after long use, we don't know how big a site is.
- **No sense of direction.** There's no up/down/left/right in a site; only "up the hierarchy" or "into a deeper level."
- **No sense of location.** First time we found something by following signs; second time, we don't have a mental map ("near the refrigerators"), we have to retrace steps in the hierarchy.

This is why **bookmarks** and the **Back button** are so important (Back is the most-used browser button), and why **the Home page** is so important — it's the North Star, the one fixed place. "Click Home" gives a fresh start.

Navigation isn't just a *feature* of a Web site — it *is* the site, the same way the building, shelves, and registers *are* Sears. Without navigation, there's no there there.

## The overlooked purposes of navigation

Obvious purposes: help find things, tell us where we are.

Less obvious:

- **Tells us what's here.** Navigation reveals content — sometimes more important than guiding or situating.
- **Tells us how to use the site.** Done correctly, navigation is all the instructions a user needs.
- **Gives us confidence in the people who built it.** A clear navigation says "they know what they're doing."

## Web navigation conventions

Standard parts of a persistent (a.k.a. global) navigation:

- **Site ID** (top-left in LTR languages) — the building name of the site.
- **Sections** (a.k.a. **Primary navigation**) — links to main sections.
- **Subsections** — sometimes embedded in persistent nav (dropdowns), sometimes revealed on section front pages.
- **Utilities** — links to things outside the main hierarchy (Sign in, Help, Site Map, Shopping Cart, About Us, Contact). Up to four or five fit; the rest go to footer.
- **Search box** — almost always.
- **Home link** — a button or link that returns to Home.

The implicit voice: *"The navigation is over here. Some parts will change a little depending on where you are, but it will always be here, and it will always work the same way."*

### One exception to "every page"

Forms. The persistent nav becomes a distraction when the user is checking out, registering, or filling in feedback. Use a minimal version: Site ID, Home link, and any Utilities needed.

## The Site ID

Should be at the top, ideally framing everything else. A distinctive typeface and a recognisable graphic. Almost all users expect the Site ID to also act as a Home button.

## Search

Stick to the formula: a box, a button, and either the word "Search" or the magnifying-glass icon. Avoid:

- **Fancy wording.** "Find," "Quick Find," "Quick Search," "Keyword Search" all underperform "Search." If you must label the box "Search," label the button "Go."
- **Instructions.** "Type a keyword" is patronising — everyone knows how a search box works.
- **Options up front.** Scoping options ("search this site / part of site / Web") rarely justify the cognitive cost. If users want to limit scope, offer it on the *results* page when they've discovered the result set is too broad.

## Secondary, tertiary, and lower-level navigation

Designers consistently neglect navigation past level two. Sample pages and flowcharts cover Home + the top two levels; everything deeper becomes ad hoc.

But users spend as much time on lower-level pages as on top-level ones. Bolting consistent navigation on later is hard. The fix: **build sample pages that exercise navigation for all potential levels before arguing about the colour scheme.**

## Page names — Why I love to drive in L.A.

Page names are the street signs of the Web. L.A. has the best street signs anywhere: big, hanging over the street you're driving on. Boston's are small, perpendicular, hard to read until it's too late. Be L.A.

Four facts about page names:

- **Every page needs a name.** Highlighting in the navigation isn't enough.
- **The name needs to be in the right place** — framing the unique content of *this* page, not the navigation or the ads.
- **The name needs to be prominent** — usually the largest text on the page.
- **The name needs to match what I clicked.** If the link said "Lug nuts," the page should be called "Lug nuts." Minor compromises ("Gifts for Him" → "Gifts for Men") are tolerable when the equivalence is obvious. Each violation costs trust.

## "You are here" indicators

Highlight the current section/subsection in whatever navigation bars or menus appear.

Common ways to mark the current location:

- Pointer next to it
- Different text colour
- Bold
- Reversed (white-on-coloured) button
- Different button colour

The most common failure: too subtle. Designers love subtlety; users miss it. **If you think a cue is sticking out like a sore thumb, it's probably about right.** Combining cues (colour *and* bold) is safer than relying on one.

## Breadcrumbs

Show the path from Home to the current page (`Best Buy > TV & Home Theater > TV Stands, Mounts & Storage > TV Stands > 40" - 49"`). Most useful on deep-hierarchy sites; increasingly common everywhere.

Best practices:

- **Put them at the top.** Marginalises them like page numbers.
- **Use `>` between levels.** It visually implies forward motion.
- **Boldface the last item** — the current page, naturally not a link.

## Tabs

Krug suspects Leonardo invented tab dividers. They work because they extend a real-world metaphor (3-ring binder tabs, file-folder tabs). Reasons to use them:

- **Self-evident.** Even "computer illiterate" users get tabs immediately.
- **Hard to miss.** Visually distinctive enough to fight banner-blindness.
- **Slick.** Add polish when done right.

For tabs to *feel* like tabs, the active tab must look like it's *in front of* the others — different colour or shade, physically connecting to the content below.

## The trunk test

Krug's acid test for navigation.

Imagine you've been blindfolded, locked in a trunk, driven around, then dumped on a random page deep in the site. When your vision clears, you should be able to identify, without studying the page:

- What site is this? (Site ID)
- What page am I on? (Page name)
- What are the major sections of this site? (Sections)
- What are my options at this level? (Local navigation)
- Where am I in the scheme of things? ("You are here")
- How can I search?

How to actually run it: print a random page, hold it at arm's length or squint, and try to circle each item as quickly as possible. Then have a friend do it on your site.
