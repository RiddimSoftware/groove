import { strict as assert } from 'node:assert';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
  appendUsageRecords,
  findUsageFiles,
  readUsageRecords,
  SCHEMA_VERSION,
  validateUsageRecord,
} from '../src/usage-jsonl.mjs';

const validRecord = () => ({
  schemaVersion: SCHEMA_VERSION,
  recordedAt: '2026-05-01T00:00:00Z',
  runID: '0ed83fa7-7a8a-4e3a-8c6a-7d35f8c9b3a3',
  turn: 1,
  issueIdentifier: 'FOO-1',
  provider: 'claude',
  model: 'claude-sonnet-4-6',
  botRole: 'developer',
  inputTokens: 100,
  outputTokens: 50,
  totalTokens: 150,
  usageSource: 'provider_reported',
  startedAt: '2026-05-01T00:00:00Z',
  endedAt: '2026-05-01T00:00:05Z',
});

describe('validateUsageRecord', () => {
  it('accepts a fully populated record', () => {
    assert.equal(validateUsageRecord(validRecord()), null);
  });

  it('rejects missing schemaVersion', () => {
    const r = validRecord();
    delete r.schemaVersion;
    assert.match(validateUsageRecord(r), /schemaVersion/);
  });

  it('rejects an invalid botRole', () => {
    const r = validRecord();
    r.botRole = 'observer';
    assert.match(validateUsageRecord(r), /botRole/);
  });

  it("rejects unavailable records that don't null their token counts", () => {
    const r = validRecord();
    r.usageSource = 'unavailable';
    // inputTokens still 100 — must be null
    assert.match(validateUsageRecord(r), /unavailable/);
  });

  it('accepts unavailable records when all three token fields are null', () => {
    const r = validRecord();
    r.usageSource = 'unavailable';
    r.inputTokens = null;
    r.outputTokens = null;
    r.totalTokens = null;
    assert.equal(validateUsageRecord(r), null);
  });

  it('rejects non-objects', () => {
    assert.match(validateUsageRecord(null), /JSON object/);
    assert.match(validateUsageRecord('hello'), /JSON object/);
    assert.match(validateUsageRecord([1, 2, 3]), /JSON object/);
  });
});

describe('readUsageRecords + findUsageFiles', () => {
  let dir;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'llm-cost-test-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('concatenates every usage*.jsonl file in a directory (spec §4.1)', async () => {
    await writeFile(join(dir, 'usage.jsonl'), JSON.stringify(validRecord()) + '\n');
    const second = { ...validRecord(), turn: 2 };
    const third = { ...validRecord(), turn: 3 };
    await writeFile(join(dir, 'usage-2026-05-01.jsonl'), JSON.stringify(second) + '\n');
    await writeFile(join(dir, 'usage-archive.jsonl'), JSON.stringify(third) + '\n');
    // A file that should NOT be picked up:
    await writeFile(join(dir, 'other.jsonl'), JSON.stringify(third) + '\n');

    const files = await findUsageFiles(dir);
    assert.equal(files.length, 3);
    assert.ok(files.every((f) => f.includes('usage')));

    const records = [];
    for await (const r of readUsageRecords(dir)) records.push(r);
    assert.equal(records.length, 3);
    const turns = records.map((r) => r.turn).sort();
    assert.deepEqual(turns, [1, 2, 3]);
  });

  it('reads a single file path directly', async () => {
    const f = join(dir, 'usage.jsonl');
    await writeFile(f, JSON.stringify(validRecord()) + '\n');
    const records = [];
    for await (const r of readUsageRecords(f)) records.push(r);
    assert.equal(records.length, 1);
    assert.equal(records[0].issueIdentifier, 'FOO-1');
  });

  it('returns empty for a non-existent path', async () => {
    const records = [];
    for await (const r of readUsageRecords(join(dir, 'nope'))) records.push(r);
    assert.equal(records.length, 0);
  });
});

describe('appendUsageRecords', () => {
  let dir;
  beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), 'llm-cost-test-')); });
  afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

  it('writes one JSON object per line, LF-terminated', async () => {
    const file = join(dir, 'usage.jsonl');
    await appendUsageRecords(file, [validRecord(), { ...validRecord(), turn: 2 }]);
    const records = [];
    for await (const r of readUsageRecords(file)) records.push(r);
    assert.equal(records.length, 2);
    assert.equal(records[0].turn, 1);
    assert.equal(records[1].turn, 2);
  });

  it('appends to an existing file rather than overwriting', async () => {
    const file = join(dir, 'usage.jsonl');
    await appendUsageRecords(file, [validRecord()]);
    await appendUsageRecords(file, [{ ...validRecord(), turn: 2 }]);
    const records = [];
    for await (const r of readUsageRecords(file)) records.push(r);
    assert.equal(records.length, 2);
  });
});
