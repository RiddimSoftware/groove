# Symphony Coding-Agent Cost Telemetry Extension

Status: Draft v0.1 (language-agnostic)

Purpose: Define a single, persistent, append-only telemetry stream that captures the minimum
sufficient evidence to attribute coding-agent token cost to a unit of issue-tracker work.

This document is an EXTENSION to the Symphony Service Specification ("the parent specification").
It does not replace any normative requirement in the parent specification. It is deliberately
narrow: it standardizes per-turn cost telemetry so that two conformant Symphony implementations
produce records a single cost-attribution reader can ingest interchangeably.

## Normative Language

The key words `MUST`, `MUST NOT`, `REQUIRED`, `SHOULD`, `SHOULD NOT`, `RECOMMENDED`, `MAY`, and
`OPTIONAL` in this document are to be interpreted as described in RFC 2119.

`Implementation-defined` means the behavior is part of the implementation contract, but this
specification does not prescribe one universal policy. Implementations MUST document the selected
behavior.

## Relationship to Parent Specification

The parent specification's §13.5 ("Session Metrics and Token Accounting") defines in-memory
token aggregation against the current snapshot. It does not require any persistent record.

This extension takes the per-turn token data the parent specification already tells the
implementation to extract from agent events, and prescribes a durable on-disk format for it.
Nothing else in the parent specification is altered.

A Symphony implementation MAY conform to the parent specification without conforming to this
extension. An implementation that claims to conform to this extension MUST also conform to the
parent specification.

## 1. Problem Statement

Coding-agent providers emit detailed session transcripts containing every prompt sent and every
response received. These transcripts are vendor-specific, large, ephemeral, and
privacy-sensitive — a typical issue produces 1–2 MB of mixed conversation content and cost-
relevant numbers, with the cost-relevant fraction below 1%. Across a working factory, the
aggregate transcript volume reaches gigabytes, the vast majority of which is conversation
content the operator does not need in order to answer cost questions.

Operators who want to attribute coding-agent cost to issue-tracker work face a choice between:

- Persisting the full transcripts indefinitely — expensive in disk; loaded with conversation
  content the operator may not be permitted or willing to retain.
- Parsing transcripts at query time — slow; couples the cost tooling to vendor-specific
  transcript formats; impossible if transcripts have been rotated by the coding-agent vendor
  or are on a different machine than the cost reader.
- Persisting only the cost-relevant numbers in a stable, vendor-neutral format the operator
  controls.

This extension defines the third option. `usage.jsonl` is the projection of coding-agent
activity that keeps the cost signal and discards the conversation noise. One row per turn,
roughly one kilobyte per row, no prompt or response content, joinable to the issue tracker —
designed so that years of cost history fit in megabytes and can be retained, shipped, or
queried independently of the transcripts the records were derived from.

The questions the format is shaped to answer include:

- "How many tokens did this issue cost — across every attempt, every turn, every bot role?"
- "Which model did the spend land on, and at what wall-clock?"
- "How does cost scale with the issue's story-point estimate?"
- "Which PR revision did each reviewer turn react to, and at what token cost?"

The parent specification's in-memory `codex_totals` aggregate (§13.5) is lost on restart and
does not retain per-turn detail, so it cannot answer any of these questions after the fact.

## 2. Goals and Non-Goals

### 2.1 Goals

- Define a single on-disk stream — `usage.jsonl` — that captures the cost-relevant projection
  of coding-agent activity and nothing else. Conversation content stays in the coding agent's
  transcripts; only the numbers and identifiers that bear on cost land here.
- Make the format vendor-neutral so a single cost reader works across any coding agent a
  conforming Symphony implementation runs.
- Make the format independent of the operator's home directory so cost analysis can run from a
  fresh repository checkout, in CI, or on a separate billing host without access to the
  machine that ran the agent.
- Per-turn granularity so attribution can be sliced by run, attempt, bot role, model, or PR.
- Provenance for token counts (provider-reported, estimated, or unavailable) so consumers do
  not silently mix data sources.
