#!/usr/bin/env node
/**
 * `llm-cost` — per-issue token, turn, and quota analytics for Claude Code
 * and Codex CLI sessions.
 *
 * Usage:
 *   llm-cost <ISSUE-ID>
 *   llm-cost <ISSUE-ID> --cwd-pattern '<regex>'
 *   llm-cost list
 *   llm-cost --help
 *
 * Reads from `~/.claude/projects` and `~/.codex/sessions`. The default
 * cwd-to-issue regex matches the Symphony spec's per-issue workspace
 * convention (https://github.com/openai/symphony/blob/main/SPEC.md §4.1.4),
 * covering both the default `<system-temp>/symphony_workspaces/<ID>` and
 * the common `<repo>/.symphony/workspaces/<ID>` `workspace.root` settings.
 * For any other layout, pass `--cwd-pattern` with a JavaScript regex
 * containing one capture group for the issue identifier.
 */
import { parseArgs } from 'node:util';
import {
  backfillUsageFromTranscripts,
  computeIssueCost,
  computeIssueCostFromUsage,
  listKnownIssues,
} from '../src/index.mjs';
import { DEFAULT_CWD_PATTERN } from '../src/issue-pattern.mjs';
import { computeMultiIssueRollup, expandAllIssueArgs } from '../src/multi-issue.mjs';
import {
  calculateCost,
  daysSincePricingVerified,
  hypotheticalNoteFor,
  isPricingStale,
} from '../src/pricing.mjs';
import { formatDuration, formatNumber } from '../src/util.mjs';

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      'cwd-pattern': { type: 'string' },
      'claude-dir': { type: 'string' },
      'codex-dir': { type: 'string' },
      'from-usage': { type: 'string' },
      'no-pricing': { type: 'boolean' },
      out: { type: 'string' },
      json: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
  });

  if (values.help === true || positionals.length === 0) {
    printUsage();
    process.exit(values.help === true ? 0 : 1);
  }

  const cwdPattern = values['cwd-pattern'] !== undefined
    ? new RegExp(values['cwd-pattern'])
    : DEFAULT_CWD_PATTERN;
  const options = { cwdPattern };
  if (values['claude-dir'] !== undefined) options.claudeProjectsDir = values['claude-dir'];
  if (values['codex-dir'] !== undefined) options.codexSessionsDir = values['codex-dir'];

  const command = positionals[0];

  // `llm-cost backfill --out <path>` walks transcripts and writes spec-compliant usage.jsonl.
  if (command === 'backfill') {
    if (values.out === undefined || values.out === '') {
      console.error('error: backfill requires --out <path>');
      process.exit(1);
    }
    process.stderr.write(`> backfilling usage.jsonl to ${values.out} ...\n`);
    const result = await backfillUsageFromTranscripts({
      ...options,
      outFile: values.out,
      onProgress: (p) => {
        process.stderr.write(`  ${p.phase}: ${p.processed}/${p.total}  (${p.recordsWritten} records written)\r`);
      },
    });
    process.stderr.write('\n');
    process.stderr.write(
      `Wrote ${result.recordsWritten} usage records from ${result.sessionsProcessed} sessions ` +
      `(${result.sessionsSkipped} sessions skipped).\n`,
    );
    return;
  }

  if (command === 'list') {
    const ids = await listKnownIssues(options);
    if (values.json === true) {
      console.log(JSON.stringify(ids, null, 2));
    } else {
      for (const id of ids) console.log(id);
    }
    return;
  }

  // Default: treat positionals as issue identifiers (and/or inclusive ranges
  // like EPAC-1990-1999) and produce the appropriate rollup.
  const withPricing = values['no-pricing'] !== true;
  const fromUsage = values['from-usage'];

  let expanded;
  try {
    expanded = expandAllIssueArgs(positionals);
  } catch (err) {
    console.error(`error: ${err.message}`);
    process.exit(1);
  }
  if (expanded.ids.length === 0) {
    console.error('error: no issue IDs supplied');
    process.exit(1);
  }

  const loadOne = async (id) => fromUsage !== undefined
    ? await computeIssueCostFromUsage(id, fromUsage)
    : await computeIssueCost(id, options);

  // Single issue → existing per-issue output (unchanged shape).
  if (expanded.ids.length === 1) {
    const rollup = await loadOne(expanded.ids[0]);
    if (values.json === true) {
      if (withPricing) attachPricingToRollup(rollup);
      console.log(JSON.stringify(rollup, null, 2));
      return;
    }
    printRollup(rollup, fromUsage !== undefined, withPricing);
    return;
  }

  // Multiple issues (explicit list and/or expanded range) → summary table.
  const multi = await computeMultiIssueRollup(positionals, async (id) => {
    const rollup = await loadOne(id);
    if (withPricing) attachPricingToRollup(rollup);
    return rollup;
  });

  if (values.json === true) {
    console.log(JSON.stringify(multi, null, 2));
    return;
  }
  printMultiIssueRollup(multi, fromUsage !== undefined, withPricing);
}

