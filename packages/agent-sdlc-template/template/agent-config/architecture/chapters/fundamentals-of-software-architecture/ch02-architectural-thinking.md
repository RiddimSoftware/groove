# Chapter 2: Architectural Thinking

## Core Principles
- Architecture and design are not separated by a one-way handoff. They form a continuous loop with bidirectional feedback between architect and developer; treating them as siloed stages is why architecture so often fails to land.
- Architects optimize for **technical breadth** (the middle of the knowledge pyramid: stuff you know exists) rather than **technical depth** (stuff you are an expert in). Knowing that five solutions exist for a problem is more valuable than mastering one.
- The knowledge pyramid has three bands — **known knowns**, **known unknowns**, **unknown unknowns**. Unknown unknowns are why Big Design Up Front fails; all architecture is eventually iterative.
- Every architectural answer is "it depends." The job is not to find *the* right answer — it's to surface the trade-offs ("Programmers know the benefits of everything and the trade-offs of nothing").
- Architects must stay hands-on: through POCs, technical-debt stories, bug fixes, tooling/automation, or code review. Architecture-only architects drift into stale expertise.

## Enforceable Rules
- Trade-off analysis must be visible: list the benefits *and* the drawbacks of the chosen option, not just the chosen one's advantages.
- Avoid "Frozen Caveman" reflexes: when an objection is raised against a design, distinguish realistic risk from a personal past-burn rationalization with no current evidence.
- An architect who owns critical-path framework code is a bottleneck — delegate that ownership and pull business-logic work one to three iterations downstream instead.

## Review Questions
- What are the *disadvantages* of the chosen approach, and were they weighed against the disadvantages of the alternatives?
- Is the rationale based on current trade-offs, or on a one-time historical incident ("but what if we lose Italy")?
- Did the proposer consider at least one other plausible option, or jump to a single tool they already know?
- Is the architect/author still close enough to the code to evaluate implementation cost honestly?

## Examples
### Violation
- A design doc reads: "We will use publish/subscribe topics because they are extensible." It lists no disadvantages — no mention of the harder access control, the loss of per-consumer contracts, or the weaker per-consumer monitoring. This is "benefits of everything, trade-offs of nothing."
### Good Implementation
- A design doc lists topic *advantages* (extensibility, producer decoupling) and *disadvantages* (broader data access, homogeneous contracts, weaker per-consumer scaling), then explicitly names extensibility as the higher priority for this system and accepts the cost.

## Implications
### For Agents
- When generating an implementation, briefly name the rejected alternative and why the current one wins. When reviewing a PR, push back if only upsides are listed. Prefer breadth over depth in suggestions: surface adjacent options the human may not have considered, rather than pattern-matching to the one stack you know best.
### For Tickets/PRs/CI
- Tickets that pick a technology should explicitly enumerate alternatives considered. PR descriptions for architectural changes include a short "trade-offs accepted" section. Maintain space for proof-of-concept work (a throwaway prototype branch) so design decisions are validated against real code, not slideware.
