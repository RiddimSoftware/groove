# Chapter 39: Keys to Platform Products

## Premise
Platform product management is the highest-leverage form of the discipline and
also the hardest, because a platform has three distinct constituencies —
application providers, developers, and end-users — with very different needs.
The most common platform-PM mistake is to prioritize developers (the easiest to
relate to) over end-users (the furthest away). The platforms that succeed are
the ones that put end-user value first, even when that makes developers' lives
harder.

## Key Principles
- A real platform is foundation software used by application developers to
  create end-user solutions, programmable via API, with multiple commercial
  products built on it. If those conditions aren't met, calling it a "platform"
  is just marketing on top of an unfinished product.
- The three platform constituencies have fundamentally different concerns:
  - **Application providers** care about business viability — yours and theirs
    — plus pricing, licensing, quality, support, and global availability.
  - **Developers** care about ease of creating maintainable, reliable code in
    their preferred languages with their preferred tools, on their target
    devices.
  - **End-users** care about the end result; if the application doesn't do what
    they need, they don't buy it and the app provider fails — and so do you.
- The natural priority order — developers first, app providers second,
  end-users third — is exactly backwards. Optimize for the end-user even if
  that means developers have to work a little harder.
- Many extremely successful platforms have been downright awful for developers
  but won anyway because end-users wanted what the apps delivered. Early
  Windows is the canonical example.
- Support is hard because you are a critical dependency for every customer.
  But the leverage is correspondingly high: a strong platform creates an
  ecosystem where you and your application providers succeed together.

## Practices
- Define the constituencies explicitly and weight requirements deliberately —
  do not let "loudest voice" become the prioritization scheme.
- Validate platform decisions against end-user impact via the application,
  not just developer convenience.
- Be honest about whether you are a platform at all: if you can't be
  programmed through an API and have no third-party commercial products on
  you, you're an unfinished product, not a platform.
- Treat delivery model choices (embedded, private-label, co-branded, hosted)
  and customization scopes (end-user, customer IT, SI/solution provider,
  vendor, source code) as first-class platform design decisions, each its
  own topic.

## Pitfalls
- Calling an unfinished product a "platform" and pushing the unfinished work
  onto customers or third-party developers.
- Optimizing for developers because they're vocal and easy to talk to, while
  end-users are too far away to push back.
- Building a beautiful developer environment whose resulting applications no
  one wants to use (client-side Java is the chapter's example — terrific
  opportunity for Macromedia/Adobe to win the actual user experience).
- Treating support as a normal product-support function instead of recognizing
  that every customer depends on you operating.

## Notable Frameworks / Definitions
- **Platform (Cagan's bar):** Foundation software used by application
  developers to create end-user solutions; programmable through an API; with
  multiple commercial software products or services built upon it.
- **The three constituencies:** application providers (the businesses building
  on you), developers (the people who write the code), and end-users (the
  people who run the resulting application).
- **Priority rule:** counter to the natural order, optimize for end-users
  first, application providers second, developers third — because the
  delivered application is what ultimately matters.
