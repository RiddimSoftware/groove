# Use Case Catalog

The canonical catalog of every application-layer use case in `llm-cost-attribution`:
its actor, goal, entities/values, ports, primary adapters, and the inward boundary
rule it relies on. Each entry names its `Current implementation` so the catalog and
the source stay traceable.

**Dependency rule.** Core modules import no filesystem, transcript, usage-JSONL, CLI,
HTTP/Linear, or `child_process` API — only ports (`SessionSource`, `IssueMatcher`,
`UsageRecordSource`, `UsageRecordSink`, and the forecaster's `EstimateTaggedUsageSource`
/ `PricingTable` / `QuotaModel` / `DiffSource`) cross inward. This rule is enforced by
`packages/llm-cost-attribution/scripts/check-boundary.mjs` (`npm run test:boundary`) and
the project-acceptance boundary check; the guard's `coreModules` / `adapterModules` lists
must stay aligned with the modules cataloged here.

**Convention:** every PR that adds or changes a use case updates this catalog in the
same PR.

### ForecastIssueCost
Actor: Operator
Goal: Forecast token, turn, $ API-equivalent, and Codex quota cost for one issue from historical issues with the same size and model.
Inputs: FeatureRecord `{ size, model, ... }`, estimate-tagged usage records.
Outputs: CostForecast for tokens, turns, and dollars with P50, P80, `n`, plus an optional Codex quota-fraction P50/P80 (single-issue only — never aggregated to project), low-confidence, and empty-cell markers.
Entities / values: FeatureRecord, CostForecast, Cell.
Ports: EstimateTaggedUsageSource, PricingTable, QuotaModel.
Primary adapters: `usage.jsonl` reader, synthetic record source in tests, `pricing.mjs` (PricingTable), `quota.mjs` (QuotaModel).
Current implementation: `packages/llm-cost-attribution/src/forecast.mjs`

### JoinCostWithFeature
Actor: Operator
Goal: Tie a chunk of cost to a chunk of code change without hard-wiring any one org's workflow — turn a cost stream and a diff stream into `correlate`-ready `{ feature, cost }` pairs via a selectable join strategy.
Inputs: a cost stream (UsageRecords from `readUsageRecords`), a diff stream (DiffRecords `{ key, additions, deletions, changedFiles }` from a DiffSource), and options `{ strategy, keyOfUsage?, keyOfDiff?, join?, featureOf?, cwdPattern?, window?, timestampOf*? }`.
Outputs: `{ pairs, unjoined }` — one `{ feature: <number>, cost: { tokens, turns } }` pair per joined key (shaped for `correlateCostWithFeature`), plus an `unjoined` summary of keys/timestamps present on only one side.
Entities / values: UsageRecord, DiffRecord, FeatureCostPair (shared with CorrelateCostWithFeature).
Ports: CostFeatureJoiner — a named strategy from an open registry (`issue-key` default, `worktree`, `time`) or a caller-supplied `keyOf*` / full `join` function; consumes a DiffSource's output as data.
Primary adapters: built-in joiners (`issue-key` uses the pure `issue-pattern` cwd extractor; `worktree` keys by normalized workspace path; `time` is a deliberately approximate, low-confidence timestamp-window fallback) plus the caller escape hatches.
Notes: pure join logic — imports no git/transcript/Linear IO (enforced by `npm run test:boundary`); both streams arrive as in-memory data. The `time` strategy carries no shared key and is documented + flagged (`approximate: true`) as noisy.
Current implementation: `packages/llm-cost-attribution/src/cost-feature-join.mjs`

### ForecastProjectCost
Actor: Operator
Goal: Forecast a whole project's cost by Monte Carlo convolution over its planned issues, so summed quantiles don't over-estimate (tail risks partly diversify).
Inputs: a list of IssuePlan `{ size, model }` (one per planned issue), estimate-tagged usage records, and options `{ iterations, seed, minSampleSize, pricingTable }`.
Outputs: ProjectForecast with tokens, turns, and (when priced) dollars channels — each carrying P50, P80, mean, variance — plus `iterations`, `seed`, low-confidence and empty markers.
Entities / values: IssuePlan, ProjectForecast, ProjectChannelForecast.
Ports: ForecastIssueCost's per-cell sampler (`collectCellSamples`); the shared `PricingTable` port (`priceFor(model, buckets)`); seeded RNG.
Primary adapters: seeded RNG (mulberry32, in-module); `pricing.mjs` (PricingTable).
Notes: tokens, turns, and dollars only — quota and wall-clock are excluded because they are windowed / scheduling quantities that don't sum. v0 assumes inter-issue independence (a documented simplification: correlated issues diversify less).
Current implementation: `packages/llm-cost-attribution/src/project-forecast.mjs`

