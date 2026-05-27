/**
 * Aggregate spec-compliant usage records into the same shape `rollupSessions`
 * produces from raw transcripts. Keeps the CLI output identical regardless
 * of which source the cost data came from.
 *
 * As of spec v1 with the §5.2.{1,2,3} additions, every signal the
 * transcript carried is preserved on backfill:
 *   - input/output token breakdowns
 *   - Claude cache-tier split (ephemeral 5m vs 1h)
 *   - Codex reasoning-vs-visible output split
 *   - Codex per-window quota samples (`quota` object per record)
 *
 * When reading records produced by a writer that did NOT emit the OPTIONAL
 * breakdown fields, this aggregator falls back to crediting the entire
 * `inputTokens` to `inputUncached` and `outputTokens` to `outputVisible`.
 * Grand totals are correct either way.
 */
import { emptyProviderTotals } from './aggregator.mjs';

function numOr0(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

/**
 * @param {string} issueIdentifier
 * @param {Iterable<object>} records
 */
export function rollupUsageRecords(issueIdentifier, records) {
  const providerTotals = {
    claude: emptyProviderTotals(),
    codex: emptyProviderTotals(),
  };
  const modelSets = { claude: new Set(), codex: new Set() };
  const sessionsSeen = { claude: new Set(), codex: new Set() };

  for (const rec of records) {
    if (rec.issueIdentifier !== issueIdentifier) continue;
    if (rec.provider !== 'claude' && rec.provider !== 'codex') continue;
    if (rec.usageSource === 'unavailable') continue;

    const totals = providerTotals[rec.provider];
    totals.turnCount += 1;

    // Prefer the §5.2.1 breakdown fields when present; fall back to the
    // REQUIRED inputTokens total when not.
    const hasInputBreakdown =
      typeof rec.inputUncachedTokens === 'number' ||
      typeof rec.inputCachedReadTokens === 'number' ||
      typeof rec.inputCacheWriteTokens === 'number';
    if (hasInputBreakdown) {
      totals.tokens.inputUncached += numOr0(rec.inputUncachedTokens);
      totals.tokens.inputCached += numOr0(rec.inputCachedReadTokens);
      totals.tokens.cacheCreate5m += numOr0(rec.inputCacheWriteEphemeral5mTokens);
      totals.tokens.cacheCreate1h += numOr0(rec.inputCacheWriteEphemeral1hTokens);
      // If a writer emitted inputCacheWriteTokens but didn't split by tier
      // (a non-Anthropic provider with a single cache tier, say), credit
      // the unattributed write tokens to inputUncached so the grand total
      // still matches.
      const splitTotal = numOr0(rec.inputCacheWriteEphemeral5mTokens) + numOr0(rec.inputCacheWriteEphemeral1hTokens);
      const writeTotal = numOr0(rec.inputCacheWriteTokens);
      if (writeTotal > splitTotal) totals.tokens.inputUncached += (writeTotal - splitTotal);
    } else {
      totals.tokens.inputUncached += rec.inputTokens ?? 0;
    }

    // §5.2.2 output breakdown.
    const hasOutputBreakdown =
      typeof rec.outputVisibleTokens === 'number' || typeof rec.outputReasoningTokens === 'number';
    if (hasOutputBreakdown) {
      totals.tokens.outputVisible += numOr0(rec.outputVisibleTokens);
      totals.tokens.outputReasoning += numOr0(rec.outputReasoningTokens);
    } else {
      totals.tokens.outputVisible += rec.outputTokens ?? 0;
    }

    // §5.2.3 quota — propagate the full per-turn sample if present.
    if (rec.quota !== undefined && rec.quota !== null && typeof rec.quota === 'object' && Array.isArray(rec.quota.windows)) {
      totals.quotaSamples.push({
        provider: rec.provider,
        timestamp: typeof rec.endedAt === 'string' ? rec.endedAt : '',
        planType: typeof rec.quota.planType === 'string' ? rec.quota.planType : null,
        windows: rec.quota.windows,
      });
    }

    if (typeof rec.model === 'string' && rec.model !== '') modelSets[rec.provider].add(rec.model);
    if (typeof rec.runID === 'string' && rec.runID !== '') sessionsSeen[rec.provider].add(rec.runID);
    const startedAt = typeof rec.startedAt === 'string' ? rec.startedAt : null;
    const endedAt = typeof rec.endedAt === 'string' ? rec.endedAt : null;
    if (startedAt !== null && (totals.firstTimestamp === null || startedAt < totals.firstTimestamp)) {
      totals.firstTimestamp = startedAt;
    }
    if (endedAt !== null && (totals.lastTimestamp === null || endedAt > totals.lastTimestamp)) {
      totals.lastTimestamp = endedAt;
    }
  }

  for (const provider of ['claude', 'codex']) {
    const t = providerTotals[provider];
    t.sessionCount = sessionsSeen[provider].size;
    t.tokensGrandTotal =
      t.tokens.inputUncached + t.tokens.inputCached + t.tokens.cacheCreate5m +
      t.tokens.cacheCreate1h + t.tokens.outputVisible + t.tokens.outputReasoning;
    t.models = [...modelSets[provider]].sort();
  }

  return {
    issueIdentifier,
    providerTotals,
    combinedTokens: providerTotals.claude.tokensGrandTotal + providerTotals.codex.tokensGrandTotal,
    combinedTurns: providerTotals.claude.turnCount + providerTotals.codex.turnCount,
    combinedSessions: providerTotals.claude.sessionCount + providerTotals.codex.sessionCount,
  };
}
