# Chapter 21: Diagramming and Presenting Architecture

## Core Principles
- **Representational consistency**: when a diagram drills into a subset of the system, first show how that subset sits within the larger topology. Never present a fragment without locating it in the whole.
- Use low-fidelity tools (whiteboards, tablets, sticky notes) early — the more time invested in a polished diagram, the harder it is to throw away. This is the **Irrational Artifact Attachment** anti-pattern. Reach for high-fidelity tools (OmniGraffle, draw.io, Lucid, etc.) only once the design has stabilized.
- Pick a standard and stay consistent: **UML** (mostly class and sequence survive), **C4** (Context / Container / Component / Class — best for monoliths and moderately-distributed systems), **ArchiMate** (lighter, enterprise-scoped). Within any standard, build a personal/team stencil so common shapes mean the same thing across diagrams.
- Diagram hygiene: every element titled, lines thick enough to read, arrows that disambiguate direction, solid lines for synchronous and dotted lines for asynchronous, color used to disambiguate (not decorate), and a key whenever shapes are not self-explanatory.
- Presenting is not the same as documenting. Presentations are time-controlled (presenter paces); infodecks are reader-paced. Don't conflate them — a slide deck that works standalone is failing as a live presentation, because the slides have absorbed the speaker's half of the story.
- Manipulate time deliberately: use **transitions** between slides and **animations** within them to hide slide boundaries and stitch ideas together; use **incremental builds** to reveal information at the speaker's pace; use **invisibility** (a blank slide) to put attention back on the speaker.

## Enforceable Rules
- Any architecture diagram committed to the repo MUST have a title, a legend (if shapes/colors aren't obvious), and use consistent line semantics (solid = sync, dotted = async) within and across diagrams in the same repo.
- Drill-down diagrams MUST include a context indicator (mini-map, inset, or explicit reference) showing where the subset sits in the larger architecture.
- New diagrams targeting external presentation MUST declare whether they are a presentation slide or an infodeck; presentation slides should not be self-sufficient walls of text.
- Architecture documentation that uses C4, UML, or ArchiMate within a repo should stick to that one notation — don't mix three.

## Review Questions
- Is the scope of this diagram obvious? Can a reader who lands here cold tell which slice of the system they are looking at?
- Are line styles, arrow directions, shapes, and colors consistent with the rest of the repo's diagrams?
- If this is a slide for a meeting, does the slide still make sense when separated from the speaker? If yes, the slide is doing too much.
- Is there a key for any non-obvious shape or color?

## Examples
### Violation
A PR adds `architecture.png` to the repo: an unlabeled box-and-arrow diagram with solid and dotted lines used interchangeably, no title, no legend, and no indication whether it is the whole system or one bounded context.
### Good Implementation
`docs/architecture/payment-flow.md` embeds a titled C4 Component diagram of the payment service with a one-line context note and inset showing where it sits in the overall Container diagram; solid arrows for synchronous REST calls, dotted arrows for queue publishes; a small legend at the bottom; colors used only to distinguish the two collaborating services.

## Implications
### For Agents
- When producing a diagram, write the title first, choose a notation, and stick to it. Default to C4 for service-oriented systems unless the repo already uses something else.
- Treat any diagram as a candidate for re-use — name elements, use a consistent stencil, and avoid one-off shapes.
- When summarizing an architecture in a written response, mirror the same representational-consistency discipline: locate the subsystem within the whole before describing internals.
### For Tickets/PRs/CI
- PRs that introduce or change architecture diagrams should be reviewed for legend, title, line semantics, and scope indicator just like code is reviewed for style.
- Architecture docs in repos should live as text + diagrams under `docs/` rather than as opaque image attachments — prefer textual diagram formats (PlantUML, Mermaid, draw.io XML, Structurizr DSL) so diffs are reviewable.
- Decks used in proposal/review meetings belong in the repo or a linked artifact store with a clear `presentation` vs `infodeck` label, so future readers know what they're looking at.
