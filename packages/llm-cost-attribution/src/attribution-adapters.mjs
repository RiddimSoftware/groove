/**
 * Real adapters for the attribution ports.
 *
 * These wire the concrete Claude/Codex transcript readers and the usage-JSONL
 * reader/writer into the `SessionSource` / `UsageRecordSource` / `UsageRecordSink`
 * / `IssueMatcher` contracts the port-based core (`attribution-workflow.mjs`)
 * depends on. This module is intentionally OUTWARD: it touches the filesystem
 * (via the transcript and usage-JSONL adapters). Core modules must not import
 * it — the boundary checker lists it under `adapterModules`.
 *
 * @typedef {import('./attribution-ports.mjs').ParsedSession} ParsedSession
 * @typedef {import('./attribution-ports.mjs').SessionSource} SessionSource
 * @typedef {import('./attribution-ports.mjs').IssueMatcher} IssueMatcher
 * @typedef {import('./attribution-ports.mjs').UsageRecordSource} UsageRecordSource
 * @typedef {import('./attribution-ports.mjs').UsageRecordSink} UsageRecordSink
 */
import { homedir } from 'node:os';
import { join } from 'node:path';
import { DEFAULT_CWD_PATTERN, issueFromClaudeProjectDirName, issueFromCwd } from './issue-pattern.mjs';
import { findClaudeProjectDirs, listJsonlsRecursively, parseClaudeSession } from './transcripts/claude.mjs';
import { listCodexRollouts, parseCodexSession } from './transcripts/codex.mjs';
import { appendUsageRecords, readUsageRecords, validateUsageRecord } from './usage-jsonl.mjs';

function claudeRootOf(options) {
  return options.claudeProjectsDir ?? join(homedir(), '.claude', 'projects');
}

function codexRootOf(options) {
  return options.codexSessionsDir ?? join(homedir(), '.codex', 'sessions');
}

/**
 * `IssueMatcher` that attributes a session to an issue using the cwd-pattern
 * convention (`issue-pattern.mjs`). Pair it with `transcriptSessionSource`
 * to drive `createAttributionWorkflow` over real transcripts.
 *
 * @param {RegExp} [cwdPattern]
 * @returns {IssueMatcher}
 */
export function cwdIssueMatcher(cwdPattern = DEFAULT_CWD_PATTERN) {
  return {
    issueIdentifierForSession(session) {
      return issueFromCwd(session.cwd ?? '', cwdPattern);
    },
    worktreePathForSession(session) {
      return session.cwd ?? '';
    },
  };
}

/**
 * `SessionSource` over every Claude session + Codex rollout whose cwd matches
 * the pattern. Claude sessions come from project dirs that decode to some
 * issue; Codex rollouts are all yielded (attribution is the matcher's job).
 *
 * @param {{ cwdPattern?: RegExp, claudeProjectsDir?: string, codexSessionsDir?: string, onProgress?: (p: object) => void }} [options]
 * @returns {SessionSource}
 */
export function transcriptSessionSource(options = {}) {
  const cwdPattern = options.cwdPattern ?? DEFAULT_CWD_PATTERN;
  const claudeRootDir = claudeRootOf(options);
  const codexRootDir = codexRootOf(options);
  const onProgress = options.onProgress ?? (() => undefined);
  return {
    async *listSessions() {
      const claudeDirs = await findClaudeProjectDirs(
        claudeRootDir,
        (encoded) => issueFromClaudeProjectDirName(encoded, cwdPattern) !== null,
      );
      for (let i = 0; i < claudeDirs.length; i++) {
        for (const file of await listJsonlsRecursively(claudeDirs[i])) {
          const session = await parseClaudeSession(file);
          if (session !== null) yield session;
        }
        onProgress({ phase: 'claude', processed: i + 1, total: claudeDirs.length });
      }
      const codexFiles = await listCodexRollouts(codexRootDir);
      for (let i = 0; i < codexFiles.length; i++) {
        const session = await parseCodexSession(codexFiles[i]);
        if (session !== null) yield session;
        onProgress({ phase: 'codex', processed: i + 1, total: codexFiles.length });
      }
    },
  };
}

