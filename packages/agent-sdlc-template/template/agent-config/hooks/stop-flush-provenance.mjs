#!/usr/bin/env node
/**
 * Stop hook — flush per-session Linear items to the provenance attach CLI.
 *
 * Fires when a Claude Code (or Codex) session ends. Reads the items file
 * written by post-tool-use-record-linear-creations.mjs and invokes:
 *
 *   cd /YOUR/WORKSPACE/DIR/software-factory &&
 *     npx tsx apps/cli/provenance.ts \
 *       --session-id <id> --source <claude|codex> \
 *       --items-file <path> --storage s3
 *
 * Always exits 0 — never blocks session termination.
 *
 * Source detection:
 *   CLAUDE_CODE_ENTRYPOINT set → source = "claude"
 *   CODEX_SESSION set          → source = "codex"
 *   Neither                    → logs warning, exits 0
 */

import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const SF_PATH = '/YOUR/WORKSPACE/DIR/software-factory';
const PROVENANCE_CLI = 'apps/cli/provenance.ts';

async function main() {
  let payload;
  try {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (err) {
    process.stderr.write(`[stop-flush-provenance] failed to parse stdin: ${err.message}\n`);
    process.exit(0);
  }

  const { session_id } = payload;
  if (!session_id) {
    process.stderr.write('[stop-flush-provenance] session_id missing from payload\n');
    process.exit(0);
  }

  if (process.env.FACTORY_PROVENANCE_DISABLED === '1') {
    process.exit(0);
  }

  const stateDir = process.env.AGENT_STATE_DIR ?? '/YOUR/WORKSPACE/DIR/.agent-state';
  const itemsFile = `${stateDir}/factory/provenance/${session_id}.items.jsonl`;

  if (!existsSync(itemsFile)) {
    process.exit(0);
  }

  const contents = readFileSync(itemsFile, 'utf8').trim();
  if (!contents) {
    process.exit(0);
  }

  // Detect runtime source
  let source;
  if (process.env.CLAUDE_CODE_ENTRYPOINT) {
    source = 'claude';
  } else if (process.env.CODEX_SESSION) {
    source = 'codex';
  } else {
    process.stderr.write(
      '[stop-flush-provenance] cannot determine runtime source (neither CLAUDE_CODE_ENTRYPOINT nor CODEX_SESSION is set); skipping provenance attach\n'
    );
    process.exit(0);
  }

  // Verify software-factory CLI exists
  if (!existsSync(`${SF_PATH}/${PROVENANCE_CLI}`)) {
    process.stderr.write(
      `[stop-flush-provenance] provenance CLI not found at ${SF_PATH}/${PROVENANCE_CLI}; skipping (items preserved at ${itemsFile})\n`
    );
    process.exit(0);
  }

  const result = spawnSync(
    'npx',
    [
      'tsx',
      PROVENANCE_CLI,
      '--session-id', session_id,
      '--source', source,
      '--items-file', itemsFile,
      '--storage', 's3',
    ],
    {
      cwd: SF_PATH,
      stdio: 'inherit',
      encoding: 'utf8',
      timeout: 15000,
    }
  );

  if (result.signal === 'SIGTERM' || result.error?.code === 'ETIMEDOUT') {
    process.stderr.write(
      `[stop-flush-provenance] provenance attach timed out after 15s; items preserved at ${itemsFile} for manual reconciliation\n`
    );
  } else if (result.status !== 0) {
    process.stderr.write(
      `[stop-flush-provenance] provenance attach exited ${result.status}; items preserved at ${itemsFile} for manual reconciliation\n`
    );
  } else {
    try { unlinkSync(itemsFile); } catch { /* best-effort cleanup */ }
  }

  process.exit(0);
}

main();