function attachPricingToRollup(rollup) {
  for (const provider of ['claude', 'codex']) {
    const totals = rollup.providerTotals[provider];
    if (totals.sessionCount === 0) continue;
    // Prefer the first model with known rates. Synthetic markers like
    // `<synthetic>` (Claude session-restart placeholder) sort alphabetically
    // before real model names, so don't blindly take models[0].
    let cost = null;
    for (const model of totals.models) {
      cost = calculateCost(model, totals.tokens);
      if (cost !== null) break;
    }
    if (cost === null) continue;
    totals.pricing = cost;
  }
}

function printUsage() {
  console.log(`Usage: llm-cost <ISSUE-ID>... [options]
       llm-cost <PREFIX-START-END>... [options]    (range, e.g. EPAC-1990-1999)
       llm-cost <ISSUE-ID> --from-usage <usage.jsonl-or-dir>
       llm-cost list
       llm-cost backfill --out <usage.jsonl-path>
       llm-cost --help

Per-issue token, turn, and quota analytics for Claude Code and Codex CLI sessions.

Sources:
  By default, reads ~/.claude/projects and ~/.codex/sessions (the CLI's own
  transcripts). Pass --from-usage to read from a Symphony Coding-Agent Cost
  Telemetry Extension usage.jsonl file or directory instead — useful after
  you've backfilled and deleted the transcripts.

Options:
  --cwd-pattern <regex>   Regex matching the cwd, with one capture group for the
                          issue identifier. Default matches Symphony's
                          \`<workspace.root>/<ISSUE-ID>\` convention (spec default
                          \`symphony_workspaces/<ID>\` and the common in-repo
                          \`.symphony/workspaces/<ID>\` form).
  --claude-dir <path>     Override ~/.claude/projects.
  --codex-dir <path>      Override ~/.codex/sessions.
  --from-usage <path>     Read from a usage.jsonl file or directory of
                          \`usage*.jsonl\` files (per the cost-telemetry spec)
                          instead of from the CLI transcripts.
  --out <path>            (backfill only) Destination usage.jsonl path. Appended.
  --json                  Emit machine-readable JSON instead of the table.
  -h, --help              Print this message.

Examples:
  llm-cost EPAC-1940
  llm-cost EPAC-1940 EPAC-1921 FAC-67                  # multiple issues, summary table
  llm-cost EPAC-1990-1999                              # inclusive range (10 issues)
  llm-cost EPAC-1990-1999 FAC-60-70                    # mix of ranges
  llm-cost EPAC-1940 --json | jq .providerTotals.codex.quotaSamples
  llm-cost list | grep EPAC
  llm-cost EPAC-1940 --cwd-pattern '/issues/([A-Z]+-\\d+)$'

  # Bake every transcript on this machine into a usage.jsonl, then it's safe
  # to rm -rf ~/.claude/projects and ~/.codex/sessions.
  llm-cost backfill --out ~/llm-cost-history.jsonl
  llm-cost EPAC-1940 --from-usage ~/llm-cost-history.jsonl
`);
}

const HEAD = '═'.repeat(72);
const SEP = '─'.repeat(72);

