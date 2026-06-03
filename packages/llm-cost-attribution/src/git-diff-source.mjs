/**
 * Local git diff-size adapter for cost-driver feature extraction.
 *
 * Limits: this reads only history available in the local checkout, and it can
 * key commits only when their subjects contain issue identifiers.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export const DEFAULT_KEY_PATTERN = /[A-Z][A-Z0-9]+-\d+/;
export const GIT_LOG_FORMAT = '%x1e%H%x1f%s';

const COMMIT_SEPARATOR = '\x1e';
const FIELD_SEPARATOR = '\x1f';

/**
 * Local-git implementation of the DiffSource port.
 */
export class LocalGitDiffSource {
  /**
   * @param {string} [repoPath]
   * @param {object} [options]
   * @returns {AsyncGenerator<object, object, void>}
   */
  async *read(repoPath = process.cwd(), options = {}) {
    const summary = await this.readResult(repoPath, options);
    try {
      for (const record of summary.records) yield record;
      return summary;
    } finally {
      if (typeof options.onSummary === 'function') options.onSummary(summary);
    }
  }

  /**
   * @param {string} [repoPath]
   * @param {object} [options]
   * @returns {Promise<{ records: object[], unmatched: object, error: object | null }>}
   */
  async readResult(repoPath = process.cwd(), options = {}) {
    if (typeof repoPath !== 'string' || repoPath === '') {
      return emptyResult('repoPath must be a non-empty string');
    }

    if (typeof options.gitLogText === 'string') {
      return withNoError(parseGitNumstatLog(options.gitLogText, options));
    }

    let stdout;
    try {
      ({ stdout } = await execFileAsync('git', gitLogArgs(repoPath, options), {
        encoding: 'utf8',
        maxBuffer: options.maxBuffer ?? 1024 * 1024 * 64,
      }));
    } catch (err) {
      return emptyResult(gitErrorMessage(err, repoPath));
    }

    return withNoError(parseGitNumstatLog(stdout, options));
  }
}

/**
 * Read git diff statistics from a local repository and yield one aggregated
 * diff record per issue key found in commit subjects.
 *
 * The async generator never throws for git failures. On completion, its return
 * value is a summary object `{ records, unmatched, error }`; callers using
 * `for await` can also pass `onSummary(summary)` to receive it.
 *
 * @param {string} [repoPath]
 *   Local git repository path. Defaults to `process.cwd()`.
 * @param {object} [options]
 * @param {RegExp | string} [options.keyPattern]
 *   Pattern used to extract issue keys from commit subjects.
 * @param {string | string[]} [options.revRange]
 *   Optional rev range or list of git rev arguments.
 * @param {string} [options.gitLogText]
 *   Recorded `git log --numstat` text. Intended for fixtures/tests.
 * @param {(summary: object) => void} [options.onSummary]
 *   Receives `{ records, unmatched, error }` after parsing or git failure.
 * @returns {AsyncGenerator<object, object, void>}
 */
export async function *readGitDiffs(repoPath = process.cwd(), options = {}) {
  return yield* new LocalGitDiffSource().read(repoPath, options);
}

/**
 * Read and collect local-git diff records with their unmatched/error summary.
 *
 * @param {string} [repoPath]
 * @param {object} [options]
 * @returns {Promise<{ records: object[], unmatched: object, error: object | null }>}
 */
export async function readGitDiffResult(repoPath = process.cwd(), options = {}) {
  return new LocalGitDiffSource().readResult(repoPath, options);
}

/**
 * Parse recorded `git log --numstat --format=%x1e%H%x1f%s` output.
 *
 * @param {string} logText
 * @param {object} [options]
 * @param {RegExp | string} [options.keyPattern]
 * @returns {{ records: object[], unmatched: object }}
 */
