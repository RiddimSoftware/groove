/**
 * Convert ParsedSession objects (from src/transcripts/*.mjs) into spec-
 * compliant usage.jsonl records.
 *
 * The CLI-transcript surface gives us every REQUIRED field in spec §5.1
 * except `botRole`, which the spec instructs implementations that don't
 * distinguish reviewer roles to emit as `"developer"`. Optional fields
 * `workspacePath` and `mode` are populated when available; everything else
 * spec-optional (`estimate`, `pullRequest`, `effort`, `exitReason`, ...) is
 * left out because the CLI transcript doesn't carry it.
 */
import { SCHEMA_VERSION } from './usage-jsonl.mjs';

/**
 * @param {import('./types').ParsedSession} session
 * @param {string} issueIdentifier
 * @param {object} [opts]
 * @param {string} [opts.recordedAt]  Override the recordedAt timestamp (default: now).
 */
export function sessionToUsageRecords(session, issueIdentifier, opts = {}) {
  const recordedAt = opts.recordedAt ?? new Date().toISOString();
  const out = [];

  // Sort turns by index so the per-record `turn` ordinal is monotonic.
  const turns = [...session.turns].sort((a, b) => a.turnIdx - b.turnIdx);

  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i];
    const next = turns[i + 1];

    // The CLI transcript only records ONE timestamp per turn. We use it as
    // both startedAt and as the endedAt of the previous turn. For the LAST
    // turn we have no successor, so endedAt == startedAt.
    const startedAt = turn.timestamp || recordedAt;
    const endedAt = next?.timestamp ?? startedAt;

    // Spec totals: claude sums every input bucket + visible output; codex
    // sums uncached + cached + visible + reasoning output. Both end up as
    // (inputTokens + outputTokens) per spec §5.3.
    const inputTokens = turn.tokens.inputUncached + turn.tokens.inputCached +
                        turn.tokens.cacheCreate5m + turn.tokens.cacheCreate1h;
    const outputTokens = turn.tokens.outputVisible + turn.tokens.outputReasoning;
    const totalTokens = inputTokens + outputTokens;

    const record = {
      schemaVersion: SCHEMA_VERSION,
      recordedAt,
      runID: session.sessionId,
      turn: i + 1, // spec §5.1: 1-based, strictly increasing within runID
      issueIdentifier,
      provider: session.provider,
      model: turn.model ?? '',
      botRole: 'developer',
      inputTokens,
      outputTokens,
      totalTokens,
      usageSource: 'provider_reported',
      startedAt,
      endedAt,
    };

    // OPTIONAL §5.2 — populate when the transcript gives us the value.
    if (session.cwd !== '') {
      record.workspacePath = session.cwd;
    }

    out.push(record);
  }

  return out;
}
