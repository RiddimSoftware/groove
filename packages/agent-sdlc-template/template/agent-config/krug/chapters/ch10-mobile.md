# Chapter 10: Mobile

*It's not just a city in Alabama anymore. Welcome to the 21st century — you may experience a slight sense of vertigo.*

## Setting the scene

The smartphone era (post-iPhone, June 2007) finally made the mobile Web *good*. Apple paired more compute with a responsive interface — fast scrolling, fast pinch-zoom — and people stopped tolerating tiny stamp-sized "mobile" Web. Plus a smartphone now subsumes camera, GPS, watch, alarm clock, music library, books, and phone.

For emerging markets, the smartphone is often the first *and only* computer.

## What's different about mobile usability?

Honestly, not much. **The basic principles are the same.** If anything, mobile users move faster and read even less.

But there are *some* significant differences. As Krug writes, the field is still in its "Wild West" phase; many best practices haven't crystallised, and the tech keeps moving. So this chapter focuses on durable observations.

## It's all about tradeoffs

> Design is essentially about constraints (things you *have* to do, things you *can't* do) and tradeoffs (less-than-ideal choices to live within constraints).

Constraints can be good — a blank canvas paralyses. Whether or not you buy that, you're stuck with constraints, and where there are constraints there are tradeoffs. In Krug's experience, **most serious usability problems come from a poor decision about a tradeoff.** Example: CBS News on iPhone breaks stories into tiny chunks with slow loads and a big photo on every page. Result: he stopped using it.

Most mobile usability challenges boil down to *good tradeoffs*.

## The tyranny of the itty-bitty living space

Screens are small. Home-page real estate becomes even more precious.

**Mobile First** is one approach: design the mobile version first based on what users *most* need, then add features for the desktop version. It's a great prioritisation discipline — what's essential?

But some interpreted Mobile First as "pick what people want when they're *on the move*" — assuming mobile = phone-while-walking. That turned out to be wrong: people use phones on the couch as much as on the move, and they want to do everything.

The right interpretation: **prioritise so that what users want urgently or frequently is close at hand; everything else is reachable in a few more taps**, but there's a clear path. More tapping is acceptable as long as users stay confident the next thing they want is one tap away.

> Managing real-estate challenges shouldn't be done at the cost of usability.

## Breeding chameleons (responsive design)

Two things Krug can say about responsive / scalable / fluid / adaptive design:

- **It tends to be a lot of work.**
- **It's very hard to do well.**

Trying to maintain separate mobile and desktop sites is even worse — guaranteed to fall out of sync. There will be technical solutions. They'll take time.

In the meantime, three suggestions:

- **Allow zooming.** If you haven't mobilised the site at all, at minimum don't disable zoom.
- **Don't leave me standing at the front door.** Deep links from email or social must land on the linked content, not the mobile Home page.
- **Always provide a link to the full Web site.** Even if the mobile version is great, some users want desktop view (especially on tablets in landscape).

## Don't hide your affordances under a bushel

Affordances are the visual clues that signal how to use something (Don Norman's term — though he now prefers *signifiers*). A 3D-styled button says "click me." A bordered rectangle says "type into me." Without affordances, users have to guess.

For affordances to do their job, they have to be *noticeable*. Some characteristics of mobile devices have made affordances less noticeable, or invisible — and by definition, affordances are the *last* thing you should hide.

### No cursor = no hover = no clue

Before touch screens, Web design relied heavily on hover — tool tips, dropdown previews, hover state changes. Capacitive touch screens can't detect hover, so all that disappeared. Tool tips, hover-revealing dropdowns, hover-triggered colour shifts — gone. As a designer, you have to be aware these don't exist for mobile users, and find replacements.

### Flat design: friend or foe?

Flat design (which may have waned by the time you read this) removes visual distinctions — gradients, shadows, textures — in favour of clean uniform surfaces. Looks great to some. But the tradeoff is that flat design strips away decoration *and* the visual information that conveyed affordances. "I'm a button" used to be obvious; now it might look identical to "I'm a heading."

The fix when going flat: compensate with the remaining dimensions — position (in navigation bar), formatting (all caps, reversed type, distinctive typography) — to keep buttons looking like buttons.

## You actually can be too rich or too thin

…but computers can never be too fast. Particularly on mobile, **speed makes everything feel better**, and slow performance equals frustrated users and lost goodwill.

Mobile connectivity is unreliable — Wi-Fi at home or Starbucks, 4G/3G everywhere else. Be careful that responsive designs don't ship huge desktop-sized images and code to phones.

## Mobile-app usability attributes

Krug's core three remain *learnable*, *effective*, *efficient*. On mobile he calls out three attributes worth extra attention — *delight*, *learnability* (deeper than on the Web), and *memorability*:

### Delightful is the new black

Delight is fuzzy — "I'll know it when I feel it." Surrounding words: *fun, surprising, impressive, captivating, clever, magical*. Krug's bar: "Does something you'd have been burned at the stake for a few hundred years ago."

Delight tends to come from marrying *something people would love to do but didn't imagine possible* with *new technology that finally makes it possible*. Examples: SoundHound (identify song + sync lyrics live). Paper (drawing app with five tools, no options, optimised to make output look good).

Delight is the extra credit. Pursue it — but don't let it eclipse usability.

### Apps need to be learnable

Big problem with feature-rich apps: they're hard to learn. The norm of "one screen of hints when you first open the app, then nothing" isn't enough for apps that go beyond a few features.

Clear (a to-do app) is Krug's favourite well-trained example: short tour, then a tutorial that uses each gesture as an actual item in your first list. Even Clear, however, doesn't always stick. Demoing it in usability tests, no one has succeeded at a primary task. People miss the concept of multiple levels (lists / items / settings), and once stuck, they can't reach Help.

The takeaway: most apps need to do better than they currently do. Usability testing is the way.

### Apps need to be memorable, too

Once a user figures out an app, will they remember it next time?

> The best way to make things easy to *relearn* is to make them incredibly clear and easy to *learn* in the first place.

Memorability matters because the second-encounter experience determines whether the app stays installed. On mobile, life is cheap (99¢) — relearning from scratch is enough reason to abandon.

## Usability testing on mobile devices

Process: **the same as Chapter 9.** Logistics: complicated by mobile's lack of standard screen-share / screen-recording tools, hand-versus-screen visibility, whether to use participant's own device.

### Krug's recommendations

- **Use a camera pointed at the screen** instead of mirroring. Mirroring shows the screen but not gestures; on touch screens, gestures are most of the interaction. Watching a test without hands is like watching a player piano.
- **Attach the camera to the device** so the user can hold it naturally. Krug's DIY rig — "Brundlefly" — is a webcam clipped to a gooseneck book light: light, unobtrusive, $30 in parts.
- **Don't bother with a camera pointed at the participant.** It distracts observers; tone of voice tells you most of what a face would.

Setup: camera → laptop via USB → screen-sharing software (GoToMeeting / WebEx) → observers in another room. Screen recording on the observation-room computer to keep load off the facilitator.

## Finally

Mobile is where the future lives. Constraints and form factors will keep changing. New ways of interacting (voice, in Krug's bet) will keep arriving. The constant: **test**. That's how you keep usability from being lost in the shuffle.
