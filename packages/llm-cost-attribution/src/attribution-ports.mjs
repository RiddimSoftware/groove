/**
 * Named port contracts for the attribution workflows.
 *
 * These are the seams the port-based core (`attribution-workflow.mjs`) depends
 * on. They are defined as JSDoc `@typedef`s — there is no runtime code here —
 * so both the core workflows and the real adapters can reference one canonical
 * shape via `import('./attribution-ports.mjs').SessionSource` and friends.
 *
 * The boundary rule (enforced by `scripts/check-boundary.mjs`) keeps the core
 * depending only on these ports and on in-memory value shapes; the concrete
 * Claude/Codex transcript readers, usage-JSONL reader/writer, and CLI live
 * outward in adapter modules.
 *
 * ── Value shapes ──────────────────────────────────────────────────────────
 *
 * @typedef {{
 *   inputUncached: number,
 *   inputCached: number,
 *   cacheCreate5m: number,
 *   cacheCreate1h: number,
 *   outputVisible: number,
 *   outputReasoning: number,
 * }} TokenBuckets
 *
 * @typedef {{
 *   provider: 'claude' | 'codex',
 *   sessionId: string,
 *   turnIdx: number,
 *   timestamp: string,
 *   model: string | undefined,
 *   cwd: string,
 *   tokens: TokenBuckets,
 *   webSearchRequests: number,
 *   webFetchRequests: number,
 * }} ParsedTurn
 *
 * @typedef {{
 *   provider: 'claude' | 'codex',
 *   timestamp: string,
 *   planType: string | null,
 *   windows: Array<{ label: string, windowMinutes: number, usedPercent: number, resetsAt?: number }>,
 * }} QuotaSample
 *
 * A `ParsedSession` is the in-memory shape every `SessionSource` yields,
 * regardless of where it came from. It is the same shape the Claude/Codex
 * transcript readers produce.
 *
 * @typedef {{
 *   provider: 'claude' | 'codex',
 *   sessionId: string,
 *   cwd: string,
 *   sourceFile: string,
 *   turns: ParsedTurn[],
 *   quotaSamples: QuotaSample[],
 * }} ParsedSession
 *
 * A `UsageRecord` is one spec §5.1 usage.jsonl line as a plain object. Only
 * the REQUIRED fields are enumerated here; OPTIONAL §5.2 breakdown/quota
 * fields ride along untyped.
 *
 * @typedef {{
 *   schemaVersion: number,
 *   recordedAt: string,
 *   runID: string,
 *   turn: number,
 *   issueIdentifier: string,
 *   provider: string,
 *   model: string,
 *   botRole: 'developer' | 'reviewer',
 *   inputTokens: number | null,
 *   outputTokens: number | null,
 *   totalTokens: number | null,
 *   usageSource: 'provider_reported' | 'estimated' | 'unavailable',
 *   startedAt: string,
 *   endedAt: string,
 *   [key: string]: unknown,
 * }} UsageRecord
 *
 * @typedef {{
 *   issueIdentifier: string,
 *   providerTotals: object,
 *   combinedTokens: number,
 *   combinedTurns: number,
 *   combinedSessions: number,
 * }} IssueRollup
 *
 * @typedef {{
 *   recordsWritten: number,
 *   sessionsProcessed: number,
 *   sessionsSkipped: number,
 * }} UsageBackfillSummary
 *
 * ── Ports ─────────────────────────────────────────────────────────────────
 *
 * `SessionSource` yields already-parsed sessions. Callers decide where they
 * come from (Claude/Codex transcripts, an in-memory array, a test fixture);
 * the core only consumes the stream.
 *
 * @typedef {{ listSessions: () => AsyncIterable<ParsedSession> }} SessionSource
 *
 * `IssueMatcher` decides which issue (and which worktree) a session belongs
 * to. `issueIdentifierForSession` returns `null` for sessions that don't map
 * to any issue the caller understands.
 *
 * @typedef {{
 *   issueIdentifierForSession: (session: ParsedSession) => string | null,
 *   worktreePathForSession: (session: ParsedSession) => string,
 * }} IssueMatcher
 *
 * `UsageRecordSource` yields previously-recorded usage.jsonl records. Callers
 * decide whether those come from a file, a directory, or memory.
 *
 * @typedef {{ readUsageRecords: () => AsyncIterable<UsageRecord> }} UsageRecordSource
 *
 * `UsageRecordSink` receives derived usage records in batches. Callers decide
 * whether to append them to a file, buffer them, or forward them downstream.
 *
 * @typedef {{ writeUsageRecords: (records: UsageRecord[]) => Promise<void> | void }} UsageRecordSink
 */

export {};
