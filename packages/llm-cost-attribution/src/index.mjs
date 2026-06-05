/**
 * Library API for `llm-cost-attribution`.
 *
 * Use this to compute per-issue token/turn/quota rollups from your own
 * code. For a ready-to-run command, see the `llm-cost` binary
 * (bin/llm-cost.mjs).
 */
import { homedir } from 'node:os';
import { join } from 'node:path';
import { forecastIssueCost as forecastIssueCostCore } from './forecast.mjs';
import { DEFAULT_CWD_PATTERN, issueFromClaudeProjectDirName, issueFromCwd } from './issue-pattern.mjs';
import { calculateCost } from './pricing.mjs';
import { findWindow } from './quota.mjs';
import { findClaudeProjectDirs, listJsonlsRecursively, parseClaudeSession } from './transcripts/claude.mjs';
import { listCodexRollouts, parseCodexSession } from './transcripts/codex.mjs';
import { sessionToUsageRecords } from './transcript-to-usage.mjs';
import { appendUsageRecords } from './usage-jsonl.mjs';
import { createAttributionWorkflow } from './attribution-workflow.mjs';
import {
  issueScopedTranscriptSessionSource,
  worktreeScopedTranscriptSessionSource,
  usageJsonlRecordSource,
} from './attribution-adapters.mjs';

export { DEFAULT_CWD_PATTERN, issueFromCwd, issueFromClaudeProjectDirName } from './issue-pattern.mjs';
export { rollupSessions } from './aggregator.mjs';
export { rollupUsageRecords } from './usage-aggregator.mjs';
export { sessionToUsageRecords } from './transcript-to-usage.mjs';
export {
  DEFAULT_MIN_FORECAST_SAMPLE_SIZE,
  collectCellSamples,
  featureCellOf,
  issueIdentifierFor,
  iterateEstimateTaggedUsageSource,
  totalTokensFor,
} from './forecast.mjs';
export {
  DEFAULT_PROJECT_FORECAST_ITERATIONS,
  DEFAULT_PROJECT_FORECAST_SEED,
  forecastProjectCost,
} from './project-forecast.mjs';
export { empiricalP50P80, empiricalQuantile } from './quantiles.mjs';
export {
  DEFAULT_CALIBRATION_QUANTILE,
  DEFAULT_DEVIATION_THRESHOLD,
  DEFAULT_HOLDOUT_FRACTION,
  calibrateCoverage,
} from './calibrate.mjs';
export {
  logNormalParamsForP50P80,
  mulberry32,
  standardNormal,
  syntheticRecord,
  syntheticUsageRecords,
} from './synthetic.mjs';
export {
  SCHEMA_VERSION,
  findUsageFiles,
  readUsageRecords,
  appendUsageRecords,
  validateUsageRecord,
} from './usage-jsonl.mjs';
export {
  computeMultiIssueRollup,
  expandAllIssueArgs,
  expandIssueArg,
} from './multi-issue.mjs';
export {
  PRICING_TABLE,
  STALE_AFTER_DAYS,
} from './pricing-rates.mjs';
export {
  calculateCost,
  daysSincePricingVerified,
  hypotheticalNoteFor,
  isPricingStale,
  normalizeModelName,
  ratesForModel,
} from './pricing.mjs';
export { correlateCostWithFeature } from './correlate.mjs';
export {
  DEFAULT_KEY_PATTERN,
  LocalGitDiffSource,
  parseGitNumstatLog,
  readGitDiffResult,
  readGitDiffs,
} from './git-diff-source.mjs';
export { joinCostWithFeature, BUILTIN_JOIN_STRATEGIES } from './cost-feature-join.mjs';
export {
  createAttributionWorkflow,
  computeIssueCostFromSessions,
  computeWorktreeCostFromSessions,
  computeIssueCostFromUsageRecords,
  iterateUsageFromSessions,
  backfillUsageThroughSink,
} from './attribution-workflow.mjs';
export {
  cwdIssueMatcher,
  transcriptSessionSource,
  issueScopedTranscriptSessionSource,
  worktreeScopedTranscriptSessionSource,
  usageJsonlRecordSource,
  appendingUsageRecordSink,
} from './attribution-adapters.mjs';

/**
 * Default `PricingTable` adapter for `forecastIssueCost`. Delegates to
 * `pricing.mjs` so the forecaster never has to import the rate table itself
 * (forecast.mjs is a core module; pricing.mjs is its adapter).
 *
 * @type {{ priceFor: (model: string, buckets: object) => number | null }}
 */