/**
 * `SessionSource` scoped to one issue, using the same targeted walk the
 * `computeIssueCost` convenience wrapper has always used: only Claude project
 * dirs whose encoded name decodes to `issueIdentifier`, plus Codex rollouts
 * whose cwd matches. Emits `{ phase: 'codex', processed, total }` progress.
 *
 * Because the walk is already issue-scoped, pair it with a matcher that trusts
 * the scoping (see `index.mjs`) rather than re-deriving the issue.
 *
 * @param {string} issueIdentifier
 * @param {{ cwdPattern?: RegExp, claudeProjectsDir?: string, codexSessionsDir?: string, onProgress?: (p: object) => void }} [options]
 * @returns {SessionSource}
 */
export function issueScopedTranscriptSessionSource(issueIdentifier, options = {}) {
  const cwdPattern = options.cwdPattern ?? DEFAULT_CWD_PATTERN;
  const claudeRootDir = claudeRootOf(options);
  const codexRootDir = codexRootOf(options);
  const onProgress = options.onProgress ?? (() => undefined);
  return {
    async *listSessions() {
      const matchingDirs = await findClaudeProjectDirs(
        claudeRootDir,
        (encoded) => issueFromClaudeProjectDirName(encoded, cwdPattern) === issueIdentifier,
      );
      for (const dir of matchingDirs) {
        for (const file of await listJsonlsRecursively(dir)) {
          const session = await parseClaudeSession(file);
          if (session !== null) yield session;
        }
      }
      const codexFiles = await listCodexRollouts(codexRootDir);
      for (let i = 0; i < codexFiles.length; i++) {
        const session = await parseCodexSession(codexFiles[i]);
        if (session !== null && issueFromCwd(session.cwd, cwdPattern) === issueIdentifier) yield session;
        onProgress({ phase: 'codex', processed: i + 1, total: codexFiles.length });
      }
    },
  };
}

/**
 * `SessionSource` scoped to one worktree directory, using the same direct
 * lookup the `computeWorktreeCost` convenience wrapper has always used: the
 * Claude project dir whose encoded name is the worktree path, plus Codex
 * rollouts whose cwd is exactly the worktree path. Emits `{ phase, processed,
 * total }` progress for both phases.
 *
 * @param {string} worktreePath
 * @param {{ claudeProjectsDir?: string, codexSessionsDir?: string, onProgress?: (p: object) => void }} [options]
 * @returns {SessionSource}
 */
export function worktreeScopedTranscriptSessionSource(worktreePath, options = {}) {
  const claudeRootDir = claudeRootOf(options);
  const codexRootDir = codexRootOf(options);
  const onProgress = options.onProgress ?? (() => undefined);
  return {
    async *listSessions() {
      // Claude encodes the absolute cwd by replacing every `/` and `.` with `-`.
      const encodedPath = worktreePath.replace(/[/.]/g, '-');
      const claudeFiles = await listJsonlsRecursively(join(claudeRootDir, encodedPath));
      for (let i = 0; i < claudeFiles.length; i++) {
        const session = await parseClaudeSession(claudeFiles[i]);
        if (session !== null) yield session;
        onProgress({ phase: 'claude', processed: i + 1, total: claudeFiles.length });
      }
      const codexFiles = await listCodexRollouts(codexRootDir);
      for (let i = 0; i < codexFiles.length; i++) {
        const session = await parseCodexSession(codexFiles[i]);
        if (session !== null && session.cwd === worktreePath) yield session;
        onProgress({ phase: 'codex', processed: i + 1, total: codexFiles.length });
      }
    },
  };
}

/**
 * `UsageRecordSource` over a usage.jsonl file or a directory of `usage*.jsonl`
 * files. Malformed lines (failing spec §5.1 validation) are dropped, matching
 * the `computeIssueCostFromUsage` convenience wrapper.
 *
 * @param {string} usageSource  A `.jsonl` file or a directory of `usage*.jsonl` files.
 * @returns {UsageRecordSource}
 */
export function usageJsonlRecordSource(usageSource) {
  return {
    async *readUsageRecords() {
      for await (const record of readUsageRecords(usageSource)) {
        if (validateUsageRecord(record) === null) yield record;
      }
    },
  };
}

/**
 * `UsageRecordSink` that appends each batch to a single `.jsonl` file. Created
 * if missing, appended if present.
 *
 * @param {string} outFile
 * @returns {UsageRecordSink}
 */
export function appendingUsageRecordSink(outFile) {
  if (typeof outFile !== 'string' || outFile === '') {
    throw new TypeError('appendingUsageRecordSink: outFile is required');
  }
  return {
    async writeUsageRecords(records) {
      await appendUsageRecords(outFile, records);
    },
  };
}
