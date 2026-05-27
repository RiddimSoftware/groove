/**
 * Maps a working directory (the cwd at which a CLI session was launched) to
 * an issue identifier. The mapping is convention-driven: the caller decides
 * what shape their cwd takes; this module decides whether a given cwd
 * belongs to a given issue.
 *
 * The default pattern matches the two most common `workspace.root` settings
 * for a Symphony-conformant orchestrator
 * (https://github.com/openai/symphony/blob/main/SPEC.md):
 *
 *   1. The spec default, `<system-temp>/symphony_workspaces/<ID>`
 *      (e.g. `/tmp/symphony_workspaces/EPAC-1940`).
 *   2. The in-repo override, `<repo>/.symphony/workspaces/<ID>`
 *      (e.g. `/Users/x/code/repo/.symphony/workspaces/EPAC-1940`).
 *
 * Both place the workspace_key (the sanitized issue identifier) as the last
 * path component of the cwd, satisfying the spec's Invariant 1
 * (`cwd == workspace_path`). For other `workspace.root` settings, pass
 * `--cwd-pattern '<regex>'` with one capture group for the issue ID.
 *
 * The pattern matches against either:
 *   - the FULL cwd string (raw, as recorded in Codex `session_meta.cwd`), or
 *   - the encoded Claude project directory name (where `/` and `.` have both
 *     been replaced by `-`).
 *
 * Examples of caller-supplied patterns:
 *   /\/issues\/([A-Z]+-\d+)$/    (matches `~/code/issues/PROJ-12`)
 *   /-([A-Z]+-\d+)$/             (matches any cwd ending `-PROJ-12`)
 */

// Both Symphony-default `symphony_workspaces/<ID>` and the common in-repo
// `.symphony/workspaces/<ID>` form, in either raw or Claude-encoded shape
// (`/` and `.` both become `-` in Claude's project-dir encoding).
export const DEFAULT_CWD_PATTERN =
  /(?:symphony_workspaces|[.\-]symphony[/-]workspaces)[/-]([A-Za-z0-9._-]+)$/;

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
