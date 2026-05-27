/**
 * Parse Claude Code session JSONL files.
 *
 * Claude stores each session as one or more JSONL files under
 * `~/.claude/projects/<encoded-cwd>/<sessionId>.jsonl`, plus nested
 * subagent files under `~/.claude/projects/<encoded-cwd>/<sessionId>/subagents/*.jsonl`.
 *
 * Each assistant turn carries a `message.usage` object with provider-reported
 * token counts. This is the same accounting Anthropic bills against.
 */
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { numericOrZero, pathExists, readJsonl } from '../util.mjs';

export async function findClaudeProjectDirs(claudeRootDir, matchesIssue) {
  if (!(await pathExists(claudeRootDir))) return [];
  let entries;
  try {
    entries = await readdir(claudeRootDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out = [];
  for (const entry of entries) {
    if (entry.isDirectory() && matchesIssue(entry.name)) {
      out.push(join(claudeRootDir, entry.name));
    }
  }
  return out;
}

export async function listJsonlsRecursively(dir) {
  if (!(await pathExists(dir))) return [];
  const out = [];
  async function walk(d) {
    let entries;
    try {
      entries = await readdir(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = join(d, e.name);
      if (e.isDirectory()) await walk(full);
      else if (e.isFile() && e.name.endsWith('.jsonl')) out.push(full);
    }
  }
  await walk(dir);
  return out;
}

export async function parseClaudeSession(file) {
  let sessionId;
  let cwd;
  const turns = [];
  let turnIdx = 0;

  for await (const rec of readJsonl(file)) {
    if (typeof rec.sessionId === 'string' && sessionId === undefined) sessionId = rec.sessionId;
    if (typeof rec.cwd === 'string' && cwd === undefined) cwd = rec.cwd;

    const msg = rec.message;
    const usage = msg?.usage;
    if (!usage) continue;
    const cacheCreation = usage.cache_creation;
    const serverToolUse = usage.server_tool_use;
    const ts = typeof rec.timestamp === 'string' ? rec.timestamp : '';
    const model = typeof msg.model === 'string' ? msg.model : undefined;
    turns.push({
      provider: 'claude',
      sessionId: sessionId ?? '',
      turnIdx,
      timestamp: ts,
      model,
      cwd: cwd ?? '',
      tokens: {
        inputUncached: numericOrZero(usage.input_tokens),
        inputCached: numericOrZero(usage.cache_read_input_tokens),
        cacheCreate5m: numericOrZero(cacheCreation?.ephemeral_5m_input_tokens),
        cacheCreate1h: numericOrZero(cacheCreation?.ephemeral_1h_input_tokens),
        outputVisible: numericOrZero(usage.output_tokens),
        outputReasoning: 0,
      },
      webSearchRequests: numericOrZero(serverToolUse?.web_search_requests),
      webFetchRequests: numericOrZero(serverToolUse?.web_fetch_requests),
    });
    turnIdx += 1;
  }

  if (turns.length === 0 && sessionId === undefined) return null;
  return {
    provider: 'claude',
    sessionId: sessionId ?? '',
    cwd: cwd ?? '',
    sourceFile: file,
    turns,
    quotaSamples: [],
  };
}
