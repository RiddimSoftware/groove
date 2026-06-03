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
import { readFile, writeFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import {
  backfillUsageFromTranscripts,
  calibrateCoverage,
  computeIssueCost,
  computeIssueCostFromUsage,
  computeWorktreeCost,
  correlateCostWithFeature,
  iterateUsageFromTranscripts,
  joinCostWithFeature,
  listKnownIssues,
  readGitDiffs,
  readUsageRecords,
  validateUsageRecord,
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
      worktree: { type: 'string' },
      out: { type: 'string' },
      seed: { type: 'string' },
      holdout: { type: 'string' },
      quantile: { type: 'string' },
      threshold: { type: 'string' },
      // cost-drivers / dump-* / correlate verbs
      repo: { type: 'string' },
      metric: { type: 'string' },
      'join-by': { type: 'string' },
      'key-pattern': { type: 'string' },
      'rev-range': { type: 'string' },
      window: { type: 'string' },
      pairs: { type: 'string' },
      csv: { type: 'string' },
      json: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
  });

  if (values.help === true || (positionals.length === 0 && values.worktree === undefined)) {
    printUsage();
    process.exit(values.help === true ? 0 : 1);
  }

  const cwdPattern = values['cwd-pattern'] !== undefined
    ? new RegExp(values['cwd-pattern'])
    : DEFAULT_CWD_PATTERN;
  const options = { cwdPattern };
  if (values['claude-dir'] !== undefined) options.claudeProjectsDir = values['claude-dir'];
  if (values['codex-dir'] !== undefined) options.codexSessionsDir = values['codex-dir'];
  if (process.stderr.isTTY) options.onProgress = makeProgressReporter();

  const withPricing = values['no-pricing'] !== true;

  // `llm-cost --worktree <path>` — attribute cost to a directory directly,
  // with no issue identifier or Symphony convention required.
  if (values.worktree !== undefined) {
    const worktreePath = resolve(values.worktree);
    const rollup = await computeWorktreeCost(worktreePath, options);
    if (values.json === true) {
      if (withPricing) attachPricingToRollup(rollup);
      console.log(JSON.stringify(rollup, null, 2));
      return;
    }
    printRollup(rollup, false, withPricing);
    return;
  }

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

  // `llm-cost calibrate <path>` backtests the forecaster's P80 band against a
  // local estimate-tagged usage.jsonl and prints an empirical coverage report.
  // The input is read locally only — never written back, never committed.
  if (command === 'calibrate') {
    const inputPath = positionals[1];
    if (inputPath === undefined || inputPath === '') {
      console.error('error: calibrate requires a path to a usage.jsonl file or directory');
      process.exit(1);
    }
    const calOptions = {};
    if (values.seed !== undefined) calOptions.seed = parseIntOption(values.seed, 'seed');
    if (values.holdout !== undefined) calOptions.holdoutFraction = parseFloatOption(values.holdout, 'holdout');
    if (values.quantile !== undefined) calOptions.quantile = parseFloatOption(values.quantile, 'quantile');
    if (values.threshold !== undefined) calOptions.deviationThreshold = parseFloatOption(values.threshold, 'threshold');

    const records = [];
    let invalidLines = 0;
    for await (const rec of readUsageRecords(inputPath)) {
      if (validateUsageRecord(rec) === null) records.push(rec);
      else invalidLines += 1;
    }

    let report;
    try {
      report = await calibrateCoverage(records, calOptions);
    } catch (err) {
      console.error(`error: ${err.message}`);
      process.exit(1);
    }

    if (values.json === true) {
      console.log(JSON.stringify(report, null, 2));
      return;
    }
    printCalibrationReport(report, inputPath, invalidLines);
    return;
  }

  // `llm-cost cost-drivers --repo <path>` — end-to-end cost↔diff correlation.
  // Reads cost from either transcripts (default) or --from-usage, reads diffs
  // from a local git repo, joins by the chosen strategy, and prints the
  // Spearman / Pearson / decile readout.
  if (command === 'cost-drivers') {
    await runCostDrivers(values, options);
    return;
  }

  // `llm-cost dump-usage` — emit the cost stream as JSONL for the user to
  // join externally. Source: --from-usage if set; otherwise transcripts.
  if (command === 'dump-usage') {
    await runDumpUsage(values, options);
    return;
  }

  // `llm-cost dump-diffs --repo <path>` — emit the diff stream as JSONL.
  if (command === 'dump-diffs') {
    await runDumpDiffs(values);
    return;
  }

  // `llm-cost correlate --pairs <file.csv|json>` — read externally-joined
  // {feature, cost} pairs and print the readout. No git/transcripts needed.
  if (command === 'correlate') {
    await runCorrelate(values);
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

/** Parse a CLI integer option, exiting with a clear error on bad input. */
function parseIntOption(raw, name) {
  const n = Number(raw);
  if (!Number.isInteger(n)) {
    console.error(`error: --${name} must be an integer (got "${raw}")`);
    process.exit(1);
  }
  return n;
}

/** Parse a CLI float option, exiting with a clear error on bad input. */
function parseFloatOption(raw, name) {
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    console.error(`error: --${name} must be a number (got "${raw}")`);
    process.exit(1);
  }
  return n;
}

