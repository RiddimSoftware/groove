# Factory Change Management

Use this context when designing issue gates, rollout plans, decommissioning work, release sequencing, or any workflow that would traditionally include elapsed-time waiting.

## Principle

Riddim's software factory optimizes around complexity, observability, and reversible change. Do not import human-organization change-management defaults unless the constraint is genuinely external.

Changes are cheap in the current factory. It is acceptable to discard a process, workflow, implementation path, or automation even if tokens were spent building it. Token efficiency still matters, but stalled throughput is usually more expensive than throwing away a weak path and trying a better one.

## Complexity, not time

Work is estimated and routed by complexity, not elapsed time.

- The Linear `Estimate` field is a complexity signal that the orchestrator (symphonyd) uses to route work to an implementer of the right capability — see [`context/linear-standards.md § Estimating issues`](linear-standards.md#estimating-issues) for the ladder and rubric.
- Complexity means novel reasoning, ambiguity, architectural surface, blast radius, and verification difficulty.
- It does not mean hours, days, sprint slots, or expected duration.

Time also moves at different speeds by organizational layer. Software development can cycle much faster than marketing, App Store review, partnerships, operations, vendor procurement, or human approval. A single elapsed-time cadence across all layers is usually wrong.

## Autonomous implementability

Autonomous development is the factory's highest-priority path. Linear Projects should be shaped so developers can keep moving without human questions.

Each Project has one human-intervention surface: the `human-handoff` issue. Every other issue should be runnable by an autonomous agent from the issue body and retrievable context alone. The writer must include the access assumptions, tools, dependencies, credentials, data shapes, verification commands, and sequencing constraints needed for the agent to complete the task.

If the writer cannot make the work autonomous, the work is not ready for a developer issue. Move the human decision or manual action into the Human Handoff issue, create a prerequisite access/provisioning issue, or resolve the missing implementation details as pre-work before the issue is written.

## Gate shape

Prefer direct confidence conditions over inherited calendar waits.

Good gates:

- Zero observed production traffic since the replacement caller shipped.
- N consecutive expected events succeeded after rollout.
- N requests, accounts, jobs, or sessions exercised the new path without fallback.
- Rollback path is documented, tested, and still available.
- Blast radius is bounded by feature flag, route split, tenant allowlist, or reversible infrastructure config.
- The remaining human action is captured in a Human Handoff issue instead of blocking a developer PR.

Weak gates:

- Wait 7 days because that is what a traditional software organization would do.
- Let an autonomous developer poll a metric until the wall-clock date arrives.
- Keep retrying an issue whose only blocker is observation, vendor approval, App Store review, or another non-code event.

Calendar time is valid only when it is the real constraint: external review windows, legal notice periods, customer commitments, vendor SLAs, app-store processing, DNS propagation, TTL expiry, certificate validity, or another system whose behavior is actually time-bound.

## Switchover and decommissioning

For switchover work, encode the actual risk question:

> Are there still meaningful clients, jobs, routes, schedules, or integrations using the old path?

Answer that with telemetry and blast-radius controls. If a route or Lambda can be restored quickly, a shorter observation gate or event-count gate may be enough. If deletion is destructive, hard to roll back, or affects unmanaged clients, require stronger evidence before removal.

Do not make the implementation issue sit in the developer queue while waiting for observation. Split the lifecycle:

1. Migration or caller-removal issue.
2. Observation or readiness monitor, owned by deterministic automation where possible.
3. Repo cleanup issue once readiness is true.
4. Human Handoff issue for destructive production operations that cannot or should not be run by the autonomous developer.

Only the cleanup issue enters the developer queue. The observation monitor and human production action are separate surfaces so the developer loop does not spend tokens rechecking non-code state.

## Autonomous loop behavior

When an issue is not runnable yet, the loop should persist a durable state and stop dispatching developers to it.

Use a status or structured note that names:

- The blocker.
- The evidence observed.
- The condition that would make the issue runnable.
- The earliest useful re-check trigger, if any.
- Whether a human, monitor, release manager, or developer owns the next action.

`no_pull_request` is not enough. It describes the symptom, not the scheduler decision. A blocked observation issue should not be retried until new evidence or a state change exists.

## EPAC-1921 precedent

EPAC-1921 tried to delete unused Lambdas after iOS callers were removed. The inherited "zero invocations for 7 days" rule was a human-org safety default for avoiding deletion while stale clients still used the old route.

In the factory model, the better gate is not "7 days" by default. The better gate is "traffic has drained enough for the deletion's rollback cost and blast radius." That may be a compressed window, an event-count threshold, a sample-size threshold, or a reversible staged removal, depending on the route and client population.

The failure was not querying CloudWatch. The failure was letting a telemetry-waiting issue stay developer-eligible, causing repeated model sessions with no actionable code work.
