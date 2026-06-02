#!/usr/bin/env node
/**
 * `llm-cost-estimate` — forecast LLM cost for an issue before work begins.
 *
 * Two paths into a forecast:
 *   --size L --model X            key-free; the cell is `{ size, model }`.
 *   --issue GRV-123 --model X     reads the issue's story-point estimate from
 *                                 Linear (opt-in `LINEAR_API_TOKEN`), then
 *                                 forecasts at that size.
 *
 * Both paths read estimate-tagged usage records from `--from-usage <path>`
 * (a single `usage.jsonl` file or a directory of `usage*.jsonl` files, per
 * the Symphony Cost Telemetry Extension spec) and emit P50/P80 + n for
 * tokens, turns, dollars, and — for Codex cells with rate_limits samples —
 * the per-issue peak primary-window quota fraction. `--json` swaps the table
 * for the same shape as JSON.
 */
import { readUsageRecords } from 'llm-cost-attribution';
import { parseArgs } from 'node:util';
import { forecastIssueCost, createLinearEstimateSource } from '../src/index.mjs';

async function main() {
  const { values } = parseArgs({
    options: {
      size: { type: 'string' },
      issue: { type: 'string' },
      model: { type: 'string' },
      'from-usage': { type: 'string' },
      json: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
  });

  if (values.help === true) {
    printUsage();
    process.exit(0);
  }
  if (values.size === undefined && values.issue === undefined) {
    printUsage();
    process.exit(1);
  }
  if (values.size !== undefined && values.issue !== undefined) {
    process.stderr.write('error: pass either --size or --issue, not both\n');
    process.exit(1);
  }
  if (values.model === undefined || values.model === '') {
    process.stderr.write('error: --model is required (e.g. --model claude-sonnet-4-6)\n');
    process.exit(1);
  }

  const model = values.model;
  let size;
  let issueIdentifier;

  if (values.size !== undefined) {
    size = values.size;
  } else {
    issueIdentifier = values.issue;
    const source = makeLinearEstimateSourceOrExit();
    let resolved;
    try {
      resolved = await source.resolveEstimates([issueIdentifier]);
    } catch (err) {
      process.stderr.write(`error: failed to resolve estimate for ${issueIdentifier}: ${err.message}\n`);
      process.exit(1);
    }
    const estimate = resolved instanceof Map
      ? resolved.get(issueIdentifier)
      : (resolved?.[issueIdentifier]);
    if (estimate === null || estimate === undefined) {
      process.stderr.write(`error: ${issueIdentifier} has no estimate in Linear; pass --size to forecast at a specific size\n`);
      process.exit(1);
    }
    size = String(estimate);
  }

  const records = [];
  if (values['from-usage'] !== undefined && values['from-usage'] !== '') {
    for await (const record of readUsageRecords(values['from-usage'])) {
      records.push(record);
    }
  }

  const forecast = await forecastIssueCost({ size, model }, records);
  const result = {
    size,
    model,
    issueIdentifier,
    n: forecast.tokens.n,
    tokens: forecast.tokens,
    turns: forecast.turns,
    dollars: forecast.dollars,
    quota: forecast.quota,
    quotaReason: forecast.quotaReason,
    lowConfidence: forecast.lowConfidence,
    empty: forecast.empty,
  };

  if (values.json === true) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  printTable(result);
}

function makeLinearEstimateSourceOrExit() {
  try {
    return createLinearEstimateSource();
  } catch (err) {
    process.stderr.write('error: set LINEAR_API_TOKEN or pass --size to forecast without a Linear lookup\n');
    process.exit(1);
  }
}

function printUsage() {
  process.stdout.write(`Usage: llm-cost-estimate --size <SIZE> --model <MODEL> [--from-usage <path>] [--json]
       llm-cost-estimate --issue <ID> --model <MODEL> [--from-usage <path>] [--json]
       llm-cost-estimate --help

Forecast the expected LLM cost for an issue before work begins. The forecaster
matches \`{ size, model }\` cells against an estimate-tagged usage.jsonl dataset
and returns empirical P50/P80 quantiles for tokens, turns, dollars, and the
Codex primary-window quota fraction (single-issue only — never summed across
issues).

Inputs:
  --size <SIZE>           Story-point or T-shirt size to forecast at, e.g.
                          \`L\` or \`3\`. Key-free — no Linear lookup.
  --issue <ID>            Linear issue identifier, e.g. \`GRV-123\`. The CLI
                          resolves the issue's estimate via Linear (requires
                          \`LINEAR_API_TOKEN\`) and forecasts at that size.
  --model <MODEL>         Required. Model to forecast at, e.g.
                          \`claude-sonnet-4-6\` or \`gpt-5.4\`.
  --from-usage <path>     A \`usage.jsonl\` file or directory of \`usage*.jsonl\`
                          files (Symphony Cost Telemetry Extension spec). When
                          omitted the forecast is empty (n=0).
  --json                  Emit JSON instead of the table.
  -h, --help              Print this message.

Examples:
  llm-cost-estimate --size L --model claude-sonnet-4-6 --from-usage ~/usage.jsonl
  llm-cost-estimate --issue GRV-123 --model claude-sonnet-4-6 --from-usage ~/usage.jsonl
  llm-cost-estimate --size 3 --model gpt-5.4 --from-usage ~/usage.jsonl --json
`);
}

const HEAD = '═'.repeat(72);
const SEP = '─'.repeat(72);

function printTable(result) {
  const cell = result.issueIdentifier !== undefined
    ? `${result.issueIdentifier}  (size ${result.size}, model ${result.model})`
    : `size ${result.size}, model ${result.model}`;
  console.log(HEAD);
  console.log(`COST FORECAST  —  ${cell}`);
  console.log(HEAD);
  console.log(`Sample size:         n = ${result.n}${result.lowConfidence ? '   (low confidence)' : ''}`);
  if (result.empty) {
    console.log();
    console.log(`No historical issues match this cell — forecast is empty.`);
    console.log(`Add more estimate-tagged records to --from-usage and try again.`);
    return;
  }
  console.log();
  console.log(
    padRight('Metric', 14) +
    '  ' + padLeft('P50', 12) +
    '  ' + padLeft('P80', 12) +
    '  ' + padLeft('n', 5),
  );
  console.log(SEP);
  console.log(formatRow('tokens', result.tokens, formatTokens));
  console.log(formatRow('turns', result.turns, formatTurns));
  console.log(formatRow('dollars', result.dollars, formatUsd));
  if (result.quota !== null && result.quota !== undefined) {
    console.log(formatRow('quota (frac)', result.quota, formatFraction));
  } else if (typeof result.quotaReason === 'string') {
    console.log();
    console.log(`(quota: ${result.quotaReason})`);
  }
  if (result.dollars !== null && result.dollars.n === 0 && result.n > 0) {
    console.log();
    console.log(`(no pricing rates for "${result.model}" — $ row reports n=0)`);
  }
}

function formatRow(label, point, formatValue) {
  if (point === null || point === undefined) {
    return padRight(label, 14) + '  ' + padLeft('—', 12) + '  ' + padLeft('—', 12) + '  ' + padLeft('0', 5);
  }
  return (
    padRight(label, 14) +
    '  ' + padLeft(formatValue(point.p50), 12) +
    '  ' + padLeft(formatValue(point.p80), 12) +
    '  ' + padLeft(String(point.n), 5)
  );
}

function formatTokens(value) {
  if (value === null || value === undefined) return '—';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(Math.round(value));
}

function formatTurns(value) {
  if (value === null || value === undefined) return '—';
  return String(Math.round(value));
}

function formatUsd(value) {
  if (value === null || value === undefined) return '—';
  if (value === 0) return '$0.00';
  if (value < 0.01) return '<$0.01';
  if (value >= 1000) return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  return `$${value.toFixed(2)}`;
}

function formatFraction(value) {
  if (value === null || value === undefined) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

function padRight(s, width) {
  return s.length >= width ? s : s + ' '.repeat(width - s.length);
}

function padLeft(s, width) {
  return s.length >= width ? s : ' '.repeat(width - s.length) + s;
}

main().catch((err) => {
  process.stderr.write(`${err.stack ?? err.message ?? String(err)}\n`);
  process.exit(1);
});