/**
 * Print the calibration coverage report: per-cell and overall empirical
 * coverage of the predicted P80 band, with flags for cells that drift from the
 * target by more than the threshold. Low-confidence cells (too few train/held-out
 * issues) are shown but never flagged.
 */
function printCalibrationReport(report, inputPath, invalidLines = 0) {
  const pct = (q) => (q == null ? '   —' : `${(q * 100).toFixed(0)}%`);
  const targetPct = (report.quantile * 100).toFixed(0);
  const thresholdPp = (report.deviationThreshold * 100).toFixed(0);

  console.log(HEAD);
  console.log(`CALIBRATION COVERAGE  —  ${inputPath}`);
  console.log(HEAD);
  console.log(
    `Target band: P${targetPct}   Held-out: ${(report.holdoutFraction * 100).toFixed(0)}%   ` +
    `Seed: ${report.seed}   Flag threshold: ±${thresholdPp}pp`,
  );
  console.log(
    `Records: ${formatNumber(report.overall.recordsTotal)} read, ` +
    `${formatNumber(report.overall.recordsSkipped)} skipped (no cell / unavailable)` +
    (invalidLines > 0 ? `, ${formatNumber(invalidLines)} invalid` : ''),
  );
  console.log(`Issues: ${formatNumber(report.overall.issuesTotal)} across ${report.overall.cellsTotal} cell${report.overall.cellsTotal === 1 ? '' : 's'}`);
  console.log();

  if (report.cells.length === 0) {
    console.log('No forecastable cells found — need records tagged with size (or estimate) and model.');
    return;
  }

  const cellLabel = (c) => `${c.cell.size} / ${c.cell.model}${c.lowConfidence ? '  (low conf)' : ''}`;
  const labelWidth = Math.max(20, ...report.cells.map((c) => cellLabel(c).length));

  console.log(
    padRight('Cell', labelWidth) +
    '  ' + padLeft('Train', 6) +
    '  ' + padLeft('Holdout', 7) +
    '  ' + padLeft(`Pred P${targetPct}`, 9) +
    '  ' + padLeft('Coverage', 8) +
    '  Flag',
  );
  console.log(SEP);
  for (const c of report.cells) {
    console.log(
      padRight(cellLabel(c), labelWidth) +
      '  ' + padLeft(formatNumber(c.trainN), 6) +
      '  ' + padLeft(formatNumber(c.holdoutN), 7) +
      '  ' + padLeft(c.predictedP80 == null ? '—' : formatTokensCompact(c.predictedP80), 9) +
      '  ' + padLeft(pct(c.coverage), 8) +
      '  ' + (c.flagged ? '⚠ FLAG' : ''),
    );
  }
  console.log(SEP);
  console.log(
    padRight('OVERALL', labelWidth) +
    '  ' + padLeft('', 6) +
    '  ' + padLeft(formatNumber(report.overall.holdoutN), 7) +
    '  ' + padLeft('', 9) +
    '  ' + padLeft(pct(report.overall.coverage), 8) +
    '  ' + (report.overall.flagged ? '⚠ FLAG' : ''),
  );

  const flagged = report.cells.filter((c) => c.flagged);
  console.log();
  if (flagged.length === 0) {
    console.log(`✓ No cells deviate from P${targetPct} coverage by more than ${thresholdPp} points.`);
  } else {
    console.log(`⚠  ${flagged.length} cell${flagged.length === 1 ? '' : 's'} off target by >${thresholdPp}pp: ${flagged.map((c) => `${c.cell.size} / ${c.cell.model}`).join(', ')}`);
  }
  console.log();
  console.log('Note: the input is read locally only — never written back or committed. Keep it gitignored.');
}