- A stable schema-versioning rule so the format can evolve without breaking old readers.
- Minimum sufficient field set — every REQUIRED field directly contributes to a cost
  computation or to detecting bad data; every OPTIONAL field has a documented use.

### 2.2 Non-Goals

- Other Symphony observability. Run lifecycles, dispatch decisions, PR-watcher state, daemon
  startup events, and concurrency-pool internals are out of scope. A separate operational
  telemetry extension MAY address them.
- A pricing model. This spec defines the inputs to cost calculation; it does not define which
  rate, plan, or normalization to apply.
- Coding-agent transcript formats. Provider session logs (Claude session JSONL, Codex rollouts,
  etc.) are emitted by the coding agent and remain implementation-defined.
- A query surface. Implementations MAY layer SQL, REST, or dashboard views over the file; this
  spec only describes the on-disk contract.
- Transport. Off-host shipping (S3, Kafka, OTLP) is out of scope. Implementations MAY ship to
  additional sinks but MUST also write the canonical on-disk file.
- Retention. Implementations MAY rotate, compress, or delete old files; this spec only requires
  that records written are not modified.

## 3. System Overview

This extension defines a single output surface for the Orchestrator described in the parent
specification's §3.1. It introduces no new control flow and no new external dependencies.

Conceptually:

```
            ┌─────────────────────────────────────────────────────┐
            │                    Orchestrator                     │
            │             (parent spec §3.1 / §13.5)              │
            │                                                     │
            │   per-turn token usage extracted from agent events  │
            └────────────────────────────┬────────────────────────┘
                                         │
                          emits          │   (this extension)
                                         ▼
            ┌─────────────────────────────────────────────────────┐
            │              Cost Telemetry Writer                  │
            │                                                     │
            │              one usage record per turn              │
            └────────────────────────────┬────────────────────────┘
                                         ▼
                    <repo>/.symphony/telemetry/usage.jsonl
```

The implementation MUST emit one usage record per coding-agent turn, regardless of whether the
turn produced tokens. Turns where token data is unavailable are recorded with null token fields
and `usageSource: "unavailable"` so downstream consumers do not silently undercount.

## 4. Storage Conventions

This section defines the on-disk conventions a reader needs to locate and parse records.
Operational concerns — how writers achieve atomicity, when they rotate or compress files, how
they handle disk-full errors — are out of scope (§9).

### 4.1 Canonical Location

Records live in:

```
<symphony-workspace-root>/.symphony/telemetry/usage.jsonl
```

where `<symphony-workspace-root>` is the directory containing the workflow's `WORKFLOW.md`.
Implementations MAY allow operators to override this location and MAY split records across
additional files within the same directory (for example, to keep the active file's size
manageable). When additional files are used, their names MUST match the glob
`usage*.jsonl` or `usage*.jsonl.gz`. Readers MUST treat the concatenation of all matching
files in the canonical directory as one logical stream.

This specification does not prescribe when, why, or how implementations split or compress
files. A reader that reads every matching file will see the complete record set regardless
of how the writer organized them.

### 4.2 Record Encoding (JSONL)

Each record is a single JSON object on its own line:

- One JSON object per line.
- Lines terminated by `\n` (LF).
- UTF-8 without BOM.
- Each record MUST be a JSON object (not an array or scalar).
- Empty lines MUST NOT be emitted; readers MAY tolerate them.
- Keys with `null` values MAY be omitted by the writer; readers MUST treat absent keys as `null`
  unless this specification defines a different default for that field.
- Field ordering within an object is not significant and MUST NOT be relied on.

If a reader encounters a final line without a terminating LF, it MUST treat that line as an
incomplete record and skip it. This is the standard JSONL convention and is the only recovery
behavior this specification defines.

Compressed archives MUST use gzip and MUST end in `.jsonl.gz`. Once uncompressed, the contents
MUST satisfy the rules above.