export const DEFAULT_PRICING_TABLE = {
  priceFor(model, buckets) {
    const cost = calculateCost(model, buckets);
    return cost === null ? null : cost.totalUsd;
  },
};

/**
 * Default `QuotaModel` adapter for `forecastIssueCost`. Extracts the
 * Codex-style spec §5.2.3 primary-window `usedPercent` from a usage record
 * and returns it as a fraction in `[0, 1]`. Records without a Codex provider
 * tag or without a primary window yield `null`, which the forecaster reads
 * as "no quota signal for this issue".
 *
 * @type {{ quotaFractionFor: (record: object) => number | null }}
 */
export const DEFAULT_QUOTA_MODEL = {
  quotaFractionFor(record) {
    if (record === null || typeof record !== 'object') return null;
    if (record.provider !== 'codex') return null;
    const quota = record.quota;
    if (quota === null || typeof quota !== 'object' || !Array.isArray(quota.windows)) return null;
    const primary = findWindow({ windows: quota.windows }, 'primary');
    if (primary === undefined || typeof primary.usedPercent !== 'number') return null;
    return primary.usedPercent / 100;
  },
};

/**
 * Library-default `forecastIssueCost`: wires the core forecaster to the
 * `pricing.mjs` / `quota.mjs` adapters so the $ and quota channels populate
 * out of the box. Callers can override either port via `options` for tests
 * or alternate providers.
 *
 * @param {Parameters<typeof forecastIssueCostCore>[0]} featureRecord
 * @param {Parameters<typeof forecastIssueCostCore>[1]} [usageSource]
 * @param {Parameters<typeof forecastIssueCostCore>[2]} [options]
 */
export function forecastIssueCost(featureRecord, usageSource = [], options = {}) {
  return forecastIssueCostCore(featureRecord, usageSource, {
    ...options,
    pricingTable: options.pricingTable ?? DEFAULT_PRICING_TABLE,
    quotaModel: options.quotaModel ?? DEFAULT_QUOTA_MODEL,
  });
}

/**
 * Read every Claude session whose encoded project directory name matches the
 * given issue identifier, plus every Codex rollout whose `session_meta.cwd`
 * matches it, and aggregate them into a single per-issue rollup.
 *
 * @param {string} issueIdentifier  e.g. "EPAC-1940"
 * @param {object} [options]
 * @param {RegExp}  [options.cwdPattern]         Default matches Symphony / Autopilot convention.
 * @param {string}  [options.claudeProjectsDir]  Override `~/.claude/projects`.
 * @param {string}  [options.codexSessionsDir]   Override `~/.codex/sessions`.
 */
export async function computeIssueCost(issueIdentifier, options = {}) {
  const cwdPattern = options.cwdPattern ?? DEFAULT_CWD_PATTERN;
  const sessionSource = issueScopedTranscriptSessionSource(issueIdentifier, { ...options, cwdPattern });
  // The source is already scoped to this issue (Claude by encoded dir name,
  // Codex by cwd), so attribute every session it yields to `issueIdentifier`
  // rather than re-deriving it — preserving the wrapper's historical matching.
  const issueMatcher = {
    issueIdentifierForSession: () => issueIdentifier,
    worktreePathForSession: (session) => session.cwd ?? '',
  };
  return createAttributionWorkflow({ sessionSource, issueMatcher }).computeIssueCost(issueIdentifier);
}

/**
 * Compute token/turn cost for all sessions run from a specific worktree
 * directory, regardless of any issue identifier or Symphony convention.
 * Works with any directory a user ran `claude` or `codex` from — no Linear
 * issue or symphonyd required.
 *
 * @param {string} worktreePath  Absolute path to the worktree directory.
 * @param {object} [options]
 * @param {string} [options.claudeProjectsDir]  Override `~/.claude/projects`.
 * @param {string} [options.codexSessionsDir]   Override `~/.codex/sessions`.
 */
export async function computeWorktreeCost(worktreePath, options = {}) {
  const sessionSource = worktreeScopedTranscriptSessionSource(worktreePath, options);
  // The source is already scoped to this worktree path, so place every session
  // it yields at `worktreePath`. The core labels the rollup with the basename.
  const issueMatcher = {
    issueIdentifierForSession: () => null,
    worktreePathForSession: () => worktreePath,
  };
  return createAttributionWorkflow({ sessionSource, issueMatcher }).computeWorktreeCost(worktreePath);
}