/**
 * Returns an onProgress callback that writes a live scan counter to stderr,
 * overwriting the same line each tick. Clears the line when the Codex phase
 * completes so the output table starts on a clean line.
 * Only wired up when stderr is a TTY (not when piping --json output).
 */
function makeProgressReporter() {
  return ({ phase, processed, total }) => {
    const pct = total === 0 ? 100 : Math.round((processed / total) * 100);
    process.stderr.write(
      `  scanning ${phase} sessions: ${processed.toLocaleString()} / ${total.toLocaleString()}  (${pct}%)\r`,
    );
    // Clear the line once each phase finishes so the results table is uncluttered.
    if (processed === total) process.stderr.write(' '.repeat(60) + '\r');
  };
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
       llm-cost --worktree <path>                  (any directory, no issue ID needed)
       llm-cost <ISSUE-ID> --from-usage <usage.jsonl-or-dir>
       llm-cost list
       llm-cost backfill --out <usage.jsonl-path>
       llm-cost calibrate <usage.jsonl-or-dir> [--seed N] [--holdout F]
       llm-cost cost-drivers --repo <path> [--metric tokens|turns]
                             [--join-by issue|worktree|time] [--window <dur>]
       llm-cost dump-usage [--from-usage <path>] [--json]
       llm-cost dump-diffs --repo <path> [--key-pattern <regex>] [--json]
       llm-cost correlate --pairs <file.csv|json> [--csv <out>] [--json]
       llm-cost --help

Per-issue token, turn, and quota analytics for Claude Code and Codex CLI sessions.

Sources:
  By default, reads ~/.claude/projects and ~/.codex/sessions (the CLI's own
  transcripts). Pass --from-usage to read from a Symphony Coding-Agent Cost
  Telemetry Extension usage.jsonl file or directory instead — useful after
  you've backfilled and deleted the transcripts.

Options:
  --worktree <path>       Show cost for all sessions run from this directory.
                          No issue ID or Symphony convention required — just
                          point it at the worktree the agent ran in.
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
  --seed <int>            (calibrate only) Seed for the deterministic held-out
                          split. Default 1.
  --holdout <0..1>        (calibrate only) Fraction of each cell's issues to hold
                          out for backtesting. Default 0.2.
  --quantile <0..1>       (calibrate only) Quantile band to test. Default 0.8 (P80).
  --threshold <0..1>      (calibrate only) Flag a cell when coverage drifts from
                          the target by more than this. Default 0.1 (10 points).
  --repo <path>           (cost-drivers / dump-diffs only) Local git repo to read
                          diffs from. Diff size = additions + deletions.
  --metric tokens|turns   (cost-drivers only) Cost dimension to correlate. Default tokens.
  --join-by issue|worktree|time
                          (cost-drivers only) How to attribute cost to a diff.
                          Default 'issue' (extract a key from commit subjects
                          and from each cost record's issueIdentifier/workspacePath).
                          'worktree' joins on the cost record's workspacePath.
                          'time' attributes each cost record to the next commit
                          inside --window, an approximate label-free fallback.
  --window <duration>     (cost-drivers --join-by time only) Sweep window before
                          a commit, e.g. '30m', '2h', '1d', or a millisecond integer.
  --key-pattern <regex>   (cost-drivers / dump-diffs only) Regex for issue keys in
                          commit subjects. Default \`[A-Z][A-Z0-9]+-\\d+\`.
  --rev-range <range>     (cost-drivers / dump-diffs only) Optional git rev range
                          (e.g. \`origin/main..HEAD\`).
  --pairs <file>          (correlate only) Externally-joined pairs to read.
                          .csv: header \`feature,cost[,key]\`; .json: array of
                          \`{feature, cost, key?}\` objects.
  --csv <path>            (cost-drivers / correlate only) Write per-pair rows to
                          this caller-named path. Never written to the cwd by default.
  --json                  Emit machine-readable JSON instead of the table. For
                          dump-* the default is JSONL (one record per line);
                          --json packs the records into a single JSON array.
  -h, --help              Print this message.

Examples:
  llm-cost EPAC-1940
  llm-cost EPAC-1940 EPAC-1921 FAC-67                  # multiple issues, summary table
  llm-cost EPAC-1990-1999                              # inclusive range (10 issues)
  llm-cost EPAC-1990-1999 FAC-60-70                    # mix of ranges
  llm-cost EPAC-1940 --json | jq .providerTotals.codex.quotaSamples
  llm-cost list | grep EPAC
  llm-cost EPAC-1940 --cwd-pattern '/issues/([A-Z]+-\\d+)$'
  llm-cost --worktree ~/code/my-repo/.worktrees/my-feature

  # Bake every transcript on this machine into a usage.jsonl, then it's safe
  # to rm -rf ~/.claude/projects and ~/.codex/sessions.
  llm-cost backfill --out ~/llm-cost-history.jsonl
  llm-cost EPAC-1940 --from-usage ~/llm-cost-history.jsonl

  # Check whether the forecaster's P80 band is actually calibrated against a
  # local, estimate-tagged dataset. The input stays local — never committed.
  llm-cost calibrate ~/backfill.out --seed 1 --holdout 0.2

  # End-to-end: what predicts how many tokens an issue eats?
  llm-cost cost-drivers --repo ~/code/my-repo --metric tokens
  llm-cost cost-drivers --repo ~/code/my-repo --join-by worktree --json

  # Escape hatches: emit the two streams and join them yourself.
  llm-cost dump-usage > usage.jsonl
  llm-cost dump-diffs --repo ~/code/my-repo > diffs.jsonl
  llm-cost correlate --pairs my-pairs.csv          # CSV: feature,cost
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

/* ------------------------------------------------------------------------- *
 * cost-drivers / dump-* / correlate verbs
 * ------------------------------------------------------------------------- */

const METRICS = ['tokens', 'turns'];
const JOIN_BY_TO_STRATEGY = { issue: 'issue-key', worktree: 'worktree', time: 'time' };
const JOIN_BY_CHOICES = Object.keys(JOIN_BY_TO_STRATEGY);

async function runCostDrivers(values, transcriptOptions) {
  const repo = values.repo;
  if (typeof repo !== 'string' || repo === '') {
    console.error('error: cost-drivers requires --repo <path>');
    process.exit(1);
  }
  const metric = pickMetric(values.metric);
  const joinByLabel = pickJoinBy(values['join-by']);
  const strategy = JOIN_BY_TO_STRATEGY[joinByLabel];
  const keyPattern = parseRegexOption(values['key-pattern'], 'key-pattern');
  const cwdPattern = parseRegexOption(values['cwd-pattern'], 'cwd-pattern') ?? DEFAULT_CWD_PATTERN;

  const usage = values['from-usage'] !== undefined
    ? readUsageRecords(values['from-usage'])
    : iterateUsageFromTranscripts({
        cwdPattern,
        claudeProjectsDir: transcriptOptions.claudeProjectsDir,
        codexSessionsDir: transcriptOptions.codexSessionsDir,
      });

  const diffsGen = readGitDiffs(resolve(repo), {
    keyPattern: keyPattern ?? undefined,
    revRange: values['rev-range'] ?? undefined,
  });

  // Drain the diffs into an array so we can grab the unmatched/error summary
  // alongside the records the join consumes.
  const diffRecords = [];
  let diffSummary = null;
  while (true) {
    const step = await diffsGen.next();
    if (step.done) { diffSummary = step.value; break; }
    diffRecords.push(step.value);
  }
  if (diffSummary !== null && diffSummary.error !== null) {
    console.error(`error: ${diffSummary.error.message}`);
    process.exit(1);
  }

  const joinArgs = {
    usage,
    diffs: diffRecords,
    strategy,
    cwdPattern,
  };
  if (strategy === 'time') joinArgs.window = parseDurationMs(values.window);

  let joinOut;
  try {
    joinOut = await joinCostWithFeature(joinArgs);
  } catch (err) {
    console.error(`error: ${err.message}`);
    process.exit(1);
  }

  // Project to scalar { feature, cost } for the chosen metric.
  const flatPairs = joinOut.pairs.map((p) => ({
    key: p.key,
    feature: p.feature,
    cost: p.cost[metric],
  }));
  const result = correlateCostWithFeature(flatPairs);

  if (values.csv !== undefined) await writeCsvPairs(values.csv, flatPairs, metric);

  const unmatched = diffSummary?.unmatched ?? {};
  const payload = {
    metric,
    joinBy: joinByLabel,
    repo: resolve(repo),
    n: result.n,
    spearman: result.spearman,
    pearsonLinear: result.pearsonLinear,
    pearsonLogLog: result.pearsonLogLog,
    pearsonLogLogDropped: result.pearsonLogLogDropped,
    deciles: result.deciles,
    unjoined: {
      usage: joinOut.unjoined.usage,
      diffs: joinOut.unjoined.diffs,
    },
    unmatchedCommits: unmatched.unmatchedCommits ?? 0,
    skippedEmptyCommits: unmatched.skippedEmptyCommits ?? 0,
  };

  if (values.json === true) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  printCorrelationReport(payload, { repoLabel: resolve(repo) });
}

async function runDumpUsage(values, transcriptOptions) {
  const cwdPattern = parseRegexOption(values['cwd-pattern'], 'cwd-pattern') ?? DEFAULT_CWD_PATTERN;
  const source = values['from-usage'] !== undefined
    ? readUsageRecords(values['from-usage'])
    : iterateUsageFromTranscripts({
        cwdPattern,
        claudeProjectsDir: transcriptOptions.claudeProjectsDir,
        codexSessionsDir: transcriptOptions.codexSessionsDir,
      });

  if (values.json === true) {
    const all = [];
    for await (const rec of source) all.push(rec);
    process.stdout.write(JSON.stringify(all) + '\n');
    return;
  }
  for await (const rec of source) {
    process.stdout.write(JSON.stringify(rec) + '\n');
  }
}

async function runDumpDiffs(values) {
  const repo = values.repo;
  if (typeof repo !== 'string' || repo === '') {
    console.error('error: dump-diffs requires --repo <path>');
    process.exit(1);
  }
  const keyPattern = parseRegexOption(values['key-pattern'], 'key-pattern');
  const diffsGen = readGitDiffs(resolve(repo), {
    keyPattern: keyPattern ?? undefined,
    revRange: values['rev-range'] ?? undefined,
  });

  const records = [];
  let summary = null;
  while (true) {
    const step = await diffsGen.next();
    if (step.done) { summary = step.value; break; }
    records.push(step.value);
  }
  if (summary !== null && summary.error !== null) {
    console.error(`error: ${summary.error.message}`);
    process.exit(1);
  }

  if (values.json === true) {
    process.stdout.write(JSON.stringify(records) + '\n');
  } else {
    for (const rec of records) process.stdout.write(JSON.stringify(rec) + '\n');
  }
  const u = summary?.unmatched ?? {};
  process.stderr.write(
    `# ${records.length} records, ${u.unmatchedCommits ?? 0} unmatched commit${(u.unmatchedCommits ?? 0) === 1 ? '' : 's'}, ` +
    `${u.skippedEmptyCommits ?? 0} skipped empty\n`,
  );
}

