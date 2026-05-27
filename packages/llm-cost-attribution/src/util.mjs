import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createInterface } from 'node:readline';

export async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export async function *readJsonl(path) {
  if (!(await pathExists(path))) return;
  const stream = createReadStream(path, { encoding: 'utf8' });
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of lines) {
    if (line.trim() === '') continue;
    try {
      const rec = JSON.parse(line);
      if (rec !== null && typeof rec === 'object' && !Array.isArray(rec)) {
        yield rec;
      }
    } catch {
      // skip malformed
    }
  }
}

export function numericOrZero(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function formatNumber(n) {
  return n.toLocaleString('en-US');
}

export function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '-';
  const totalSec = Math.round(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