## 5. The Usage Record

Each record is a JSON object describing exactly one coding-agent turn.

### 5.1 Required Fields

Every record MUST include the following fields. A reader that does not find a required field MAY
treat the record as malformed and report it.

- `schemaVersion` (integer ≥ 1)
  - The contract version under which this record was produced. See §6.

- `recordedAt` (RFC 3339 timestamp, UTC, second precision or better)
  - The wall-clock time the record was written. Not necessarily the time the turn occurred.

- `runID` (string)
  - REQUIRED to be a UUID (RFC 4122). The implementation MAY choose any UUID version.
  - MUST be unique per Symphony run attempt within the implementation's lifetime.
  - All records sharing a `runID` belong to the same run attempt.

- `turn` (integer ≥ 1)
  - 1-based ordinal of the turn within the run attempt. Strictly increasing within a `runID`.

- `issueIdentifier` (string)
  - Human-readable ticket key (e.g. `MT-649`). The unit of work cost is attributed to.

- `provider` (string)
  - The coding-agent provider name. Implementation-defined enum; common values are `claude`,
    `codex`, `gemini`. Readers MUST treat unrecognized providers as opaque.

- `model` (string)
  - The coding-agent model name as reported by the provider. Used as a pricing-table key.

- `botRole` (string enum)
  - One of: `developer`, `reviewer`.
  - Implementations that do not distinguish a reviewer role MUST emit `developer`.

- `inputTokens` (integer or `null`)
- `outputTokens` (integer or `null`)
- `totalTokens` (integer or `null`)
  - The token counts the turn billed against the provider account.
  - When `usageSource` is `unavailable`, these three fields MUST be `null`.
  - When `usageSource` is `provider_reported` and the provider returned zero for a given
    dimension, the field MUST be `0` (not `null`).
  - When `usageSource` is `estimated`, the fields hold the heuristic estimate.

- `usageSource` (string enum)
  - One of:
    - `provider_reported` — counts came directly from the provider's response payload.
    - `estimated` — counts were derived from a heuristic.
    - `unavailable` — neither provider data nor a usable estimate is available.

- `startedAt` (RFC 3339 timestamp)
- `endedAt` (RFC 3339 timestamp)
  - The wall-clock window the turn occupied. Used by wall-clock-pro-rata pricing models and for
    aligning records to external billing windows.

### 5.2 Optional Fields

The following fields provide additional cost-attribution dimensions. Implementations SHOULD emit
them when the underlying value is available; readers MUST tolerate their absence.

- `issueID` (string)
  - The tracker's stable internal identifier for the issue. `issueIdentifier` is sufficient for
    cost attribution; `issueID` is provided for joins to external tracker tooling.

- `pullRequest` (object)
  - Binds the turn to a specific PR revision.
  - REQUIRED sub-fields when present: `repo` (string, format `<owner>/<name>`), `number`
    (positive integer), `headSHA` (lowercase 40-character hex), `url` (string).
  - `headSHA` is the join key that distinguishes turns produced before and after a force-push.

- `mode` (string enum)
  - The run-attempt mode the turn was part of. RESERVED values:
    - `fresh` — a new run attempt with no prior context.
    - `continuation` — a continuation of a prior run attempt.
    - `fix_existing_pr` — a run attempting to address feedback on an open PR.
  - Implementations MAY define additional values; readers MUST treat unrecognized values as
    opaque.

- `effort` (string)
  - The reasoning-effort tier requested for the turn. Implementation-defined; common values
    include `low`, `medium`, `high`, `xhigh`, `max`. Used by cost models that price effort
    tiers differently.

