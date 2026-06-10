# Harness Engineering

Retrieve this file when working on agent infrastructure, repo scaffolding, context design, tooling, or enforcement architecture — topics where the *environment* the agent operates in is the work product. Not needed for routine feature implementation, review, or release work.

## What it is

Harness engineering is the discipline of designing the environment, feedback loops, and control systems that allow agents to do reliable work at scale. When agents generate most of the code, the engineer's primary job shifts: from writing code to making it possible for agents to navigate, reason about, and extend the codebase correctly.

The harness is everything except the product logic: repo structure, AGENTS.md, lints, CI, observability wiring, skills, execution plans, tooling, and doc standards. The quality of the harness determines the quality of agent output.

## Core principles

### Repository knowledge is the system of record

From an agent's point of view, anything it cannot access in-context while running effectively does not exist. Slack threads, calendar invites, and people's heads are invisible. Repository-local, versioned artifacts — code, markdown, schemas, execution plans — are all an agent can see.

Push every durable decision into the repo:
- Team alignment on an architectural pattern? → checked-in `docs/design-docs/`
- Known technical debt that's being deferred? → `docs/exec-plans/tech-debt-tracker.md`
- A debugging finding from an incident? → `docs/agent/` or inline in the relevant module doc

If it isn't discoverable to the agent, it is illegible in the same way it would be unknown to a new hire joining three months later.

### AGENTS.md is a table of contents, not an encyclopedia

Keep `AGENTS.md` short (~100 lines). Its job is to be a map: pointers to design docs, architecture notes, product specs, and deeper references. The facts live elsewhere.

A monolithic AGENTS.md:
- crowds out task context, leaving less room for the actual work
- makes every rule equally prominent (no rule is actually salient)
- rots faster than it can be maintained — agents can't distinguish stale from live
- resists mechanical validation

Use **progressive disclosure**: agents start with the entry point and are told where to look next, rather than being front-loaded with everything at once.

### Enforce invariants mechanically, not documentarily

Documentation describes intent. Lints and structural tests enforce it. A boundary rule that exists only in a doc will drift the moment an agent cannot see or execute it.

The target state for every architectural rule:
1. Document the rule (makes it discoverable and explainable)
2. Graduate it to a custom lint or structural test (makes it enforceable)
3. Write lint error messages as **agent-legible remediation instructions** — the message an agent sees when it violates the rule should tell it exactly what to change and where to look (e.g. _"This file imports `UIKit`. Move to an Interface Adapter. See `docs/architecture/boundary-rules.md`."_)

In a human-first workflow, these rules can feel pedantic. With agents, they become multipliers: once encoded, they apply everywhere at once, on every PR, without human attention.

### Enforce boundaries centrally; allow autonomy locally

Agents are most effective in environments with strict boundaries and predictable structure. Define the allowed dependency directions, module interfaces, and data-boundary rules up front. Enforce them mechanically. Within those boundaries, agents have significant freedom in how solutions are expressed — and that's fine.

The resulting code may not always match human stylistic preferences. As long as it is correct, maintainable, and legible to future agent runs, it meets the bar.

### Agent legibility over human ergonomics (in tooling choices)

When evaluating dependencies, abstractions, and library choices for agent-heavy repos, favor options that:
- Are fully representable in the repo (source available, not opaque compiled artifacts)
- Have stable, well-known APIs (more likely to be in training data; fewer surprises)
- Can be reasoned about from in-repo source (no external SaaS dashboards required)

Technologies often described as "boring" tend to be easier for agents to model due to composability, API stability, and representation in training data. In some cases, it is cheaper to have the agent reimplement a subset of functionality than to work around opaque upstream behavior from a public library — particularly when the custom implementation can be fully instrumented and tested in-repo.

### Continuous architecture GC

Technical debt is a high-interest loan. Pay it down continuously in small increments rather than compounding it into painful periodic sprints.

Approach:
1. Document **golden principles** — opinionated, mechanical rules that keep the codebase legible and consistent for future agent runs (e.g., "prefer shared utility packages over hand-rolled helpers," "validate all external data at the boundary")
2. Run a recurring background cleanup process that scans for deviations from those principles and opens targeted refactoring PRs
3. These PRs should be small enough to review in under a minute and automerge — the goal is continuous maintenance, not batch cleanup events

Human taste is captured once as a golden principle, then enforced continuously on every line of code.

### Plans are first-class artifacts

For complex multi-step work, check execution plans into the repo rather than relying on chat-thread alignment:

```
docs/exec-plans/
  active/        ← in-progress plans with progress + decision logs
  completed/     ← archived for audit trail
  tech-debt-tracker.md
```

Active plans let multiple agents pick up and continue work across context resets. Completed plans provide the decision history future agents need to avoid re-litigating settled questions.

### Application legibility for agents

As agents handle more of the development loop, their bottleneck shifts to QA capacity and the ability to reason about application behavior. To address this:

- **Per-worktree app instances**: make the app bootable per git worktree so each agent run operates on an isolated instance — including its own logs and metrics — that is torn down when the task is complete
- **Browser tooling**: wire browser automation (screenshots, DOM snapshots, navigation) into the agent runtime so agents can reproduce UI bugs, validate fixes, and reason about UI behavior directly
- **Observability exposure**: expose logs, metrics, and traces to agents via a local stack queryable with standard tools (LogQL, PromQL, etc.) — prompts like "ensure service startup completes in under 800ms" become tractable when agents can verify them directly

## What harness engineering is not

- Writing product features (that's the Developer role)
- Deciding what to build (that's the Backlog Team role)

Harness engineering is the infrastructure that makes all other agent roles more effective. It is the work that scales.
