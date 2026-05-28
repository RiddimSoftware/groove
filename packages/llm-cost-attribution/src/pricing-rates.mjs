/**
 * Per-model API pricing for Anthropic and OpenAI, expressed as USD per
 * million tokens for each bucket the cost-telemetry spec breaks input
 * tokens into (uncached / cache read / cache write 5m / cache write 1h)
 * plus the single output rate.
 *
 * Rates are *list* prices from the respective providers' public pricing
 * pages on `verifiedOn`. They DO NOT reflect:
 *   - Subscription plans (Claude Max, Codex Pro, etc.) — those are flat-rate
 *     and have no per-token component. API-equivalent dollars from this
 *     table are a *counterfactual*: what a token volume would have cost on
 *     pay-as-you-go API.
 *   - Volume discounts, enterprise rates, batch API discounts.
 *   - Provider promotional pricing or beta-tier rates.
 *
 * Update when providers change pricing. The CLI warns if a table entry's
 * verifiedOn is more than STALE_AFTER_DAYS old.
 */

export const STALE_AFTER_DAYS = 90;
const VERIFIED_ON = '2026-05-22';

/**
 * @typedef {object} PricingEntry
 * @property {'anthropic'|'openai'} provider
 * @property {string} model                       Canonical model name as it appears in the table.
 * @property {number} inputPerMillionUsd          USD per 1M uncached input tokens.
 * @property {number|null} cachedInputPerMillionUsd  USD per 1M cache-read input tokens (null = provider doesn't price separately).
 * @property {number|null} cacheWrite5mPerMillionUsd USD per 1M tokens written to the 5-minute ephemeral cache (Anthropic only).
 * @property {number|null} cacheWrite1hPerMillionUsd USD per 1M tokens written to the 1-hour ephemeral cache (Anthropic only).
 * @property {number} outputPerMillionUsd         USD per 1M output tokens (reasoning + visible both billed at this rate).
 * @property {string} verifiedOn                  ISO date string when the rate was checked against the source URL.
 * @property {string} sourceUrl                   Provider's public pricing page.
 * @property {string} [notes]
 */