- `exitReason` (string enum)
  - Why the turn terminated. RESERVED values:
    - `turn_completed` — the agent emitted a terminal turn marker.
    - `slept` — the agent completed its turn voluntarily.
    - `worker_failed` — the agent subprocess failed.
    - `timed_out` — the orchestrator timed out the turn.
    - `canceled` — the orchestrator canceled the turn.
    - `suspect_historical` — the record was recovered from a previous instance after restart
      and its exit reason cannot be determined.
  - Implementations MAY define additional values; readers MUST treat unrecognized values as
    opaque. Cost consumers commonly filter on this field to separate successful work from
    failed-attempt overhead.

- `promptBytes` (integer ≥ 0)
  - UTF-8 byte count of the prompt as actually sent to the provider on this turn. Useful for
    estimating cost when `usageSource` is `unavailable`, or for cross-checking provider-reported
    token counts against a UTF-8 heuristic.

- `estimatedTokenMethod` (string)
  - Identifier of the heuristic used when `usageSource` is `estimated`. Reference value:
    `heuristic_utf8_bytes_div_4_ceiling`. Implementation-defined otherwise.

- `estimatedPromptInputTokens` (integer ≥ 0)
  - The heuristic input-token count for the prompt. MAY be emitted even when `usageSource` is
    `provider_reported`; readers MAY use the discrepancy as a quality signal.

- `estimate` (integer ≥ 0)
  - The issue's story-point estimate at dispatch. Allows cost-per-point analysis.

- `workspacePath` (string)
  - Absolute filesystem path of the per-issue workspace at the time the turn ran. Used as the
    join key to coding-agent transcripts emitted outside this specification (e.g. provider
    session logs in `~/.claude/projects/` or `~/.codex/sessions/`). The workspace path is
    typically derived from the parent specification's §9.1.

- `reviewerMode` (string enum)
  - One of: `official`, `preflight`. Present only when `botRole` is `reviewer`. Distinguishes
    the binding review from an experimental pre-review.

- `experimentAssignment` (object)
  - Present when the run is enrolled in a model-policy experiment.
  - REQUIRED sub-fields when present: `experimentID` (string), `variant` (string).

- `configuredWeight` (integer ≥ 0)
- `effectiveWeight` (integer ≥ 0)
  - Concurrency weight values used by the dispatcher. Relevant when a flat-rate provider plan is
    pro-rated across concurrent runs by the cost model.

- `cooldownReason` (string or `null`)
  - Free-form reason for a post-turn cooldown (e.g. rate-limit recovery). Not parsed by readers.

#### 5.2.1 Input-Token Breakdown

The REQUIRED `inputTokens` field is the total billable input the turn consumed. The following
OPTIONAL fields refine that total into provider-reported sub-buckets. They MUST be emitted when
the provider's response carries the breakdown; readers MUST tolerate any subset being absent.

- `inputUncachedTokens` (integer ≥ 0)
  - Subset of `inputTokens` that the provider treated as fresh prompt content (no cache hit, no
    cache write). All conformant providers report this.

- `inputCachedReadTokens` (integer ≥ 0)
  - Subset of `inputTokens` served from a prior cache write. All conformant providers that
    support prompt caching report this.

- `inputCacheWriteTokens` (integer ≥ 0)
  - Subset of `inputTokens` that wrote to a provider-side prompt cache during this turn.
    Providers that bundle cache writes into their cached total (current Codex behavior) MAY
    omit this field.

- `inputCacheWriteEphemeral5mTokens` (integer ≥ 0)
- `inputCacheWriteEphemeral1hTokens` (integer ≥ 0)
  - Anthropic-only sub-buckets of `inputCacheWriteTokens` distinguishing the 5-minute and
    1-hour ephemeral cache tiers (`cache_creation.ephemeral_5m_input_tokens`,
    `cache_creation.ephemeral_1h_input_tokens` in the Anthropic API). Providers that do not
    distinguish ephemeral tiers MUST omit both fields.

#### 5.2.2 Output-Token Breakdown

- `outputVisibleTokens` (integer ≥ 0)
  - Subset of `outputTokens` returned to the caller as visible response content.

