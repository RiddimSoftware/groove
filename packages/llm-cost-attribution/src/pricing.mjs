/**
 * Per-model rate lookup + cost calculation.
 *
 * Costs are USD computed from list API rates. They are a *counterfactual*
 * for users on flat-rate subscription plans (Claude Max, Codex Pro): the
 * dollar number is what the same token volume would have cost on
 * pay-as-you-go API, not the marginal cost of running it on a subscription.
 */
import { PRICING_TABLE, STALE_AFTER_DAYS } from './pricing-rates.mjs';

const RATES_BY_NAME = buildRatesMap(PRICING_TABLE);

function buildRatesMap(entries) {
  const map = new Map();
  for (const entry of entries) map.set(entry.model, entry);
  return map;
}

/**
 * Canonical name lookup. Strips Anthropic's `-YYYYMMDD` date suffix and
 * `-latest`, and rewrites hyphenated decimals back to dotted form (the
 * Claude transcript emits `claude-sonnet-4-6` for the model the rate
 * table calls `claude-sonnet-4.6`).
 */
export function normalizeModelName(model) {
  if (typeof model !== 'string') return '';
  let s = model.replace(/-\d{8}$/, '').replace(/-latest$/, '');
  s = s.replace(/(\d)-(\d)/g, '$1.$2');
  return s;
}

/**
 * Look up rates for a model name. Returns `null` if not in the table.
 */
export function ratesForModel(model) {
  if (typeof model !== 'string' || model === '') return null;
  return RATES_BY_NAME.get(model) ?? RATES_BY_NAME.get(normalizeModelName(model)) ?? null;
}

/**
 * Compute API-equivalent cost from a TokenBuckets-shaped object.
 *
 * Returns:
 *   {
 *     model,
 *     rates,                  the PricingEntry used
 *     buckets: [              one entry per non-zero bucket, in display order
 *       { label, tokens, ratePerMillion, costUsd, note? },
 *       ...
 *     ],
 *     totalUsd,               sum of buckets[i].costUsd
 *   }
 *
 * Returns `null` if no rates known for the model. Buckets with zero
 * tokens are omitted. Buckets whose provider doesn't price them
 * separately (e.g. Anthropic cache writes for an OpenAI model) are
 * folded into `inputUncached` so the grand total still matches.
 *
 * @param {string} model
 * @param {object} buckets   TokenBuckets shape (inputUncached, inputCached,
 *                           cacheCreate5m, cacheCreate1h, outputVisible,
 *                           outputReasoning).
 */
export function calculateCost(model, buckets) {
  const rates = ratesForModel(model);
  if (rates === null) return null;

  const rows = [];

  // Input — uncached. Cache writes that the provider doesn't price
  // separately get rolled into here too.
  let inputUncached = numOrZero(buckets.inputUncached);
  if (rates.cacheWrite5mPerMillionUsd === null) {
    inputUncached += numOrZero(buckets.cacheCreate5m);
  }
  if (rates.cacheWrite1hPerMillionUsd === null) {
    inputUncached += numOrZero(buckets.cacheCreate1h);
  }
  pushIfNonZero(rows, 'input uncached', inputUncached, rates.inputPerMillionUsd);

  // Input — cache read.
  if (rates.cachedInputPerMillionUsd !== null) {
    pushIfNonZero(rows, 'cache read', numOrZero(buckets.inputCached), rates.cachedInputPerMillionUsd);
  } else {
    // Provider doesn't price cache reads separately — treat them as uncached
    // input. Add to the input-uncached row we already emitted (if any) or
    // create one. Simpler: just emit a separate row at the input rate.
    pushIfNonZero(rows, 'cache read', numOrZero(buckets.inputCached), rates.inputPerMillionUsd);
  }

  // Cache writes — only when the provider prices them separately.
  if (rates.cacheWrite5mPerMillionUsd !== null) {
    pushIfNonZero(rows, 'cache write 5m', numOrZero(buckets.cacheCreate5m), rates.cacheWrite5mPerMillionUsd);
  }
  if (rates.cacheWrite1hPerMillionUsd !== null) {
    pushIfNonZero(rows, 'cache write 1h', numOrZero(buckets.cacheCreate1h), rates.cacheWrite1hPerMillionUsd);
  }

  // Output — visible and reasoning are billed at the same rate; show them
  // as separate rows so the science-fair viewer sees the split.
  pushIfNonZero(rows, 'output (visible)', numOrZero(buckets.outputVisible), rates.outputPerMillionUsd);
  pushIfNonZero(rows, 'output (reasoning)', numOrZero(buckets.outputReasoning), rates.outputPerMillionUsd);

  const totalUsd = rows.reduce((s, r) => s + r.costUsd, 0);

  return { model, rates, buckets: rows, totalUsd };
}

function pushIfNonZero(rows, label, tokens, ratePerMillion) {
  if (tokens === 0) return;
  rows.push({
    label,
    tokens,
    ratePerMillion,
    costUsd: (tokens * ratePerMillion) / 1_000_000,
  });
}

function numOrZero(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

/**
 * Days since the pricing table was last verified against the provider's
 * pricing page. Used by the CLI to warn that rates may be stale.
 */
export function daysSincePricingVerified(asOf = new Date()) {
  let oldest = null;
  for (const entry of PRICING_TABLE) {
    const verified = new Date(entry.verifiedOn).getTime();
    if (!Number.isFinite(verified)) continue;
    if (oldest === null || verified < oldest) oldest = verified;
  }
  if (oldest === null) return Infinity;
  return Math.floor((asOf.getTime() - oldest) / (1000 * 60 * 60 * 24));
}

export function isPricingStale(asOf = new Date()) {
  return daysSincePricingVerified(asOf) > STALE_AFTER_DAYS;
}

/**
 * Plan-type-aware hypothetical note for the printer.
 */
export function hypotheticalNoteFor(provider, planType) {
  if (provider === 'codex' && typeof planType === 'string' && planType !== '') {
    return `hypothetical — your Codex ${capitalize(planType)} plan covers this`;
  }
  if (provider === 'claude') {
    return 'hypothetical — Anthropic API rate, your Max plan billing may differ';
  }
  return 'hypothetical — API list rate, your plan billing may differ';
}

function capitalize(s) {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}