/**
 * Same shape as `computeIssueCost`, but sources data from a usage.jsonl file
 * (or a directory of `usage*.jsonl` files) instead of the CLI transcripts.
 * Use this after backfilling so you can safely delete `~/.claude/projects`
 * and `~/.codex/sessions` and still query historical cost.
 *
 * Records with `usageSource === "unavailable"` are skipped.
 *
 * @param {string} issueIdentifier
 * @param {string} usageSource  A .jsonl file or a directory of `usage*.jsonl` files.
 */
export async function computeIssueCostFromUsage(issueIdentifier, usageSource) {
  const usageRecordSource = usageJsonlRecordSource(usageSource);
  return createAttributionWorkflow({ usageRecordSource }).computeIssueCostFromUsage(issueIdentifier);
}

/**
 * Walk every Claude session + every Codex rollout and yield spec-compliant
 * usage.jsonl records one at a time. Sessions whose cwd doesn't match the
 * configured pattern are skipped.
 *
 * Use this when you want to stream records to a downstream consumer (such as
 * `dump-usage` or an in-process correlator) instead of writing them to a file.
 * `backfillUsageFromTranscripts` is built on top of this generator.
 *
 * The generator's return value (from `gen.next().value` once `done` is true)
 * is `{ recordsYielded, sessionsProcessed, sessionsSkipped }`.
 *
 * @param {object} [options]
 * @param {RegExp} [options.cwdPattern]
 * @param {string} [options.claudeProjectsDir]
 * @param {string} [options.codexSessionsDir]
 * @param {(progress: { phase: string, file?: string, processed: number, total: number, recordsYielded: number }) => void} [options.onProgress]
 */
export async function *iterateUsageFromTranscripts(options = {}) {
  const cwdPattern = options.cwdPattern ?? DEFAULT_CWD_PATTERN;
  const claudeRootDir = options.claudeProjectsDir ?? join(homedir(), '.claude', 'projects');
  const codexRootDir = options.codexSessionsDir ?? join(homedir(), '.codex', 'sessions');
  const onProgress = options.onProgress ?? (() => undefined);

  let recordsYielded = 0;
  let sessionsProcessed = 0;
  let sessionsSkipped = 0;

  // Phase 1: walk Claude project dirs and yield records for matching sessions.
  const claudeDirs = await findClaudeProjectDirs(claudeRootDir, (encoded) => issueFromClaudeProjectDirName(encoded, cwdPattern) !== null);
  for (let i = 0; i < claudeDirs.length; i++) {
    const dir = claudeDirs[i];
    const encoded = dir.split('/').pop() ?? '';
    const issueIdentifier = issueFromClaudeProjectDirName(encoded, cwdPattern);
    if (issueIdentifier === null) continue;
    for (const file of await listJsonlsRecursively(dir)) {
      const session = await parseClaudeSession(file);
      if (session === null) { sessionsSkipped += 1; continue; }
      const records = sessionToUsageRecords(session, issueIdentifier);
      if (records.length === 0) { sessionsSkipped += 1; continue; }
      for (const rec of records) yield rec;
      recordsYielded += records.length;
      sessionsProcessed += 1;
    }
    onProgress({ phase: 'claude', file: dir, processed: i + 1, total: claudeDirs.length, recordsYielded });
  }

  // Phase 2: walk Codex rollouts.
  const codexFiles = await listCodexRollouts(codexRootDir);
  for (let i = 0; i < codexFiles.length; i++) {
    const file = codexFiles[i];
    const session = await parseCodexSession(file);
    if (session === null) { sessionsSkipped += 1; continue; }
    const issueIdentifier = issueFromCwd(session.cwd, cwdPattern);
    if (issueIdentifier === null) { sessionsSkipped += 1; continue; }
    const records = sessionToUsageRecords(session, issueIdentifier);
    if (records.length === 0) { sessionsSkipped += 1; continue; }
    for (const rec of records) yield rec;
    recordsYielded += records.length;
    sessionsProcessed += 1;
    if ((i + 1) % 100 === 0 || i + 1 === codexFiles.length) {
      onProgress({ phase: 'codex', file, processed: i + 1, total: codexFiles.length, recordsYielded });
    }
  }

  return { recordsYielded, sessionsProcessed, sessionsSkipped };
}

