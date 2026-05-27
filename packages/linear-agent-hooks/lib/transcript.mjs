/**
 * Transcript utilities — locate and parse Claude Code / Codex session transcripts.
 * Pure functions, no side effects beyond filesystem reads.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Find the session transcript JSONL for a given session ID.
 *
 * Claude Code stores transcripts at:
 *   ~/.claude/projects/<encoded-cwd>/<session-id>.jsonl
 * We search across all project dirs rather than reconstructing the encoding.
 *
 * Codex stores transcripts at:
 *   ~/.codex/sessions/<session-id>.jsonl
 *   ~/.codex/archived_sessions/<session-id>.jsonl
 *
 * @param {string} sessionId
 * @returns {string|null} absolute path or null if not found
 */
export function findTranscript(sessionId) {
  const projectsDir = join(homedir(), '.claude', 'projects');
  if (existsSync(projectsDir)) {
    try {
      const dirs = readdirSync(projectsDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);

      for (const dir of dirs) {
        const candidate = join(projectsDir, dir, `${sessionId}.jsonl`);
        if (existsSync(candidate)) return candidate;
      }
    } catch {
      // best-effort
    }
  }

  // Codex locations
  for (const subdir of ['sessions', 'archived_sessions']) {
    const candidate = join(homedir(), '.codex', subdir, `${sessionId}.jsonl`);
    if (existsSync(candidate)) return candidate;
  }

  return null;
}

/**
 * Extract the last N human turns from a session transcript JSONL.
 *
 * Handles both Claude Code and Codex transcript shapes:
 *   Claude: { type: "user", message: { role: "user", content: [...] } }
 *   Simple: { role: "user", content: "..." }
 *
 * @param {string|null} transcriptPath
 * @param {number} turns  number of most-recent human turns to return
 * @returns {string[]} message strings, oldest first
 */
export function extractPrecedingContext(transcriptPath, turns = 1) {
  if (!transcriptPath || !existsSync(transcriptPath)) return [];

  try {
    const lines = readFileSync(transcriptPath, 'utf8')
      .split('\n')
      .filter(Boolean);

    const humanMessages = [];
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        // Claude Code shape: { type: "user", message: { content: [...] } }
        // Codex / simple shape: { role: "user", content: "..." or [...] }
        const isHuman =
          entry.type === 'user' ||
          entry.message?.role === 'user' ||
          entry.role === 'user';

        if (!isHuman) continue;

        const content = entry.message?.content ?? entry.content;
        let text = '';
        if (typeof content === 'string') {
          text = content.trim();
        } else if (Array.isArray(content)) {
          text = content
            .filter(b => b.type === 'text')
            .map(b => b.text)
            .join('\n')
            .trim();
        }
        if (text) humanMessages.push(text);
      } catch {
        // skip unparseable lines
      }
    }

    return humanMessages.slice(-turns);
  } catch {
    return [];
  }
}
