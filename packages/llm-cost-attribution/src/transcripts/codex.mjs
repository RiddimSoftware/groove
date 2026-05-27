/**
 * Parse Codex CLI rollout JSONL files.
 *
 * Codex stores each session as a single JSONL under
 * `~/.codex/sessions/YYYY/MM/DD/rollout-<timestamp>-<id>.jsonl`. The first
 * record is `session_meta` with `payload.cwd`; subsequent `event_msg` records
 * of type `token_count` carry both:
 *   - `payload.info.total_token_usage`  (cumulative across the session)
 *   - `payload.rate_limits`             (per-window quota % at this moment)
 *
 * We delta the cumulative usage to produce per-turn token counts, and
 * collect every rate-limits sample we see.
 */
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { numericOrZero, pathExists, readJsonl } from '../util.mjs';

const ZERO_CUMULATIVE = { total: 0, input: 0, cached: 0, output: 0, reasoning: 0 };

export async function listCodexRollouts(codexRootDir) {
  if (!(await pathExists(codexRootDir))) return [];
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
  await walk(codexRootDir);
  return out;
}

export async function parseCodexSession(file) {
  let sessionId;
  let cwd;
  let model;
  let prev = ZERO_CUMULATIVE;
  let turnIdx = 0;
  const turns = [];
  const quotaSamples = [];

  for await (const rec of readJsonl(file)) {
    const type = rec.type;
    const payload = rec.payload;
    const ts = typeof rec.timestamp === 'string' ? rec.timestamp : '';

    if (type === 'session_meta' && payload !== undefined) {
      if (typeof payload.id === 'string') sessionId = payload.id;
      if (typeof payload.cwd === 'string') cwd = payload.cwd;
      continue;
    }
    if (type === 'turn_context' && payload !== undefined && typeof payload.model === 'string') {
      model = payload.model;
      continue;
    }
    if (type !== 'event_msg' || payload === undefined || payload.type !== 'token_count') continue;

    const totalUsage = payload.info?.total_token_usage;
    if (totalUsage !== undefined) {
      const current = {
        total: numericOrZero(totalUsage.total_tokens),
        input: numericOrZero(totalUsage.input_tokens),
        cached: numericOrZero(totalUsage.cached_input_tokens),
        output: numericOrZero(totalUsage.output_tokens),
        reasoning: numericOrZero(totalUsage.reasoning_output_tokens),
      };
      const delta = {
        total: current.total - prev.total,
        input: current.input - prev.input,
        cached: current.cached - prev.cached,
        output: current.output - prev.output,
        reasoning: current.reasoning - prev.reasoning,
      };
      const allNonNegative =
        delta.input >= 0 && delta.cached >= 0 && delta.output >= 0 && delta.reasoning >= 0;
      if (delta.total > 0 && allNonNegative) {
        const inputUncached = Math.max(0, delta.input - delta.cached);
        const outputVisible = Math.max(0, delta.output - delta.reasoning);
        turns.push({
          provider: 'codex',
          sessionId: sessionId ?? '',
          turnIdx,
          timestamp: ts,
          model,
          cwd: cwd ?? '',
          tokens: {
            inputUncached,
            inputCached: delta.cached,
            cacheCreate5m: 0,
            cacheCreate1h: 0,
            outputVisible,
            outputReasoning: delta.reasoning,
          },
          webSearchRequests: 0,
          webFetchRequests: 0,
        });
        turnIdx += 1;
        prev = current;
      }
    }

    const rateLimits = payload.rate_limits;
    if (rateLimits !== undefined && rateLimits !== null) {
      const primary = rateLimits.primary;
      const secondary = rateLimits.secondary;
      quotaSamples.push({
        provider: 'codex',
        timestamp: ts,
        primaryUsedPercent: numericOrZero(primary?.used_percent),
        secondaryUsedPercent: numericOrZero(secondary?.used_percent),
        primaryWindowMinutes: numericOrZero(primary?.window_minutes),
        secondaryWindowMinutes: numericOrZero(secondary?.window_minutes),
        primaryResetsAt: typeof primary?.resets_at === 'number' ? primary.resets_at : null,
        secondaryResetsAt: typeof secondary?.resets_at === 'number' ? secondary.resets_at : null,
        planType: typeof rateLimits.plan_type === 'string' ? rateLimits.plan_type : null,
      });
    }
  }

  if (turns.length === 0 && quotaSamples.length === 0 && sessionId === undefined) return null;
  return {
    provider: 'codex',
    sessionId: sessionId ?? '',
    cwd: cwd ?? '',
    sourceFile: file,
    turns,
    quotaSamples,
  };
}
