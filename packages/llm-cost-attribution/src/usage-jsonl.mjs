/**
 * Read and write `usage.jsonl` records as defined by the Symphony
 * Coding-Agent Cost Telemetry Extension specification:
 *
 *   https://github.com/RiddimSoftware/groove/blob/main/specs/symphony-cost-telemetry-extension/SPEC.md
 *
 * One JSON object per line, UTF-8, LF-terminated. Records are append-only
 * and never modified once written.
 *
 * The spec's canonical location is
 *   <symphony-workspace-root>/.symphony/telemetry/usage.jsonl
 * but writers MAY split across files matching `usage*.jsonl` (or `.jsonl.gz`)
 * in the same directory; readers MUST treat the concatenation as one stream.
 * This module's `readUsageRecords` walks any directory and concatenates all
 * matching plain-JSONL files. (`.jsonl.gz` is not handled yet — see TODO.)
 */
import { createWriteStream } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { readJsonl } from './util.mjs';

/** The schemaVersion this module writes. */
export const SCHEMA_VERSION = 1;

/**
 * Walk a directory and return every plain-JSONL file matching `usage*.jsonl`.
 * Used by readers to honor the spec's "writers MAY split, readers concatenate"
 * rule. Returns absolute paths in directory-listing order.
 *
 * @param {string} dir
 */
export async function findUsageFiles(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out = [];
  for (const e of entries) {
    if (!e.isFile()) continue;
    if (!e.name.startsWith('usage')) continue;
    if (!e.name.endsWith('.jsonl')) continue; // .jsonl.gz: TODO
    out.push(join(dir, e.name));
  }
  return out.sort();
}

/**
 * Stream every usage record from a path. The path may be:
 *   - a single .jsonl file
 *   - a directory containing one or more `usage*.jsonl` files
 *
 * Yields the records as plain objects. Records the reader doesn't recognize
 * (e.g. schemaVersion > 1) are still yielded — callers should check the
 * version themselves per spec §6.4.
 *
 * @param {string} pathOrDir
 */
export async function *readUsageRecords(pathOrDir) {
  const files = await resolveUsageFiles(pathOrDir);
  for (const file of files) {
    for await (const rec of readJsonl(file)) {
      yield rec;
    }
  }
}

async function resolveUsageFiles(pathOrDir) {
  let info;
  try {
    info = await stat(pathOrDir);
  } catch {
    return [];
  }
  if (info.isFile()) return [pathOrDir];
  if (info.isDirectory()) return findUsageFiles(pathOrDir);
  return [];
}

/**
 * Append a batch of usage records to a single .jsonl file. Writes are
 * line-buffered and synchronous from the caller's perspective.
 *
 * @param {string} outFile
 * @param {Iterable<object>} records
 */
export async function appendUsageRecords(outFile, records) {
  const stream = createWriteStream(outFile, { flags: 'a', encoding: 'utf8' });
  try {
    for (const rec of records) {
      const line = JSON.stringify(rec) + '\n';
      if (!stream.write(line)) {
        await new Promise((resolveDrain) => stream.once('drain', resolveDrain));
      }
    }
  } finally {
    await new Promise((resolveEnd, rejectEnd) => {
      stream.end((err) => (err ? rejectEnd(err) : resolveEnd()));
    });
  }
}

/**
 * Validate the REQUIRED fields of a usage record per spec §5.1. Returns
 * `null` for a valid record, or a human-readable reason string otherwise.
 * Used by readers to drop malformed lines without crashing.
 *
 * @param {unknown} rec
 */
export function validateUsageRecord(rec) {
  if (rec === null || typeof rec !== 'object' || Array.isArray(rec)) return 'not a JSON object';
  const r = /** @type {Record<string, unknown>} */ (rec);
  if (typeof r.schemaVersion !== 'number' || !Number.isInteger(r.schemaVersion) || r.schemaVersion < 1) return 'schemaVersion missing or invalid';
  if (typeof r.recordedAt !== 'string') return 'recordedAt missing';
  if (typeof r.runID !== 'string') return 'runID missing';
  if (typeof r.turn !== 'number' || !Number.isInteger(r.turn) || r.turn < 1) return 'turn missing or invalid';
  if (typeof r.issueIdentifier !== 'string' || r.issueIdentifier === '') return 'issueIdentifier missing';
  if (typeof r.provider !== 'string' || r.provider === '') return 'provider missing';
  if (typeof r.model !== 'string') return 'model missing';
  if (r.botRole !== 'developer' && r.botRole !== 'reviewer') return 'botRole missing or invalid';
  const us = r.usageSource;
  if (us !== 'provider_reported' && us !== 'estimated' && us !== 'unavailable') return 'usageSource missing or invalid';
  const okInt = (v) => v === null || (typeof v === 'number' && Number.isInteger(v) && v >= 0);
  if (!okInt(r.inputTokens)) return 'inputTokens missing or invalid';
  if (!okInt(r.outputTokens)) return 'outputTokens missing or invalid';
  if (!okInt(r.totalTokens)) return 'totalTokens missing or invalid';
  if (us === 'unavailable' && (r.inputTokens !== null || r.outputTokens !== null || r.totalTokens !== null)) {
    return 'unavailable record must have null token counts';
  }
  if (typeof r.startedAt !== 'string') return 'startedAt missing';
  if (typeof r.endedAt !== 'string') return 'endedAt missing';
  return null;
}