function printMultiIssueRollup(multi, fromUsageJsonl = false, withPricing = true) {
  const hadDataCount = multi.issues.length;
  const headerSrc = fromUsageJsonl ? '   (source: usage.jsonl)' : '';
  console.log(HEAD);
  console.log(`COST ROLLUP  —  ${multi.label}${headerSrc}`);
  console.log(HEAD);
  console.log(
    `${multi.requestedCount} issue${multi.requestedCount === 1 ? '' : 's'} requested, ` +
    `${hadDataCount} had data` +
    (multi.requestedCount !== multi.requestedIds.length
      ? `   (${multi.requestedCount - multi.requestedIds.length} duplicates dropped)`
      : ''),
  );
  console.log();
  if (hadDataCount === 0) {
    console.log('No requested issues had any recorded sessions.');
    if (multi.missing.length > 0) {
      console.log();
      console.log(`Missing: ${multi.missing.join(', ')}`);
    }
    return;
  }

  // Determine widest issue-id for column alignment.
  const idWidth = Math.max(
    multi.totals.issueIdentifier.length,
    ...multi.issues.map((r) => r.issueIdentifier.length),
  );

  // Header.
  console.log(
    padRight('Issue', idWidth) +
    '  ' + padLeft('Sessions', 9) +
    '  ' + padLeft('Turns', 8) +
    '  ' + padLeft('Tokens', 12) +
    '  ' + padLeft('API cost', 10),
  );
  console.log(SEP);
  for (const row of multi.issues) {
    console.log(formatRow(row, idWidth));
  }
  console.log(SEP);
  console.log(formatRow(multi.totals, idWidth));

  if (multi.missing.length > 0) {
    console.log();
    if (multi.missing.length <= 8) {
      console.log(`(skipped: ${multi.missing.join(', ')} — no sessions)`);
    } else {
      const shown = multi.missing.slice(0, 8).join(', ');
      console.log(`(skipped: ${shown}, and ${multi.missing.length - 8} more — no sessions)`);
    }
  }

  if (withPricing && isPricingStale()) {
    console.log();
    console.log(`  ⚠  Pricing table is ${daysSincePricingVerified()} days old — rates may be stale.`);
  }
}

function formatRow(row, idWidth) {
  return (
    padRight(row.issueIdentifier, idWidth) +
    '  ' + padLeft(String(row.sessionCount), 9) +
    '  ' + padLeft(formatNumber(row.turnCount), 8) +
    '  ' + padLeft(formatTokensCompact(row.tokens), 12) +
    '  ' + padLeft(formatUsdOrDash(row.apiCostUsd), 10)
  );
}

function formatUsdOrDash(usd) {
  if (usd === null || usd === undefined) return '   —';
  return formatUsd(usd);
}

function padRight(s, width) {
  return s.length >= width ? s : s + ' '.repeat(width - s.length);
}

function padLeft(s, width) {
  return s.length >= width ? s : ' '.repeat(width - s.length) + s;
}

function printRollup(rollup, fromUsageJsonl = false, withPricing = true) {
  console.log(HEAD);
  console.log(`LLM COST  —  ${rollup.issueIdentifier}${fromUsageJsonl ? '   (source: usage.jsonl)' : ''}`);
  console.log(HEAD);
  console.log(`Sessions found:       ${rollup.combinedSessions}`);
  console.log(`Total turns:          ${formatNumber(rollup.combinedTurns)}`);
  console.log(`Total tokens:         ${formatNumber(rollup.combinedTokens)}`);
  console.log();

  printProvider('CLAUDE', rollup.providerTotals.claude, withPricing);
  console.log();
  printProvider('CODEX', rollup.providerTotals.codex, withPricing);

  if (withPricing && isPricingStale()) {
    console.log();
    console.log(`  ⚠  Pricing table is ${daysSincePricingVerified()} days old — rates may be stale.`);
  }
}

