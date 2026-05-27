/**
 * Library API for `llm-cost-attribution`.
 *
 * Use this to compute per-issue token/turn/quota rollups from your own
 * code. For a ready-to-run command, see the `llm-cost` binary
 * (bin/llm-cost.mjs).
 */
import { homedir } from 'node:os';
import { join } from 'node:path';
import { rollupSessions } from './aggregator.mjs';
import { DEFAULT_CWD_PATTERN, issueFromClaudeProjectDirName, issueFromCwd } from './issue-pattern.mjs';
import { findClaudeProjectDirs, listJsonlsRecursively, parseClaudeSession } from './transcripts/claude.mjs';
import { listCodexRollouts, parseCodexSession } from './transcripts/codex.mjs';

export { DEFAULT_CWD_PATTERN, issueFromCwd, issueFromClaudeProjectDirName } from './issue-pattern.mjs';
export { rollupSessions } from './aggregator.mjs';

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
  const claudeRootDir = options.claudeProjectsDir ?? join(homedir(), '.claude', 'projects');
  const codexRootDir = options.codexSessionsDir ?? join(homedir(), '.codex', 'sessions');

  const sessions = [];

  // Claude: directory-name match.
  const matchingProjectDirs = await findClaudeProjectDirs(
    claudeRootDir,
    (encoded) => issueFromClaudeProjectDirName(encoded, cwdPattern) === issueIdentifier,
  );
  for (const dir of matchingProjectDirs) {
    for (const file of await listJsonlsRecursively(dir)) {
      const session = await parseClaudeSession(file);
      if (session !== null) sessions.push(session);
    }
  }

  // Codex: session_meta.cwd match, scanned across all rollouts.
  for (const file of await listCodexRollouts(codexRootDir)) {
    const session = await parseCodexSession(file);
    if (session === null) continue;
    if (issueFromCwd(session.cwd, cwdPattern) === issueIdentifier) sessions.push(session);
  }

  return rollupSessions(issueIdentifier, sessions);
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