/** @type {readonly PricingEntry[]} */
export const PRICING_TABLE = Object.freeze([
  // ── Anthropic — https://www.anthropic.com/pricing ─────────────────────
  {
    provider: 'anthropic', model: 'claude-opus-4.7',
    inputPerMillionUsd: 5, cachedInputPerMillionUsd: 0.5,
    cacheWrite5mPerMillionUsd: 6.25, cacheWrite1hPerMillionUsd: null,
    outputPerMillionUsd: 25,
    verifiedOn: VERIFIED_ON, sourceUrl: 'https://www.anthropic.com/pricing',
  },
  {
    provider: 'anthropic', model: 'claude-sonnet-4.6',
    inputPerMillionUsd: 3, cachedInputPerMillionUsd: 0.3,
    cacheWrite5mPerMillionUsd: 3.75, cacheWrite1hPerMillionUsd: null,
    outputPerMillionUsd: 15,
    verifiedOn: VERIFIED_ON, sourceUrl: 'https://www.anthropic.com/pricing',
  },
  {
    provider: 'anthropic', model: 'claude-haiku-4.5',
    inputPerMillionUsd: 1, cachedInputPerMillionUsd: 0.1,
    cacheWrite5mPerMillionUsd: 1.25, cacheWrite1hPerMillionUsd: null,
    outputPerMillionUsd: 5,
    verifiedOn: VERIFIED_ON, sourceUrl: 'https://www.anthropic.com/pricing',
  },
  {
    provider: 'anthropic', model: 'claude-sonnet-4.5',
    inputPerMillionUsd: 3, cachedInputPerMillionUsd: 0.3,
    cacheWrite5mPerMillionUsd: 3.75, cacheWrite1hPerMillionUsd: null,
    outputPerMillionUsd: 15,
    verifiedOn: VERIFIED_ON, sourceUrl: 'https://www.anthropic.com/pricing',
  },
  {
    provider: 'anthropic', model: 'claude-opus-4.6',
    inputPerMillionUsd: 5, cachedInputPerMillionUsd: 0.5,
    cacheWrite5mPerMillionUsd: 6.25, cacheWrite1hPerMillionUsd: null,
    outputPerMillionUsd: 25,
    verifiedOn: VERIFIED_ON, sourceUrl: 'https://www.anthropic.com/pricing',
  },
  {
    provider: 'anthropic', model: 'claude-opus-4.5',
    inputPerMillionUsd: 5, cachedInputPerMillionUsd: 0.5,
    cacheWrite5mPerMillionUsd: 6.25, cacheWrite1hPerMillionUsd: null,
    outputPerMillionUsd: 25,
    verifiedOn: VERIFIED_ON, sourceUrl: 'https://www.anthropic.com/pricing',
  },
  {
    provider: 'anthropic', model: 'claude-opus-4.1',
    inputPerMillionUsd: 15, cachedInputPerMillionUsd: 1.5,
    cacheWrite5mPerMillionUsd: 18.75, cacheWrite1hPerMillionUsd: null,
    outputPerMillionUsd: 75,
    verifiedOn: VERIFIED_ON, sourceUrl: 'https://www.anthropic.com/pricing',
  },
  {
    provider: 'anthropic', model: 'claude-sonnet-4',
    inputPerMillionUsd: 3, cachedInputPerMillionUsd: 0.3,
    cacheWrite5mPerMillionUsd: 3.75, cacheWrite1hPerMillionUsd: null,
    outputPerMillionUsd: 15,
    verifiedOn: VERIFIED_ON, sourceUrl: 'https://www.anthropic.com/pricing',
  },
  {
    provider: 'anthropic', model: 'claude-opus-4',
    inputPerMillionUsd: 15, cachedInputPerMillionUsd: 1.5,
    cacheWrite5mPerMillionUsd: 18.75, cacheWrite1hPerMillionUsd: null,
    outputPerMillionUsd: 75,
    verifiedOn: VERIFIED_ON, sourceUrl: 'https://www.anthropic.com/pricing',
  },

  // ── OpenAI — https://platform.openai.com/docs/pricing ─────────────────
  {
    provider: 'openai', model: 'gpt-5.5',
    inputPerMillionUsd: 5, cachedInputPerMillionUsd: 0.5,
    cacheWrite5mPerMillionUsd: null, cacheWrite1hPerMillionUsd: null,
    outputPerMillionUsd: 30,
    verifiedOn: VERIFIED_ON, sourceUrl: 'https://platform.openai.com/docs/pricing',
  },
  {
    provider: 'openai', model: 'gpt-5.4',
    inputPerMillionUsd: 2.5, cachedInputPerMillionUsd: 0.25,
    cacheWrite5mPerMillionUsd: null, cacheWrite1hPerMillionUsd: null,
    outputPerMillionUsd: 15,
    verifiedOn: VERIFIED_ON, sourceUrl: 'https://platform.openai.com/docs/pricing',
  },
  {
    provider: 'openai', model: 'gpt-5.4-mini',
    inputPerMillionUsd: 0.75, cachedInputPerMillionUsd: 0.075,
    cacheWrite5mPerMillionUsd: null, cacheWrite1hPerMillionUsd: null,
    outputPerMillionUsd: 4.5,
    verifiedOn: VERIFIED_ON, sourceUrl: 'https://platform.openai.com/docs/pricing',
  },
  {
    provider: 'openai', model: 'gpt-5.4-nano',
    inputPerMillionUsd: 0.2, cachedInputPerMillionUsd: 0.02,
    cacheWrite5mPerMillionUsd: null, cacheWrite1hPerMillionUsd: null,
    outputPerMillionUsd: 1.25,
    verifiedOn: VERIFIED_ON, sourceUrl: 'https://platform.openai.com/docs/pricing',
  },
  {
    provider: 'openai', model: 'gpt-5.3-codex',
    inputPerMillionUsd: 1.75, cachedInputPerMillionUsd: 0.175,
    cacheWrite5mPerMillionUsd: null, cacheWrite1hPerMillionUsd: null,
    outputPerMillionUsd: 14,
    verifiedOn: VERIFIED_ON, sourceUrl: 'https://platform.openai.com/docs/pricing',
  },
]);
