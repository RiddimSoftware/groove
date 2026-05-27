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
 * cwd-to-issue regex matches the convention described in the Symphony
 * Telemetry Extension Specification (worktree per issue at
 * `<repo>/.symphony/workspaces/<ISSUE>`). To match a different convention,
 * pass `--cwd-pattern` with a JavaScript regex containing one capture group
 * for the issue identifier.
 */
import { parseArgs } from 'node:util';
import {
  backfillUsageFromTranscripts,
  computeIssueCost,
  computeIssueCostFromUsage,
  listKnownIssues,
} from '../src/index.mjs';
import { DEFAULT_CWD_PATTERN } from '../src/issue-pattern.mjs';
import { formatDuration, formatNumber } from '../src/util.mjs';

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      'cwd-pattern': { type: 'string' },
      'claude-dir': { type: 'string' },
      'codex-dir': { type: 'string' },
      'from-usage': { type: 'string' },
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

  // Default: treat the positional as an issue identifier and produce its rollup.
  // If --from-usage is given, read from usage.jsonl; otherwise from transcripts.
  const issueIdentifier = command;
  const rollup = values['from-usage'] !== undefined
    ? await computeIssueCostFromUsage(issueIdentifier, values['from-usage'])
    : await computeIssueCost(issueIdentifier, options);
  if (values.json === true) {
    console.log(JSON.stringify(rollup, null, 2));
    return;
  }
  printRollup(rollup, values['from-usage'] !== undefined);
}

function printUsage() {
  console.log(`Usage: llm-cost <ISSUE-ID> [options]
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

function printRollup(rollup, fromUsageJsonl = false) {
  console.log(HEAD);
  console.log(`LLM COST  —  ${rollup.issueIdentifier}${fromUsageJsonl ? '   (source: usage.jsonl)' : ''}`);
  console.log(HEAD);
  console.log(`Sessions found:       ${rollup.combinedSessions}`);
  console.log(`Total turns:          ${formatNumber(rollup.combinedTurns)}`);
  console.log(`Total tokens:         ${formatNumber(rollup.combinedTokens)}`);
  console.log();

  printProvider('CLAUDE', rollup.providerTotals.claude);
  console.log();
  printProvider('CODEX', rollup.providerTotals.codex);
}

function printProvider(label, totals) {
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

  if (label === 'CODEX' && totals.quotaSamples.length > 0) {
    const first = totals.quotaSamples[0];
    const last = totals.quotaSamples[totals.quotaSamples.length - 1];
    const peak5h = totals.quotaSamples.reduce((m, s) => Math.max(m, s.primaryUsedPercent), 0);
    const peak7d = totals.quotaSamples.reduce((m, s) => Math.max(m, s.secondaryUsedPercent), 0);
    console.log();
    console.log(`  Quota  (plan_type=${first.planType ?? '?'}, ${totals.quotaSamples.length} samples):`);
    console.log(
      `    ${first.primaryWindowMinutes / 60}h window  ` +
      `${first.primaryUsedPercent.toFixed(0)}% → ${last.primaryUsedPercent.toFixed(0)}% used  ` +
      `(peak ${peak5h.toFixed(0)}%)`,
    );
    console.log(
      `    ${(first.secondaryWindowMinutes / 60 / 24).toFixed(0)}d window  ` +
      `${first.secondaryUsedPercent.toFixed(0)}% → ${last.secondaryUsedPercent.toFixed(0)}% used  ` +
      `(peak ${peak7d.toFixed(0)}%)`,
    );
  } else if (label === 'CODEX') {
    console.log('  Quota:              not captured (no rate_limits events in transcript)');
  } else {
    console.log('  Quota:              not exposed by Claude');
  }
}

function spanMs(first, last) {
  if (first === null || last === null) return 0;
  return new Date(last).getTime() - new Date(first).getTime();
}

function pad(s, width) {
  return s.length >= width ? s : ' '.repeat(width - s.length) + s;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
