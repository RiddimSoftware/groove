/**
 * Maps a working directory (the cwd at which a CLI session was launched) to
 * an issue identifier. The mapping is convention-driven: the caller decides
 * what shape their cwd takes; this module decides whether a given cwd
 * belongs to a given issue.
 *
 * The default convention matches the Symphony Telemetry Extension
 * Specification: one git worktree per issue at
 * `<repo>/.symphony/workspaces/<ISSUE-ID>`. Any orchestrator that conforms
 * to that spec (Symphony, Autopilot, etc.) produces transcripts this
 * package can read without configuration.
 *
 * The pattern is a JavaScript regex (no flags) that:
 *   - matches against the FULL cwd string (raw) or the encoded Claude
 *     project directory name (where `/` and `.` have been replaced by `-`),
 *   - has exactly one capture group, which is the issue identifier.
 *
 * Examples:
 *   /[.\-]symphony[/-]workspaces[/-]([A-Z]+-\d+)$/   (default; matches Symphony)
 *   /\/issues\/([A-Z]+-\d+)$/                        (matches `~/code/issues/PROJ-12`)
 *   /-([A-Z]+-\d+)$/                                 (matches any cwd ending `-PROJ-12`)
 */

// Matches both the raw cwd form `.../.symphony/workspaces/<ID>` and the
// Claude-encoded form `...--symphony-workspaces-<ID>` (where `/` and `.`
// both become `-`). The leading `[.\-]` covers either the literal dot or
// the encoded dash that replaced it.
export const DEFAULT_CWD_PATTERN = /[.\-]symphony[/-]workspaces[/-]([A-Z]+-\d+)$/;

/**
 * Extract the issue identifier from a Codex-style raw cwd path
 * (e.g. `/Users/sunny/code/repo/.symphony/workspaces/EPAC-1940`).
 */
export function issueFromCwd(cwd, pattern) {
  const m = pattern.exec(cwd);
  return m === null ? null : (m[1] ?? null);
}

/**
 * Extract the issue identifier from a Claude-encoded project directory name
 * (e.g. `-Users-sunny-code-repo--symphony-workspaces-EPAC-1940`).
 *
 * Claude Code stores sessions under `~/.claude/projects/<encoded-cwd>/` and
 * encodes the absolute cwd by replacing every `/` and `.` with `-`. The
 * default pattern's character class `[.\-]` matches both the raw and
 * encoded path separators in one regex.
 */
export function issueFromClaudeProjectDirName(name, pattern) {
  const m = pattern.exec(name);
  return m === null ? null : (m[1] ?? null);
}