export function parseGitNumstatLog(logText, options = {}) {
  const keyPattern = globalKeyPattern(options.keyPattern ?? DEFAULT_KEY_PATTERN);
  const aggregates = new Map();
  const unmatched = { count: 0, shas: [] };
  const stats = {
    commits: 0,
    matchedCommits: 0,
    unmatchedCommits: 0,
    skippedEmptyCommits: 0,
  };

  let current = null;
  for (const rawLine of String(logText).split(/\r?\n/)) {
    if (rawLine.startsWith(COMMIT_SEPARATOR)) {
      consumeCommit(current, keyPattern, aggregates, unmatched, stats);
      current = parseCommitHeader(rawLine);
      continue;
    }

    if (current === null || rawLine === '') continue;
    const numstat = parseNumstatLine(rawLine);
    if (numstat === null) continue;
    current.additions += numstat.additions;
    current.deletions += numstat.deletions;
    current.changedFiles += 1;
  }
  consumeCommit(current, keyPattern, aggregates, unmatched, stats);

  return {
    records: Array.from(aggregates.values()),
    unmatched: { ...unmatched, ...stats },
  };
}

function gitLogArgs(repoPath, options) {
  const args = [
    '-C',
    repoPath,
    'log',
    '--numstat',
    `--format=${GIT_LOG_FORMAT}`,
  ];
  if (options.revRange !== undefined) args.push(...revRangeArgs(options.revRange));
  return args;
}

function revRangeArgs(revRange) {
  if (Array.isArray(revRange)) return revRange.map(String).filter((arg) => arg !== '');
  if (typeof revRange === 'string' && revRange !== '') return [revRange];
  return [];
}

function parseCommitHeader(line) {
  const header = line.slice(COMMIT_SEPARATOR.length);
  const fieldIndex = header.indexOf(FIELD_SEPARATOR);
  const sha = fieldIndex === -1 ? header : header.slice(0, fieldIndex);
  const subject = fieldIndex === -1 ? '' : header.slice(fieldIndex + FIELD_SEPARATOR.length);
  return {
    sha,
    subject,
    additions: 0,
    deletions: 0,
    changedFiles: 0,
  };
}

function parseNumstatLine(line) {
  const fields = line.split('\t');
  if (fields.length < 3) return null;
  return {
    additions: parseNumstatCount(fields[0]),
    deletions: parseNumstatCount(fields[1]),
  };
}

function parseNumstatCount(value) {
  if (value === '-') return 0;
  const count = Number(value);
  return Number.isFinite(count) && count >= 0 ? count : 0;
}

function consumeCommit(commit, keyPattern, aggregates, unmatched, stats) {
  if (commit === null) return;
  stats.commits += 1;

  if (commit.changedFiles === 0) {
    stats.skippedEmptyCommits += 1;
    return;
  }

  const keys = uniqueMatches(commit.subject, keyPattern);
  if (keys.length === 0) {
    unmatched.count += 1;
    unmatched.shas.push(commit.sha);
    stats.unmatchedCommits += 1;
    return;
  }

  stats.matchedCommits += 1;
  for (const key of keys) {
    let record = aggregates.get(key);
    if (record === undefined) {
      record = {
        key,
        additions: 0,
        deletions: 0,
        changedFiles: 0,
        shas: [],
      };
      aggregates.set(key, record);
    }
    record.additions += commit.additions;
    record.deletions += commit.deletions;
    record.changedFiles += commit.changedFiles;
    record.shas.push(commit.sha);
  }
}

function uniqueMatches(subject, keyPattern) {
  keyPattern.lastIndex = 0;
  const keys = [];
  const seen = new Set();
  let match;
  while ((match = keyPattern.exec(subject)) !== null) {
    const key = match[0];
    if (!seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
    if (match[0] === '') keyPattern.lastIndex += 1;
  }
  return keys;
}

function globalKeyPattern(pattern) {
  if (typeof pattern === 'string') return new RegExp(pattern, 'g');
  if (!(pattern instanceof RegExp)) return globalKeyPattern(DEFAULT_KEY_PATTERN);
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  return new RegExp(pattern.source, flags);
}

function withNoError(result) {
  return {
    ...result,
    error: null,
  };
}

function emptyResult(message) {
  return {
    records: [],
    unmatched: {
      count: 0,
      shas: [],
      commits: 0,
      matchedCommits: 0,
      unmatchedCommits: 0,
      skippedEmptyCommits: 0,
    },
    error: {
      message,
    },
  };
}

function gitErrorMessage(err, repoPath) {
  const stderr = typeof err?.stderr === 'string' ? err.stderr.trim() : '';
  const detail = stderr || (err instanceof Error ? err.message : String(err));
  return `git log --numstat failed for ${repoPath}: ${detail}`;
}