### ReadGitDiffs
Actor: Operator
Goal: Read per-issue code-change sizes from local git history so cost can later be correlated with diff size without GitHub access.
Inputs: local repository path, optional rev range, optional issue-key pattern.
Outputs: DiffRecord `{ key, additions, deletions, changedFiles, shas }` plus unmatched/error summary.
Entities / values: DiffRecord.
Ports: DiffSource.
Primary adapters: LocalGitDiffSource (`git log --numstat` via local `git`).
Notes: adapter-only; it sees only locally-pulled history and depends on issue keys in commit subjects.
Current implementation: `packages/llm-cost-attribution/src/git-diff-source.mjs`

### CorrelateCostWithFeature
Actor: Operator
Goal: Given joined `{ feature, cost }` pairs, judge how strongly a feature (e.g. diff size, file count) predicts cost — reporting both rank and linear views so heavy-tailed cost data isn't misread under a single lens.
Inputs: an iterable of FeatureCostPair `{ feature: number, cost: number }` (already joined upstream by JoinCostWithFeature — this module does not join).
Outputs: CorrelationResult `{ n, spearman, pearsonLinear, pearsonLogLog, pearsonLogLogDropped, deciles }`. Spearman uses average-rank tie handling; log-log filters non-positive values and reports the dropped count. `deciles` is up to 10 buckets ordered by feature, each `{ n, featureRange, medianCost }`. Empty input, `n < 2`, and zero-variance series return explicit `null`s, never `NaN`.
Entities / values: FeatureCostPair, CorrelationResult, DecileBucket.
Ports: none — pure function over in-memory pairs.
Primary adapters: none. Joining (DiffSource → FeatureCostPair) lives in JoinCostWithFeature.
Current implementation: `packages/llm-cost-attribution/src/correlate.mjs`

### CreateAttributionWorkflow
Actor: Operator (library integrator)
Goal: Bind the four attribution ports into one workflow object so callers can compute issue/worktree cost and backfill usage from their own sources and sinks, with no filesystem assumptions baked into the core.
Inputs: `{ sessionSource, issueMatcher, usageRecordSource, usageRecordSink, recordedAt? }` — caller-supplied port implementations.
Outputs: a workflow object exposing `computeIssueCost`, `computeWorktreeCost`, `computeIssueCostFromUsage`, `iterateUsageFromSessions`, and `backfillUsage`.
Entities / values: ParsedSession, UsageRecord, IssueRollup, UsageBackfillSummary.
Ports: SessionSource, IssueMatcher, UsageRecordSource, UsageRecordSink.
Primary adapters: none in the core — each convenience wrapper (`computeIssueCost`, etc.) wires the real transcript/usage adapters (`transcriptSessionSource`, `cwdIssueMatcher`, `usageJsonlRecordSource`, `appendingUsageRecordSink`) at the edge, while tests supply in-memory ports.
Notes: pure composition entry point for the port-based core — imports no filesystem/transcript/usage-JSONL/CLI/HTTP/Linear/child_process (enforced by `npm run test:boundary` and the project-acceptance boundary check).
Current implementation: `packages/llm-cost-attribution/src/attribution-workflow.mjs` (`createAttributionWorkflow`)

### ComputeIssueCost
Actor: Operator
Goal: Roll up token/turn/quota cost for one issue from caller-supplied sessions, without assuming the data came from local Claude/Codex transcript directories.
Inputs: an `issueIdentifier`, a `SessionSource` (yields ParsedSessions), and an `IssueMatcher` (maps each session to an issue).
Outputs: IssueRollup `{ issueIdentifier, providerTotals, combinedTokens, combinedTurns, combinedSessions }`.
Entities / values: ParsedSession, IssueRollup.
Ports: SessionSource, IssueMatcher.
Primary adapters: Claude/Codex transcript readers behind `issueScopedTranscriptSessionSource` + `cwdIssueMatcher`; in-memory sources in tests. The `computeIssueCost` convenience wrapper wires the transcript adapters at the edge.
Notes: pure core — imports no filesystem/transcript/usage-JSONL/CLI/HTTP/Linear/child_process (enforced by `npm run test:boundary` and the project-acceptance boundary check).
Current implementation: `packages/llm-cost-attribution/src/attribution-workflow.mjs` (`computeIssueCostFromSessions`, `createAttributionWorkflow`)

### ComputeWorktreeCost
Actor: Operator
Goal: Roll up cost for every session run from one worktree directory, regardless of any issue identifier, from caller-supplied sessions.
Inputs: a `worktreePath`, a `SessionSource`, and an `IssueMatcher` (places each session at a worktree path).
Outputs: IssueRollup labelled with the worktree basename.
Entities / values: ParsedSession, IssueRollup.
Ports: SessionSource, IssueMatcher.
Primary adapters: `worktreeScopedTranscriptSessionSource` over the Claude/Codex transcript readers; in-memory sources in tests. The `computeWorktreeCost` convenience wrapper wires the transcript adapters at the edge.
Current implementation: `packages/llm-cost-attribution/src/attribution-workflow.mjs` (`computeWorktreeCostFromSessions`)

