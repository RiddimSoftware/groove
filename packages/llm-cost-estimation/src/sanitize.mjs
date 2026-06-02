/**
 * Leak-safety guard for the llm-cost-estimation package.
 *
 * Fixtures here derive from real telemetry, so a slipped `/Users/<name>` path
 * or private repo name would publish org/personal data on npm. This module
 * exposes the deny patterns and a string scanner; `test/no-org-data.test.mjs`
 * wires them into `npm test` so a leak fails CI rather than relying on
 * reviewer vigilance.
 *
 * Allowed: opaque tracker IDs matching `[A-Z]+-\d+` on their own (e.g.
 *   `EPAC-1999`, `GRV-42`).
 * Denied: absolute home paths (`/Users/<name>`, `/home/<name>`), the
 *   `.symphony/workspaces/<ID>` path shape, and any listed private repo name.
 */

// Configurable list of private repo names. Extend this array when a new repo
// joins the org's "private" set; the guard will start flagging the name as a
// whole-word match.
export const PRIVATE_REPO_NAMES = Object.freeze([]);

// Built-in deny rules. Each regex MUST use the `g` flag — `scanText` walks
// every match on a line.
export const DEFAULT_DENY_PATTERNS = Object.freeze([
  {
    name: 'home-path-users',
    regex: /\/Users\/[A-Za-z0-9._-]+/g,
    description: 'absolute /Users/<name> home path (macOS personal data)',
  },
  {
    name: 'home-path-home',
    regex: /\/home\/[A-Za-z0-9._-]+/g,
    description: 'absolute /home/<name> path (Linux personal data)',
  },
  {
    name: 'symphony-workspace-path',
    regex: /\.symphony\/workspaces\/[A-Za-z0-9._-]+/g,
    description: '.symphony/workspaces/<ID> path (private orchestrator state)',
  },
]);

/**
 * Build a deny-pattern set, optionally extending the built-ins with a list of
 * private repo names. Each repo name is matched as a whole word so a name
 * like `epac` does not match `epacenter`.
 */
export function buildDenyPatterns({ privateRepoNames = PRIVATE_REPO_NAMES } = {}) {
  const patterns = [...DEFAULT_DENY_PATTERNS];
  for (const name of privateRepoNames) {
    patterns.push({
      name: `private-repo:${name}`,
      regex: new RegExp(`\\b${escapeRegex(name)}\\b`, 'g'),
      description: `private repo name "${name}"`,
    });
  }
  return patterns;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Scan a string for leaked data. Returns an array of findings; an empty
 * array means clean. Findings carry 1-indexed line + column so callers can
 * print human-readable file:line:col error messages.
 *
 * @returns {{ line: number, column: number, match: string, patternName: string, description: string }[]}
 */
export function scanText(text, patterns = buildDenyPatterns()) {
  const findings = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pattern of patterns) {
      // Shared regex objects carry lastIndex state across calls; reset it.
      pattern.regex.lastIndex = 0;
      let m;
      while ((m = pattern.regex.exec(line)) !== null) {
        findings.push({
          line: i + 1,
          column: m.index + 1,
          match: m[0],
          patternName: pattern.name,
          description: pattern.description,
        });
        if (m.index === pattern.regex.lastIndex) pattern.regex.lastIndex++;
      }
    }
  }
  return findings;
}