async function runCorrelate(values) {
  if (values.pairs === undefined || values.pairs === '') {
    console.error('error: correlate requires --pairs <file.csv|json>');
    process.exit(1);
  }
  let pairs;
  try {
    pairs = await readPairsFile(values.pairs);
  } catch (err) {
    console.error(`error: ${err.message}`);
    process.exit(1);
  }
  const result = correlateCostWithFeature(pairs);
  if (values.csv !== undefined) await writeCsvPairs(values.csv, pairs, 'cost');

  const payload = {
    source: resolve(values.pairs),
    n: result.n,
    spearman: result.spearman,
    pearsonLinear: result.pearsonLinear,
    pearsonLogLog: result.pearsonLogLog,
    pearsonLogLogDropped: result.pearsonLogLogDropped,
    deciles: result.deciles,
  };
  if (values.json === true) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  printCorrelationReport(payload, { repoLabel: resolve(values.pairs) });
}

/* ------------------------------------------------------------------------- *
 * helpers for cost-drivers / correlate
 * ------------------------------------------------------------------------- */

function pickMetric(raw) {
  if (raw === undefined) return 'tokens';
  if (!METRICS.includes(raw)) {
    console.error(`error: --metric must be one of ${METRICS.join(', ')} (got "${raw}")`);
    process.exit(1);
  }
  return raw;
}

