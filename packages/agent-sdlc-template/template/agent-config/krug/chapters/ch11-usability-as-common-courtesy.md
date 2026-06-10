# Chapter 11: Usability as Common Courtesy

*Why your Web site should be a mensch. (A mensch is a Yiddish word — a person of integrity, "a stand-up guy," someone who does the right thing.)*

## The opening anecdote

Krug had a flight booked the day his airline's union deadline expired. He checked the airline's site to learn what *they* were saying about a possible strike. Nothing. No mention anywhere on the Home page. No FAQ. No press releases. Just business as usual.

Reactions: confusion, suspicion, lost goodwill. The brand the airline spends hundreds of millions polishing took real damage in those minutes.

Most of the book is about **clarity** — do users understand? But there's a second pillar: **doing the right thing.** Beyond "Is my site clear?", ask "**Does my site behave like a mensch?**"

## The reservoir of goodwill

> Every time we enter a Web site, we start out with a reservoir of goodwill. Each problem we encounter on the site lowers that level.

If the reservoir hits empty, users leave — and don't come back, and may say bad things about you (NPS, social media). Properties of the reservoir:

- **Idiosyncratic.** Some people are patient, some prickly. Don't count on a big reserve.
- **Situational.** Users coming from a bad experience on another site arrive with less.
- **Refillable.** Mistakes can be recovered from by behaviour that shows you have the user's interests at heart.
- **One-shot-drainable.** A single experience — opening a registration form with 30 fields — can empty it instantly.

## Things that diminish goodwill

- **Hiding information the user wants.** Most often: support phone numbers, shipping rates, prices. Hidden support numbers don't reduce call volume — they just guarantee the user is annoyed by the time they reach the number. Hidden prices feel like a stalling-tactic from a phone salesman.
- **Punishing users for not doing things your way.** Forcing precise formatting on Social Security numbers, credit-card numbers, phone numbers. Strip the noise on the server side; don't shove it onto the user.
- **Asking for information you don't really need.** Users are skeptical of any unnecessary personal-data request.
- **Shucking and jiving.** Faux sincerity ("Your call is important to us") while keeping the user on hold for 20 minutes.
- **Putting sizzle in my way.** Pages bloated with marketing photos when the user is trying to get something done.
- **Your site looking amateurish.** Sloppy, disorganised, unprofessional — signals nobody cared. (Note: users complain about colour palettes but rarely actually leave because of them; ignore colour comments unless three out of four people describe it as "puke.")

There are times to deliberately do user-unfriendly things — Krug acknowledges that pop-ups annoy *and* often demonstrably boost revenue. Just do it in an informed way, not inadvertently.

## Things that increase goodwill

These are mostly the flip side of the drains, plus a few additions.

- **Know the main things people want to do on your site, and make them obvious and easy.** Ask anyone, "What are the three main things your users want to do?" — they always know. Acting on it is the harder part.
- **Tell me what I want to know.** Be upfront about shipping costs, daily hotel parking fees, service outages. You may lose points for the higher cost; you'll often gain more for the candour and ease of comparison.
- **Save me steps wherever you can.** Don't give me the shipping company's tracking number — give me a link that submits it for me. (Amazon was the first Krug remembers doing this.)
- **Put effort into it.** Krug's example: HP's tech support site. Painstakingly produced, accurate, well-organised. He's solved every problem himself, and keeps buying HP printers as a result.
- **Know the questions I'm likely to have, and answer them.** FAQ lists are valuable *if*:
  - They're really FAQs, not marketing pitches masquerading as FAQs (Krug's term for those: **QWWPWAs** — "Questions We *Wish* People Would Ask").
  - They're up to date — Customer Service can hand you this week's top five.
  - They're candid. People often arrive at FAQs hoping you'll address the question you'd rather they didn't ask. Candor here pays a lot.
- **Provide creature comforts like printer-friendly pages.** Some people love printing stories that span multiple pages. CSS makes this easy. Drop the ads (banners are even more annoying on paper) but keep illustrations.
- **Make it easy to recover from errors.** User testing reduces errors; for errors you can't prevent, always provide a graceful, obvious recovery.
- **When in doubt, apologise.** Sometimes you can't give the user what they want (e.g. the university library that can't unify logins across catalogues). At minimum, let them know *you* know you're inconveniencing them.

## The point

Clarity gets users to *understand* the site. Common courtesy keeps them on it. A site that does the right thing builds goodwill; a site that hides, evades, and inconveniences burns through it. The goal is to behave like the kind of organisation people want to do business with — a mensch.