/**
 * Walk every Claude session + every Codex rollout, derive spec-compliant
 * usage.jsonl records for each, and append them to a single output file.
 *
 * Sessions whose cwd doesn't match the configured pattern are skipped (they
 * aren't attributable to any issue this tool understands).
 *
 * After backfilling, the operator can safely delete the source transcripts
 * — the usage.jsonl file carries every field needed to reproduce the cost
 * rollups via `computeIssueCostFromUsage`. The fidelity tradeoff is that
 * usage.jsonl drops the cache-tier split, reasoning-vs-visible split, and
 * Codex quota samples — see the package README for the full list.
 *
 * @param {object} options
 * @param {string} options.outFile                       Destination .jsonl path. Created if missing; appended if present.
 * @param {RegExp} [options.cwdPattern]
 * @param {string} [options.claudeProjectsDir]
 * @param {string} [options.codexSessionsDir]
 * @param {(progress: { phase: string, file?: string, processed: number, total: number, recordsWritten: number }) => void} [options.onProgress]
 * @returns {Promise<{ recordsWritten: number, sessionsProcessed: number, sessionsSkipped: number }>}
 */
export async function backfillUsageFromTranscripts(options) {
  const outFile = options.outFile;
  if (typeof outFile !== 'string' || outFile === '') {
    throw new TypeError('backfillUsageFromTranscripts: options.outFile is required');
  }
  const cwdPattern = options.cwdPattern ?? DEFAULT_CWD_PATTERN;
  const claudeRootDir = options.claudeProjectsDir ?? join(homedir(), '.claude', 'projects');
  const codexRootDir = options.codexSessionsDir ?? join(homedir(), '.codex', 'sessions');
  const onProgress = options.onProgress ?? (() => undefined);

  let recordsWritten = 0;
  let sessionsProcessed = 0;
  let sessionsSkipped = 0;

  // Phase 1: walk Claude project dirs and emit records for matching sessions.
  const claudeDirs = await findClaudeProjectDirs(claudeRootDir, (encoded) => issueFromClaudeProjectDirName(encoded, cwdPattern) !== null);
  for (let i = 0; i < claudeDirs.length; i++) {
    const dir = claudeDirs[i];
    const encoded = dir.split('/').pop() ?? '';
    const issueIdentifier = issueFromClaudeProjectDirName(encoded, cwdPattern);
    if (issueIdentifier === null) continue;
    for (const file of await listJsonlsRecursively(dir)) {
      const session = await parseClaudeSession(file);
      if (session === null) { sessionsSkipped += 1; continue; }
      const records = sessionToUsageRecords(session, issueIdentifier);
      if (records.length === 0) { sessionsSkipped += 1; continue; }
      await appendUsageRecords(outFile, records);
      recordsWritten += records.length;
      sessionsProcessed += 1;
    }
    onProgress({ phase: 'claude', file: dir, processed: i + 1, total: claudeDirs.length, recordsWritten });
  }

  // Phase 2: walk Codex rollouts.
  const codexFiles = await listCodexRollouts(codexRootDir);
  for (let i = 0; i < codexFiles.length; i++) {
    const file = codexFiles[i];
    const session = await parseCodexSession(file);
    if (session === null) { sessionsSkipped += 1; continue; }
    const issueIdentifier = issueFromCwd(session.cwd, cwdPattern);
    if (issueIdentifier === null) { sessionsSkipped += 1; continue; }
    const records = sessionToUsageRecords(session, issueIdentifier);
    if (records.length === 0) { sessionsSkipped += 1; continue; }
    await appendUsageRecords(outFile, records);
    recordsWritten += records.length;
    sessionsProcessed += 1;
    if ((i + 1) % 100 === 0 || i + 1 === codexFiles.length) {
      onProgress({ phase: 'codex', file, processed: i + 1, total: codexFiles.length, recordsWritten });
    }
  }

  return { recordsWritten, sessionsProcessed, sessionsSkipped };
}

/**
 * Enumerate every issue identifier that has at least one session in the
 * configured transcript directories. Useful for `llm-cost list`.
 *
 * @param {object} [options]  Same shape as computeIssueCost options.
 */
export async function listKnownIssues(options = {}) {
  const cwdPattern = options.cwdPattern ?? DEFAULT_CWD_PATTERN;
  const claudeRootDir = options.claudeProjectsDir ?? join(homedir(), '.claude', 'projects');
  const codexRootDir = options.codexSessionsDir ?? join(homedir(), '.codex', 'sessions');
  const ids = new Set();

  for (const dir of await findClaudeProjectDirs(claudeRootDir, () => true)) {
    const dirName = dir.split('/').pop() ?? '';
    const issue = issueFromClaudeProjectDirName(dirName, cwdPattern);
    if (issue !== null) ids.add(issue);
  }
  for (const file of await listCodexRollouts(codexRootDir)) {
    const session = await parseCodexSession(file);
    if (session === null) continue;
    const issue = issueFromCwd(session.cwd, cwdPattern);
    if (issue !== null) ids.add(issue);
  }

  return [...ids].sort();
}