function pickJoinBy(raw) {
  if (raw === undefined) return 'issue';
  if (!JOIN_BY_CHOICES.includes(raw)) {
    console.error(`error: --join-by must be one of ${JOIN_BY_CHOICES.join(', ')} (got "${raw}")`);
    process.exit(1);
  }
  return raw;
}

function parseRegexOption(raw, name) {
  if (raw === undefined) return null;
  try {
    return new RegExp(raw);
  } catch (err) {
    console.error(`error: --${name} is not a valid regex: ${err.message}`);
    process.exit(1);
  }
}

/** Accept either a plain ms integer or a suffixed duration: 30s, 2m, 1h, 3d. */
function parseDurationMs(raw) {
  if (raw === undefined) {
    console.error("error: --join-by time requires --window (e.g. '30m', '2h', '1d', or a millisecond integer)");
    process.exit(1);
  }
  const match = String(raw).trim().match(/^(\d+(?:\.\d+)?)(ms|s|m|h|d)?$/);
  if (match === null) {
    console.error(`error: --window must be a number with optional suffix ms/s/m/h/d (got "${raw}")`);
    process.exit(1);
  }
  const value = Number(match[1]);
  const unit = match[2] ?? 'ms';
  const factor = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit];
  return value * factor;
}

async function readPairsFile(path) {
  const ext = extname(path).toLowerCase();
  const text = await readFile(path, 'utf8');
  if (ext === '.json') return parsePairsJson(text, path);
  if (ext === '.csv') return parsePairsCsv(text, path);
  // Fallback: sniff content.
  const trimmed = text.trimStart();
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) return parsePairsJson(text, path);
  return parsePairsCsv(text, path);
}