- `outputReasoningTokens` (integer ≥ 0)
  - Subset of `outputTokens` consumed by hidden reasoning (OpenAI o-series-style
    `reasoning_output_tokens`). Providers that do not separately bill reasoning tokens MUST
    omit this field.

#### 5.2.3 Quota Sample

- `quota` (object)
  - A point-in-time sample of the provider's rate-limit state at the end of this turn. Useful
    for plan-based cost models where the marginal cost of a turn is "what fraction of your
    quota window did it move?" rather than a dollar figure.
  - Implementations MUST emit `quota` when the provider's response includes a rate-limit
    payload, and MUST omit it otherwise.
  - REQUIRED sub-fields when present:
    - `planType` (string) — provider plan identifier (e.g. `pro`, `business`, `enterprise`).
    - `windows` (array of objects, length ≥ 1) — one entry per rate-limit window the provider
      tracks. Each window object has:
      - `label` (string) — provider-specific window label. RESERVED values: `primary`,
        `secondary`. Implementations MAY define additional labels (e.g. `monthly`); readers
        MUST treat unrecognized labels as opaque.
      - `windowMinutes` (integer ≥ 0) — width of the window in minutes.
      - `usedPercent` (number, 0 ≤ x ≤ 100) — percentage consumed at sample time.
  - OPTIONAL sub-fields:
    - `resetsAt` (integer Unix epoch seconds) — moment at which the window's `usedPercent`
      returns to zero. Producers that cannot derive this MAY omit it.

### 5.3 Field Semantics

- The triple `(inputTokens, outputTokens, totalTokens)` MUST be internally consistent when all
  three are non-null: `totalTokens == inputTokens + outputTokens` SHOULD hold, with deviations
  allowed only when the provider's reported total differs from the component sum (in which case
  the provider-reported total MUST be preserved as-is).
- When the §5.2.1 input breakdown fields are present, their sum SHOULD equal `inputTokens`. The
  same SHOULD relation holds between `inputCacheWriteEphemeral5mTokens` +
  `inputCacheWriteEphemeral1hTokens` and `inputCacheWriteTokens`.
- When the §5.2.2 output breakdown fields are both present, their sum SHOULD equal
  `outputTokens`.
- `recordedAt - endedAt` SHOULD be small (under one second in normal operation) so consumers can
  treat `endedAt` as both the event time and the wall-clock end of the turn.
- `startedAt ≤ endedAt` MUST hold.

## 6. Schema Versioning

### 6.1 Field Semantics

`schemaVersion` is an integer ≥ 1 that identifies the contract version under which a record
was produced. It pertains only to the `usage.jsonl` stream defined in this specification.

### 6.2 When to Bump

An implementation MUST bump `schemaVersion` when any of the following changes:

- A REQUIRED field is removed.
- A REQUIRED field is renamed.
- A REQUIRED field's type or value semantics change in a way that would mislead a reader written
  against the prior version.
- A REQUIRED field's enum loses a previously-defined value.

### 6.3 When Not to Bump

An implementation MUST NOT bump `schemaVersion` when:

- A new OPTIONAL field is added.
- An enum gains a new value (readers treat unknown values as opaque).
- An OPTIONAL field's semantics are clarified without changing observed values.

### 6.4 Reader Compatibility

Readers conforming to this specification MUST:

- Parse `schemaVersion` first and dispatch to a version-appropriate decoder.
- Treat unknown top-level fields as opaque.
- Treat unknown enum values as opaque.
- Tolerate records where OPTIONAL fields are absent.
- Reject records whose `schemaVersion` exceeds the highest version the reader was built for, OR
  attempt best-effort parsing while clearly flagging the version mismatch to the operator.

Readers MUST NOT silently coerce records produced under a newer `schemaVersion` into the
reader's lower-version semantics.

## 7. Joining to Other Telemetry

This specification deliberately does not standardize the rest of Symphony's observability. Cost
readers that wish to enrich their attribution with operational signals MAY join on the following
keys, which are emitted under the same names by both this extension and by the parent
specification's in-memory state and log surfaces:

- `runID` — joins a usage record to the Symphony run attempt that produced it. The orchestrator
  carries the same `runID` in its in-memory state (per the parent specification's §4.1.5 Run
  Attempt entity) and in its structured logs.
- `pullRequest.number` together with `pullRequest.headSHA` — joins a turn to a specific PR
  revision. Useful for binding reviewer-bot cost to specific review outcomes.
- `workspacePath` — joins a turn to the coding-agent transcript directory the agent wrote to.
  The transcript format is provider-defined and out of scope here.

Implementations that emit additional operational telemetry SHOULD reuse the field names above
so that cost readers can join without translation.

## 8. Record Content Constraints

This specification defines what records look like, not how writers produce them. The only
content rules — independent of how a writer is implemented — are:

A `usage.jsonl` record MUST NOT contain:

- Provider API keys.
- Tracker API keys.
- Any value resolved from `$VAR_NAME` indirection in the parent specification's configuration
  layer.
- The textual contents of the coding-agent prompt or response. Only token counts and byte
  counts are recorded.

The fields defined in §5 (issue identifier, model name, PR coordinates, workspace path) are
considered low-sensitivity in a typical operator's threat model. Operators whose threat model
differs are responsible for any redaction before records land on disk; this specification
does not prescribe a redaction mechanism.

## 9. Out of Scope

The following are explicitly out of scope. Future extensions MAY address them.

- **Writer behavior.** How records are produced — write atomicity, file rotation, compression,
  retention, concurrent-writer coordination, failure handling, operator-visible health signals
  — is not constrained by this specification. Implementations are free to choose any approach
  as long as the on-disk result satisfies §4 and §5.
- **Pricing models.** This specification defines inputs to cost calculation; it does not
  prescribe a rate table, subscription pro-rata formula, plan-quota burn model, or wall-clock
  attribution rule.
- **Other Symphony observability.** Run-attempt lifecycle events, dispatch-decision provenance,
  PR-watcher state machines, daemon lifecycle, and concurrency-pool internals are out of scope.
  A separate operational-telemetry extension MAY define them.
- **Transport.** Off-host shipping (S3, Kafka, OpenTelemetry collectors) is unspecified.
- **Query surface.** SQL engines, REST APIs, dashboards, and exporters are unspecified.
- **Export formats.** Columnar formats (Parquet, Arrow), binary formats, and other non-JSONL
  exports are unspecified.
- **Coding-agent transcripts.** The format and storage of provider session logs is defined by
  the coding agent and remains implementation-defined. This extension only requires that
  `workspacePath` is preserved when emitted, so external tooling can correlate.

## 10. Conformance

### 10.1 Conformance Statement

An implementation conforms to this specification if the records it produces, when concatenated
across all `usage*.jsonl` and `usage*.jsonl.gz` files in the canonical directory (§4.1):

- Satisfy the JSONL encoding rules of §4.2.
- Contain every REQUIRED field of §5.1.
- Include exactly one record per coding-agent turn.
- Follow the schema-versioning rule of §6.
- Satisfy the content constraints of §8.

### 10.2 Validation Procedure

A reader claiming conformance with this specification MUST be able to:

- Parse every record in the logical stream (every matching file in the canonical directory)
  without losing data, excluding fields explicitly flagged as opaque or implementation-defined.
- Detect and report records that violate the field requirements of §5.
- Detect schemaVersion mismatches per §6.4.

### 10.3 Reference Test Vectors

Implementations and readers SHOULD validate against a shared corpus of reference test vectors.
This specification does not currently publish such a corpus. A future revision SHOULD do so.

## 11. Change Log

| Version | Date       | Changes                                                  |
|---------|------------|----------------------------------------------------------|
| 0.1     | 2026-05-27 | Initial draft. Defines `usage.jsonl` schema and storage. |
