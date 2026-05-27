/**
 * Convert ParsedSession objects (from src/transcripts/*.mjs) into spec-
 * compliant usage.jsonl records.
 *
 * Emits every REQUIRED field in spec §5.1 plus the OPTIONAL provider-
 * specific fields the transcript surface gives us:
 *   §5.2.1 input-token breakdown (uncached / cached / cache-write tiers)
 *   §5.2.2 output-token breakdown (visible / reasoning)
 *   §5.2.3 quota object (built from Codex rate_limits samples, when present)
 *   workspacePath
 *
 * Spec-optional fields the CLI transcript doesn't carry (`estimate`,
 * `pullRequest`, `effort`, `exitReason`, ...) are left out.
 *
 * `botRole` is hardcoded to `developer` per spec §5.1: "Implementations
 * that do not distinguish a reviewer role MUST emit `developer`."
 */
import { quotaSampleToSpecObject } from './quota.mjs';
import { SCHEMA_VERSION } from './usage-jsonl.mjs';

export { quotaSampleToSpecObject } from './quota.mjs';

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

    // §5.2.1 input-token breakdown — both Claude and Codex report uncached + cached;
    // Claude additionally reports cache-creation tokens split by ephemeral tier;
    // Codex bundles writes into the cached total.
    record.inputUncachedTokens = turn.tokens.inputUncached;
    record.inputCachedReadTokens = turn.tokens.inputCached;
    if (session.provider === 'claude') {
      const writeTotal = turn.tokens.cacheCreate5m + turn.tokens.cacheCreate1h;
      if (writeTotal > 0) {
        record.inputCacheWriteTokens = writeTotal;
        if (turn.tokens.cacheCreate5m > 0) record.inputCacheWriteEphemeral5mTokens = turn.tokens.cacheCreate5m;
        if (turn.tokens.cacheCreate1h > 0) record.inputCacheWriteEphemeral1hTokens = turn.tokens.cacheCreate1h;
      }
    }

    // §5.2.2 output-token breakdown. Codex always reports
    // reasoning_output_tokens (even when zero), so we emit it unconditionally
    // for Codex — its presence is itself a provider signal.
    record.outputVisibleTokens = turn.tokens.outputVisible;
    if (session.provider === 'codex') {
      record.outputReasoningTokens = turn.tokens.outputReasoning;
    }

    // §5.2.3 quota — Codex emits a rate_limits payload per token_count event.
    // The per-turn `quota` is the point-in-time sample at the end of the turn;
    // we use the last sample whose timestamp is ≤ this turn's endedAt.
    const sample = lastQuotaSampleAtOrBefore(session.quotaSamples, endedAt);
    if (sample !== null) {
      const quota = quotaSampleToSpecObject(sample);
      if (quota !== null) record.quota = quota;
    }

    out.push(record);
  }

  return out;
}

function lastQuotaSampleAtOrBefore(samples, ts) {
  if (samples.length === 0) return null;
  let best = null;
  for (const s of samples) {
    if (s.timestamp <= ts && (best === null || s.timestamp > best.timestamp)) best = s;
  }
  return best ?? samples[0];
}
