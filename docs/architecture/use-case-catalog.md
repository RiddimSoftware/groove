# Use Case Catalog

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
