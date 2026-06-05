/**
 * Port-based attribution workflows.
 *
 * This is core application policy: it computes per-issue / per-worktree cost
 * rollups and derives usage records purely from caller-supplied ports
 * (`SessionSource`, `IssueMatcher`, `UsageRecordSource`, `UsageRecordSink`).
 * It never reads the filesystem, parses a transcript, touches the network, or
 * shells out — those concrete adapters live outward (`attribution-adapters.mjs`,
 * the CLI). The boundary checker (`scripts/check-boundary.mjs`) enforces it.
 *
 * The convenience wrappers in `index.mjs` wire the real Claude/Codex
 * transcript and usage-JSONL adapters into these same workflows; tests and
 * alternate providers can wire their own in-memory ports instead.
 *
 * @typedef {import('./attribution-ports.mjs').ParsedSession} ParsedSession
 * @typedef {import('./attribution-ports.mjs').UsageRecord} UsageRecord
 * @typedef {import('./attribution-ports.mjs').IssueRollup} IssueRollup
 * @typedef {import('./attribution-ports.mjs').UsageBackfillSummary} UsageBackfillSummary
 * @typedef {import('./attribution-ports.mjs').SessionSource} SessionSource
 * @typedef {import('./attribution-ports.mjs').IssueMatcher} IssueMatcher
 * @typedef {import('./attribution-ports.mjs').UsageRecordSource} UsageRecordSource
 * @typedef {import('./attribution-ports.mjs').UsageRecordSink} UsageRecordSink
 */
import { basename } from 'node:path';
import { rollupSessions } from './aggregator.mjs';
import { rollupUsageRecords } from './usage-aggregator.mjs';
import { sessionToUsageRecords } from './transcript-to-usage.mjs';

/**
 * Aggregate every session the `SessionSource` yields whose `IssueMatcher`
 * maps it to `issueIdentifier` into a single per-issue rollup.
 *
 * @param {string} issueIdentifier
 * @param {SessionSource} sessionSource
 * @param {IssueMatcher} issueMatcher
 * @returns {Promise<IssueRollup>}
 */
export async function computeIssueCostFromSessions(issueIdentifier, sessionSource, issueMatcher) {
  requirePort(sessionSource, 'listSessions', 'sessionSource');
  requirePort(issueMatcher, 'issueIdentifierForSession', 'issueMatcher');
  const matched = [];
  for await (const session of sessionSource.listSessions()) {
    if (issueMatcher.issueIdentifierForSession(session) === issueIdentifier) matched.push(session);
  }
  return rollupSessions(issueIdentifier, matched);
}

/**
 * Aggregate every session the `SessionSource` yields whose `IssueMatcher`
 * places it at `worktreePath` into a single rollup. The rollup is labelled
 * with the worktree's basename, mirroring the path-based convenience wrapper.
 *
 * @param {string} worktreePath
 * @param {SessionSource} sessionSource
 * @param {IssueMatcher} issueMatcher
 * @returns {Promise<IssueRollup>}
 */
export async function computeWorktreeCostFromSessions(worktreePath, sessionSource, issueMatcher) {
  requirePort(sessionSource, 'listSessions', 'sessionSource');
  requirePort(issueMatcher, 'worktreePathForSession', 'issueMatcher');
  const matched = [];
  for await (const session of sessionSource.listSessions()) {
    if (issueMatcher.worktreePathForSession(session) === worktreePath) matched.push(session);
  }
  return rollupSessions(basename(worktreePath), matched);
}

/**
 * Roll up every usage record the `UsageRecordSource` yields for
 * `issueIdentifier`. Records for other issues (and `usageSource:"unavailable"`
 * records) are filtered out by `rollupUsageRecords`.
 *
 * @param {string} issueIdentifier
 * @param {UsageRecordSource} usageRecordSource
 * @returns {Promise<IssueRollup>}
 */
export async function computeIssueCostFromUsageRecords(issueIdentifier, usageRecordSource) {
  requirePort(usageRecordSource, 'readUsageRecords', 'usageRecordSource');
  const records = [];
  for await (const record of usageRecordSource.readUsageRecords()) records.push(record);
  return rollupUsageRecords(issueIdentifier, records);
}

/**
 * Stream spec-compliant usage records derived from every session the
 * `SessionSource` yields. Sessions the `IssueMatcher` can't attribute, and
 * sessions that yield no records, are skipped.
 *
 * The generator's return value (available from `gen.next().value` once `done`)
 * is a `{ recordsYielded, sessionsProcessed, sessionsSkipped }` summary.
 *
 * @param {SessionSource} sessionSource
 * @param {IssueMatcher} issueMatcher
 * @param {{ recordedAt?: string }} [options]
 */
