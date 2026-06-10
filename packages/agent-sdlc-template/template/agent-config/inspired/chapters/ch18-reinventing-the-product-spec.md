# Chapter 18: Reinventing the Product Spec

## Premise
The paper-based PRD (under any of its names — PRD, MRD, BRD, FS) is obsolete. The only spec form that can describe a full user experience, accurately represent software behavior, serve every downstream consumer, and — crucially — be tested before engineering starts is a high-fidelity prototype. The prototype *is* the spec; supporting docs are appendices.

## Key Principles
- The central job of the product manager is to deliver to engineering a spec describing a product that will be successful. The traditional spec process is not capable of doing that.
- A useful spec must describe the *full* user experience — requirements, interaction design, and visual design are inseparable.
- Words and pretty pictures are too limited to represent actual software behavior; the spec must do that accurately.
- A spec serves many consumers (engineering, QA, customer service, marketing, site ops, sales, executives) and must communicate to all of them.
- There must be one master representation of the spec to minimize ambiguity and "versionitis." Other artifacts (requirement lists, wireframes, mock-ups) are supporting material, not parallel sources of truth.
- A paper document cannot be tested. A prototype can. You do not have a spec worth handing to engineering until the prototype has passed usability and value tests.

## Practices
- Build a high-fidelity prototype of virtually everything — all pages/screens and all major use cases. It is fine to fake backend processing and data, so long as the user experience is plausible.
- Supplement the prototype only with the things it genuinely cannot represent: business logic (tax tables, shipping rules), release requirements (reliability, performance, scalability), platform delivery requirements (installation, supported browsers), and the most important use-case flows.
- Keep the supplementary material on a wiki or intranet site so the team always knows where the latest answers live. Enable update notifications and decision history.
- Test the prototype with real target users before handing anything to engineering. Iterate the prototype until users can both figure out how to use it (usability) and demonstrate they care to use it (value).
- Use the prototype as the demo asset for execs, investors, board members, and partners — it communicates better than a PowerPoint deck.

## Pitfalls
- Treating Agile as license to skip the spec entirely.
- Relying on a 50-page Word document few people will read and nobody can test.
- Doing prototype testing during QA or beta — that is far too late.
- Letting the prototype keep changing freely *after* engineering starts; the rate of change should slow dramatically once build is underway.
- Splintering the spec across many artifacts with no single master — engineers, QA, and downstream consumers cannot tell which version is current.
- Paper prototypes, except for the most trivial interfaces. Modern tooling makes high-fidelity prototypes fast and cheap enough that paper is no longer the right trade-off.

## Notable Frameworks / Definitions
- **Requirements for a good and useful product spec.** It must (1) describe the full user experience, (2) accurately represent the behavior of the software, (3) communicate to the multiple downstream consumers of the spec, (4) be amenable to change as decisions get made — with the rate of change dropping sharply after engineering starts, and (5) exist as a single master representation with supporting artifacts subordinate to it.
- **High-fidelity prototype.** A realistic representation of the proposed user experience, covering all pages/screens and all major use cases. Backend processing and data can be simulated as long as the experience is plausible. The prototype embodies functional requirements, information architecture, interaction design, and visual design.
- **Counter-intuitive result.** Specifying via prototype typically *reduces* time to market, because the hard questions get answered before engineering — rather than during engineering as churn, or after shipping as follow-on releases to fix a mess.
