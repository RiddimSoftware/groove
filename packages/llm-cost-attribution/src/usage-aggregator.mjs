/**
 * Aggregate spec-compliant usage records into the same shape `rollupSessions`
 * produces from raw transcripts. Keeps the CLI output identical regardless
 * of which source the cost data came from.
 *
 * The usage.jsonl spec is intentionally narrower than what the CLI
 * transcripts carry:
 *   - There is no per-bucket breakdown of input tokens (no cache 5m / 1h
 *     split, no reasoning-vs-visible output split). We surface the totals
 *     in `inputUncached` / `outputVisible` and leave the other buckets at
 *     zero.
 *   - There are no rate_limits / quota samples. Quota tracking requires the
 *     raw transcript.
 *
 * Operators who care about cache-tier splits or quota should keep the
 * transcripts; those who only care about token totals can safely delete
 * transcripts after backfilling to usage.jsonl.
 */
import { emptyProviderTotals } from './aggregator.mjs';

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
    // Per the spec, usage records carry input/output totals; we record them
    // as if they were entirely "uncached"/"visible" since the spec doesn't
    // preserve the bucket split. The grand total is what matters.
    totals.tokens.inputUncached += rec.inputTokens ?? 0;
    totals.tokens.outputVisible += rec.outputTokens ?? 0;
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