function parsePairsJson(text, path) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    throw new Error(`${path}: not valid JSON (${err.message})`);
  }
  if (!Array.isArray(data)) throw new Error(`${path}: expected an array of {feature, cost} objects`);
  const out = [];
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (row === null || typeof row !== 'object') {
      throw new Error(`${path}: row ${i} is not an object`);
    }
    const feature = Number(row.feature);
    const cost = Number(row.cost);
    if (!Number.isFinite(feature)) throw new Error(`${path}: row ${i} has non-numeric feature`);
    if (!Number.isFinite(cost)) throw new Error(`${path}: row ${i} has non-numeric cost`);
    const pair = { feature, cost };
    if (typeof row.key === 'string') pair.key = row.key;
    out.push(pair);
  }
  return out;
}

function parsePairsCsv(text, path) {
  const lines = text.split(/\r?\n/).filter((l) => l !== '');
  if (lines.length === 0) return [];
  const header = splitCsvLine(lines[0]);
  const featureIdx = header.findIndex((h) => h.toLowerCase() === 'feature');
  const costIdx = header.findIndex((h) => h.toLowerCase() === 'cost');
  const keyIdx = header.findIndex((h) => h.toLowerCase() === 'key');
  if (featureIdx === -1 || costIdx === -1) {
    throw new Error(`${path}: CSV must have header columns "feature" and "cost"`);
  }
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = splitCsvLine(lines[i]);
    const feature = Number(fields[featureIdx]);
    const cost = Number(fields[costIdx]);
    if (!Number.isFinite(feature) || !Number.isFinite(cost)) continue;
    const pair = { feature, cost };
    if (keyIdx !== -1 && fields[keyIdx] !== undefined) pair.key = fields[keyIdx];
    out.push(pair);
  }
  return out;
}

function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i += 1; continue; }
      if (ch === '"') { inQuotes = false; continue; }
      cur += ch;
      continue;
    }
    if (ch === '"') { inQuotes = true; continue; }
    if (ch === ',') { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}

