# llm-cost-attribution use cases

The README-ready application APIs exported from `src/index.mjs`, the ports they
depend on, and the boundary rule that keeps the core free of I/O. The broader,
cross-package architecture catalog lives at the repo root in
`docs/architecture/use-case-catalog.md`; this file tracks the package's
ready-to-use application surface so it stays aligned with the README and barrel.

The four attribution ports — `SessionSource`, `IssueMatcher`, `UsageRecordSource`,
and `UsageRecordSink` — are defined in `src/attribution-ports.mjs`. The
port-based workflows live in `src/attribution-workflow.mjs` (core, I/O-free); the
real Claude/Codex transcript and usage-JSONL adapters live in
`src/attribution-adapters.mjs`. Boundary rule: core modules import no filesystem,
transcript, usage-JSONL, CLI, HTTP/Linear, or child_process APIs — enforced by
`npm run test:boundary` and the project-acceptance boundary check.

## CreateAttributionWorkflow
`createAttributionWorkflow({ sessionSource, issueMatcher, usageRecordSource, usageRecordSink, recordedAt })`
binds the four ports into a workflow whose methods compute issue/worktree cost
and backfill usage from caller-supplied sources and sinks, with no filesystem
assumptions. Each convenience wrapper below wires the real transcript/usage
adapters into this same core, so library users can swap in their own in-memory or
remote ports instead.
Ports: SessionSource, IssueMatcher, UsageRecordSource, UsageRecordSink.
Adapters: `transcriptSessionSource` / `cwdIssueMatcher` / `usageJsonlRecordSource`
/ `appendingUsageRecordSink`, plus in-memory ports in tests.
Output: a workflow object (`computeIssueCost`, `computeWorktreeCost`,
`computeIssueCostFromUsage`, `iterateUsageFromSessions`, `backfillUsage`).

## ComputeIssueCost
`computeIssueCost(issueIdentifier, options)` rolls up token/turn/quota cost for
one issue. The wrapper wires the issue-scoped Claude/Codex transcript adapter at
the edge and delegates to the port-based core (also reachable directly as
`createAttributionWorkflow(...).computeIssueCost`).
Ports: SessionSource, IssueMatcher. Output: IssueRollup.

## ComputeWorktreeCost
`computeWorktreeCost(worktreePath, options)` rolls up cost for every session run
from one worktree directory, regardless of any issue identifier. The wrapper
wires the worktree-scoped transcript adapter over the same port-based core.
Ports: SessionSource, IssueMatcher. Output: IssueRollup labelled with the
worktree basename.

## ComputeIssueCostFromUsage
`computeIssueCostFromUsage(issueIdentifier, usageSource)` rolls up cost for one
issue from previously-written `usage.jsonl` records instead of raw transcripts,
so the source transcripts can be deleted while history stays queryable. The
wrapper wires `usageJsonlRecordSource` over the core.
Port: UsageRecordSource. Output: IssueRollup.

## BackfillUsage
`backfillUsageFromTranscripts(options)` derives spec-compliant `usage.jsonl`
records from local Claude/Codex transcripts and appends them to one file. The
port-based `backfillUsage` writes every batch through a `UsageRecordSink`, so the
core never calls the filesystem JSONL writer directly.
Ports: SessionSource, IssueMatcher, UsageRecordSink. Output: UsageBackfillSummary
`{ recordsWritten, sessionsProcessed, sessionsSkipped }`.

## ListKnownIssues
`listKnownIssues(options)` enumerates every issue identifier that has at least one
local Claude or Codex session, for pickers and dashboards. Adapter-only
enumeration over the transcript readers; it computes no rollup.