function printProvider(label, totals, withPricing = true) {
  console.log(SEP);
  console.log(`${label}  (${totals.sessionCount} session${totals.sessionCount === 1 ? '' : 's'})`);
  console.log(SEP);

  if (totals.sessionCount === 0) {
    console.log('  No sessions found for this issue.');
    return;
  }

  console.log(`  Models:             ${totals.models.join(', ') || '(none recorded)'}`);
  console.log(`  Turns:              ${formatNumber(totals.turnCount)}`);
  console.log(`  First → last:       ${totals.firstTimestamp ?? '-'} → ${totals.lastTimestamp ?? '-'}`);
  console.log(`  Wall clock span:    ${formatDuration(spanMs(totals.firstTimestamp, totals.lastTimestamp))}`);
  console.log();
  console.log('  Tokens:');
  console.log(`    input uncached     ${pad(formatNumber(totals.tokens.inputUncached), 14)}`);
  console.log(`    cache read         ${pad(formatNumber(totals.tokens.inputCached), 14)}`);
  if (label === 'CLAUDE') {
    console.log(`    cache create 5m    ${pad(formatNumber(totals.tokens.cacheCreate5m), 14)}`);
    console.log(`    cache create 1h    ${pad(formatNumber(totals.tokens.cacheCreate1h), 14)}`);
  }
  console.log(`    output (visible)   ${pad(formatNumber(totals.tokens.outputVisible), 14)}`);
  if (label === 'CODEX') {
    console.log(`    output (reasoning) ${pad(formatNumber(totals.tokens.outputReasoning), 14)}`);
  }
  console.log(`    ─────────────────────────────────`);
  console.log(`    grand total        ${pad(formatNumber(totals.tokensGrandTotal), 14)}`);

  // Pricing block — API-equivalent dollar cost per bucket.
  if (withPricing) {
    const model = totals.models[0];
    const cost = typeof model === 'string' && model !== '' ? calculateCost(model, totals.tokens) : null;
    console.log();
    if (cost === null) {
      console.log(`  API-equivalent pricing: no rates for model "${model ?? '<unknown>'}"`);
    } else {
      const provider = label.toLowerCase();
      const planType = totals.quotaSamples?.[0]?.planType ?? null;
      const note = hypotheticalNoteFor(provider, planType);
      const verifiedOn = cost.rates.verifiedOn;
      console.log(`  API-equivalent pricing (${cost.model} @ rates verified ${verifiedOn}):`);
      for (const row of cost.buckets) {
        const tokensStr = formatTokensCompact(row.tokens);
        const rateStr = formatRate(row.ratePerMillion);
        console.log(
          `    ${row.label.padEnd(18)} ${formatUsd(row.costUsd).padStart(8)}    (${tokensStr} × ${rateStr}/1M)`,
        );
      }
      console.log(`    ───────────────────────────────────────────`);
      console.log(`    total API cost     ${formatUsd(cost.totalUsd).padStart(8)}    [${note}]`);
    }
  }

  if (label === 'CODEX' && totals.quotaSamples.length > 0) {
    const first = totals.quotaSamples[0];
    const last = totals.quotaSamples[totals.quotaSamples.length - 1];
    console.log();
    console.log(`  Quota  (plan_type=${first.planType ?? '?'}, ${totals.quotaSamples.length} samples):`);
    // Render every window the provider exposed, by label. Pulls first/last/peak
    // for each label across the sample series.
    const labels = uniqueWindowLabels(totals.quotaSamples);
    for (const lbl of labels) {
      const firstW = findWindow(first, lbl);
      const lastW = findWindow(last, lbl);
      if (firstW === undefined || lastW === undefined) continue;
      const peak = totals.quotaSamples.reduce((m, s) => {
        const w = findWindow(s, lbl);
        return w === undefined ? m : Math.max(m, w.usedPercent);
      }, 0);
      const delta = lastW.usedPercent - firstW.usedPercent;
      const deltaStr = delta > 0 ? `+${delta.toFixed(1)} pp` : `${delta.toFixed(1)} pp`;
      console.log(
        `    ${formatWindow(firstW.windowMinutes).padEnd(8)} ${lbl.padEnd(10)} ` +
        `${firstW.usedPercent.toFixed(0)}% → ${lastW.usedPercent.toFixed(0)}% used  ` +
        `(peak ${peak.toFixed(0)}%, this issue moved ${deltaStr})`,
      );
    }
  } else if (label === 'CODEX') {
    console.log('  Quota:              not captured (no rate_limits in record)');
  } else {
    console.log('  Quota:              not exposed by Claude');
  }
}

function findWindow(sample, label) {
  if (!sample || !Array.isArray(sample.windows)) return undefined;
  return sample.windows.find((w) => w.label === label);
}

function uniqueWindowLabels(samples) {
  const labels = new Set();
  for (const s of samples) {
    if (!Array.isArray(s.windows)) continue;
    for (const w of s.windows) {
      if (typeof w.label === 'string') labels.add(w.label);
    }
  }
  return [...labels];
}

function formatWindow(minutes) {
  if (minutes >= 60 * 24) return `${(minutes / 60 / 24).toFixed(0)}d`;
  if (minutes >= 60) return `${(minutes / 60).toFixed(0)}h`;
  return `${minutes}m`;
}

function spanMs(first, last) {
  if (first === null || last === null) return 0;
  return new Date(last).getTime() - new Date(first).getTime();
}

function pad(s, width) {
  return s.length >= width ? s : ' '.repeat(width - s.length) + s;
}

function formatUsd(usd) {
  if (usd === 0) return '$0.00';
  if (usd < 0.01) return `<$0.01`;
  if (usd >= 1000) return `$${usd.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  return `$${usd.toFixed(2)}`;
}

function formatTokensCompact(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatRate(perMillionUsd) {
  if (perMillionUsd >= 1) return `$${perMillionUsd.toFixed(2)}`;
  if (perMillionUsd >= 0.01) return `$${perMillionUsd.toFixed(3)}`;
  return `$${perMillionUsd.toFixed(4)}`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