export async function *iterateUsageFromSessions(sessionSource, issueMatcher, options = {}) {
  requirePort(sessionSource, 'listSessions', 'sessionSource');
  requirePort(issueMatcher, 'issueIdentifierForSession', 'issueMatcher');
  let recordsYielded = 0;
  let sessionsProcessed = 0;
  let sessionsSkipped = 0;
  for await (const session of sessionSource.listSessions()) {
    const records = recordsForSession(session, issueMatcher, options.recordedAt);
    if (records === null) { sessionsSkipped += 1; continue; }
    for (const record of records) yield record;
    recordsYielded += records.length;
    sessionsProcessed += 1;
  }
  return { recordsYielded, sessionsProcessed, sessionsSkipped };
}

/**
 * Derive spec-compliant usage records from every session the `SessionSource`
 * yields and write them through the `UsageRecordSink` — never calling a
 * filesystem JSONL writer from core logic. Sessions the `IssueMatcher` can't
 * attribute, and sessions that yield no records, are skipped.
 *
 * @param {SessionSource} sessionSource
 * @param {IssueMatcher} issueMatcher
 * @param {UsageRecordSink} usageRecordSink
 * @param {{ recordedAt?: string }} [options]
 * @returns {Promise<UsageBackfillSummary>}
 */
export async function backfillUsageThroughSink(sessionSource, issueMatcher, usageRecordSink, options = {}) {
  requirePort(sessionSource, 'listSessions', 'sessionSource');
  requirePort(issueMatcher, 'issueIdentifierForSession', 'issueMatcher');
  requirePort(usageRecordSink, 'writeUsageRecords', 'usageRecordSink');
  let recordsWritten = 0;
  let sessionsProcessed = 0;
  let sessionsSkipped = 0;
  for await (const session of sessionSource.listSessions()) {
    const records = recordsForSession(session, issueMatcher, options.recordedAt);
    if (records === null) { sessionsSkipped += 1; continue; }
    await usageRecordSink.writeUsageRecords(records);
    recordsWritten += records.length;
    sessionsProcessed += 1;
  }
  return { recordsWritten, sessionsProcessed, sessionsSkipped };
}

/**
 * Bind a set of attribution ports into a workflow object. Each method delegates
 * to one of the standalone workflows above using the bound ports. Methods that
 * need a port not supplied at construction throw a clear `TypeError` when
 * called, so partial wiring (e.g. only a `sessionSource`) is supported.
 *
 * @param {{
 *   sessionSource?: SessionSource,
 *   issueMatcher?: IssueMatcher,
 *   usageRecordSource?: UsageRecordSource,
 *   usageRecordSink?: UsageRecordSink,
 *   recordedAt?: string,
 * }} [ports]
 */
export function createAttributionWorkflow(ports = {}) {
  const { sessionSource, issueMatcher, usageRecordSource, usageRecordSink, recordedAt } = ports;
  return {
    /** @param {string} issueIdentifier */
    computeIssueCost(issueIdentifier) {
      return computeIssueCostFromSessions(issueIdentifier, sessionSource, issueMatcher);
    },
    /** @param {string} worktreePath */
    computeWorktreeCost(worktreePath) {
      return computeWorktreeCostFromSessions(worktreePath, sessionSource, issueMatcher);
    },
    /** @param {string} issueIdentifier */
    computeIssueCostFromUsage(issueIdentifier) {
      return computeIssueCostFromUsageRecords(issueIdentifier, usageRecordSource);
    },
    iterateUsageFromSessions() {
      return iterateUsageFromSessions(sessionSource, issueMatcher, { recordedAt });
    },
    backfillUsage() {
      return backfillUsageThroughSink(sessionSource, issueMatcher, usageRecordSink, { recordedAt });
    },
  };
}

/**
 * Derive the usage records for one session, or `null` when the session is not
 * attributable to an issue or carries no token-bearing turns. Shared by the
 * iterate and backfill workflows so their skip semantics never drift.
 *
 * @param {ParsedSession} session
 * @param {IssueMatcher} issueMatcher
 * @param {string} [recordedAt]
 * @returns {UsageRecord[] | null}
 */
function recordsForSession(session, issueMatcher, recordedAt) {
  const issueIdentifier = issueMatcher.issueIdentifierForSession(session);
  if (issueIdentifier === null || issueIdentifier === undefined) return null;
  const records = sessionToUsageRecords(session, issueIdentifier, recordedAt === undefined ? {} : { recordedAt });
  return records.length === 0 ? null : records;
}

/**
 * Guard that a required port is present and exposes the expected method, with
 * a message that names the missing port and the method the workflow needs.
 */
function requirePort(port, method, name) {
  if (port === null || port === undefined || typeof port[method] !== 'function') {
    throw new TypeError(`attribution workflow requires a ${name} port with a ${method}() method`);
  }
}