async function writeCsvPairs(path, pairs, costLabel) {
  const hasKeyCol = pairs.some((p) => typeof p.key === 'string');
  const header = hasKeyCol ? `key,feature,${costLabel}` : `feature,${costLabel}`;
  const rows = pairs.map((p) => {
    const f = String(p.feature);
    const c = String(p.cost);
    if (!hasKeyCol) return `${f},${c}`;
    return `${csvField(p.key ?? '')},${f},${c}`;
  });
  await writeFile(path, header + '\n' + rows.join('\n') + (rows.length > 0 ? '\n' : ''), 'utf8');
}

function csvField(value) {
  const s = String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

function printCorrelationReport(payload, { repoLabel }) {
  const fmtCoef = (v) => (v === null ? '   —' : (v >= 0 ? ` ${v.toFixed(3)}` : v.toFixed(3)));
  const fmtCost = (n) => {
    if (!Number.isFinite(n)) return '   —';
    if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toFixed(n >= 100 || Number.isInteger(n) ? 0 : 2);
  };
  const fmtFeat = (n) => {
    if (!Number.isFinite(n)) return '—';
    if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return Number.isInteger(n) ? String(n) : n.toFixed(2);
  };

  const heading = payload.metric !== undefined
    ? `COST DRIVERS  —  diff size vs ${payload.metric}`
    : `COST DRIVERS  —  external pairs`;

  console.log(HEAD);
  console.log(heading);
  console.log(HEAD);
  if (payload.joinBy !== undefined) console.log(`Join strategy:  ${payload.joinBy}`);
  console.log(`Source:         ${repoLabel}`);
  const unjoinedUsage = payload.unjoined?.usage?.length ?? 0;
  const unjoinedDiffs = payload.unjoined?.diffs?.length ?? 0;
  if (payload.joinBy !== undefined) {
    console.log(
      `n = ${payload.n} pair${payload.n === 1 ? '' : 's'}    ` +
      `unjoined: ${unjoinedUsage} usage, ${unjoinedDiffs} diffs    ` +
      `unmatched commits: ${payload.unmatchedCommits}`,
    );
  } else {
    console.log(`n = ${payload.n} pair${payload.n === 1 ? '' : 's'}`);
  }
  console.log();

  console.log('Correlations:');
  console.log(`  Spearman          ${fmtCoef(payload.spearman)}`);
  console.log(`  Pearson(linear)   ${fmtCoef(payload.pearsonLinear)}`);
  const ll = payload.pearsonLogLogDropped > 0
    ? `${fmtCoef(payload.pearsonLogLog)}  (${payload.pearsonLogLogDropped} pair${payload.pearsonLogLogDropped === 1 ? '' : 's'} dropped: non-positive)`
    : fmtCoef(payload.pearsonLogLog);
  console.log(`  Pearson(log-log)  ${ll}`);

  if (payload.deciles.length === 0) {
    console.log();
    console.log('Decile table: not enough pairs.');
    return;
  }
  console.log();
  const medianLabel = payload.metric === 'turns' ? 'Median turns' : 'Median tokens';
  console.log('Decile table:');
  console.log(
    padRight('Decile', 7) +
    '  ' + padRight('Lines changed', 24) +
    '  ' + padLeft('n', 4) +
    '  ' + padLeft(medianLabel, 13),
  );
  console.log(SEP);
  for (let i = 0; i < payload.deciles.length; i++) {
    const d = payload.deciles[i];
    const range = `${fmtFeat(d.featureRange.min)} – ${fmtFeat(d.featureRange.max)}`;
    console.log(
      padRight(String(i + 1), 7) +
      '  ' + padRight(range, 24) +
      '  ' + padLeft(String(d.n), 4) +
      '  ' + padLeft(fmtCost(d.medianCost), 13),
    );
  }

  if (unjoinedUsage > 0 || unjoinedDiffs > 0) {
    console.log();
    console.log(
      `Note: ${unjoinedUsage} usage key${unjoinedUsage === 1 ? '' : 's'} and ${unjoinedDiffs} diff key${unjoinedDiffs === 1 ? '' : 's'} did not join.`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
