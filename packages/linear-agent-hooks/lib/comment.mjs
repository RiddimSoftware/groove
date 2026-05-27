/**
 * Comment body builder — formats the provenance comment posted to Linear.
 * Pure function, no side effects.
 */

/**
 * Build the Markdown body for a Linear provenance comment.
 *
 * @param {string}   sessionId       Claude Code / Codex session ID
 * @param {string}   source          "claude" | "codex" | "agent"
 * @param {string[]} contextMessages preceding human turn(s), oldest first
 * @returns {string} Markdown comment body
 */
export function buildCommentBody(sessionId, source, contextMessages) {
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  const lines = [`🤖 **${source}** · session \`${sessionId}\` · ${ts}`];

  if (contextMessages.length > 0) {
    lines.push('');
    for (const msg of contextMessages) {
      const truncated = msg.length > 500 ? msg.slice(0, 497) + '…' : msg;
      lines.push(`> ${truncated.replace(/\n/g, '\n> ')}`);
    }
  }

  return lines.join('\n');
}
