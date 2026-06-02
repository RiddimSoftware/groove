#!/usr/bin/env node
/**
 * `llm-cost-estimate` — forecast LLM cost from Linear issue story-point estimates.
 *
 * Usage:
 *   llm-cost-estimate --help
 */
import { parseArgs } from 'node:util';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    help: { type: 'boolean', short: 'h' },
  },
});

if (values.help === true || positionals.length === 0) {
  printUsage();
  process.exit(values.help === true ? 0 : 1);
}

function printUsage() {
  console.log(`Usage: llm-cost-estimate <ISSUE-ID> <ESTIMATE> [options]
       llm-cost-estimate --help

Forecast the expected LLM cost for a Linear issue before work begins, based
on its story-point estimate and a historical calibration dataset.

Arguments:
  <ISSUE-ID>   Linear issue identifier, e.g. GRV-42
  <ESTIMATE>   Story-point estimate (e.g. 1, 2, 3)

Options:
  -h, --help   Print this message

Note: forecasting logic is not yet implemented. See the llm-cost-estimation
package issues for the implementation roadmap.
`);
}