### IterateUsageFromSessions
Actor: Operator
Goal: Stream spec-compliant usage.jsonl records derived from caller-supplied sessions, one per turn, for downstream consumers (dump-usage, in-process correlation) — without writing them anywhere.
Inputs: a `SessionSource`, an `IssueMatcher`, and an optional `recordedAt`.
Outputs: an async stream of UsageRecords; the generator returns a `{ recordsYielded, sessionsProcessed, sessionsSkipped }` summary.
Entities / values: ParsedSession, UsageRecord.
Ports: SessionSource, IssueMatcher.
Primary adapters: transcript readers behind `transcriptSessionSource` + `cwdIssueMatcher`; the `iterateUsageFromTranscripts` convenience wrapper wires them at the edge. Record shaping reuses `sessionToUsageRecords`.
Current implementation: `packages/llm-cost-attribution/src/attribution-workflow.mjs` (`iterateUsageFromSessions`)

### BackfillUsage
Actor: Operator
Goal: Derive spec-compliant usage records from caller-supplied sessions and persist them through a sink, so the source transcripts can be deleted while the cost rollups remain reproducible.
Inputs: a `SessionSource`, an `IssueMatcher`, a `UsageRecordSink`, and an optional `recordedAt`.
Outputs: UsageBackfillSummary `{ recordsWritten, sessionsProcessed, sessionsSkipped }`; records delivered to the sink in per-session batches.
Entities / values: ParsedSession, UsageRecord, UsageBackfillSummary.
Ports: SessionSource, IssueMatcher, UsageRecordSink.
Primary adapters: transcript readers behind `transcriptSessionSource`; `appendingUsageRecordSink` over the usage-JSONL writer; in-memory sink in tests. Core writes through `UsageRecordSink` and never calls the filesystem JSONL writer directly.
Current implementation: `packages/llm-cost-attribution/src/attribution-workflow.mjs` (`backfillUsageThroughSink`)

### ComputeIssueCostFromUsage
Actor: Operator
Goal: Roll up cost for one issue from previously-recorded usage.jsonl records instead of raw transcripts.
Inputs: an `issueIdentifier` and a `UsageRecordSource` (yields UsageRecords).
Outputs: IssueRollup.
Entities / values: UsageRecord, IssueRollup.
Ports: UsageRecordSource.
Primary adapters: `usageJsonlRecordSource` over the usage-JSONL reader (drops malformed lines); in-memory sources in tests. The `computeIssueCostFromUsage` convenience wrapper wires the reader at the edge.
Current implementation: `packages/llm-cost-attribution/src/attribution-workflow.mjs` (`computeIssueCostFromUsageRecords`)

### ListKnownIssues
Actor: Operator
Goal: Enumerate every issue identifier that has at least one local Claude or Codex session, for pickers and dashboards, without computing any rollup.
Inputs: options selecting the local transcript roots (defaults to the standard Claude/Codex session directories).
Outputs: a sorted list of issue identifiers discovered across local transcripts.
Entities / values: ParsedSession (read for its identifier only).
Ports: none — adapter-only enumeration over the transcript readers.
Primary adapters: Claude/Codex transcript readers.
Notes: adapter-only; it lives at the edge rather than the core because it reads the local transcript filesystem directly, so it is not subject to the core dependency rule.
Current implementation: `packages/llm-cost-attribution/src/index.mjs` (`listKnownIssues`)

### DefineHumanHandoffLinearPackageContract
Actor: Workflow operator
Goal: Expose the Linear-specific Human Handoff package boundary so downstream work can add real setup and template-sync behavior without reshaping the CLI or application ports.
Inputs: setup command selection, optional Linear team selector, Human Handoff template body, injected Linear workspace / secret / reporter ports.
Outputs: command contract metadata, no-op setup/sync/doctor/bootstrap results, mutation count, token-readiness signal, validated template body.
Entities / values: SetupCommand, LinearTeamSelector, HumanHandoffTemplateBody.
Ports: LinearWorkspace, ConsoleReporter, SecretReader.
Primary adapters: CLI command parser, environment-backed SecretReader, stream ConsoleReporter, no-op LinearWorkspace adapter.
Notes: foundation scaffold only. Core use-case modules import no process environment, child_process, direct fetch, or Linear API details; real GraphQL mutations belong in a future LinearWorkspace adapter.
Current implementation: `packages/human-handoff-linear/src/use-cases/define-human-handoff-linear-package-contract.mjs`, `packages/human-handoff-linear/src/use-cases/*.mjs`
