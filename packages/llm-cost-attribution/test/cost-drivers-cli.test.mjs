/**
 * End-to-end CLI tests for the cost-drivers / dump-usage / dump-diffs /
 * correlate verbs. Drives `bin/llm-cost.mjs` as a subprocess against synthetic
 * fixtures (a real temp git repo + a synthetic usage.jsonl).
 */
import { strict as assert } from 'node:assert';
import { spawnSync, execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, describe, it } from 'node:test';

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(PACKAGE_ROOT, 'bin/llm-cost.mjs');

function runCli(args, opts = {}) {
  return spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf8',
    env: { ...process.env, ...(opts.env ?? {}) },
    timeout: 30_000,
  });
}

function git(repo, args) {
  execFileSync('git', ['-C', repo, ...args], { stdio: 'pipe' });
}

/** Build a git repo with three commits whose subjects we can attribute. */
async function makeFixtureRepo(root) {
  git(root, ['init', '-q', '-b', 'main']);
  git(root, ['config', 'user.email', 'test@example.com']);
  git(root, ['config', 'user.name', 'Test']);
  git(root, ['config', 'commit.gpgsign', 'false']);

  // ABC-12: small change (10 lines).
  await writeFile(join(root, 'small.txt'), Array.from({ length: 10 }, (_, i) => `line ${i}`).join('\n') + '\n');
  git(root, ['add', 'small.txt']);
  git(root, ['commit', '-q', '-m', '[ABC-12]: small change']);

  // ABC-34: bigger change (300 lines).
  await writeFile(join(root, 'big.txt'), Array.from({ length: 300 }, (_, i) => `line ${i}`).join('\n') + '\n');
  git(root, ['add', 'big.txt']);
  git(root, ['commit', '-q', '-m', '[ABC-34]: big change']);

  // Unkeyed commit (should appear in unmatched).
  await writeFile(join(root, 'README.md'), 'docs\n');
  git(root, ['add', 'README.md']);
  git(root, ['commit', '-q', '-m', 'chore: docs']);
}

/** Synthetic usage.jsonl with two issues, one cheap, one expensive. */
function syntheticUsage() {
  const base = {
    schemaVersion: 1,
    recordedAt: '2026-01-01T00:00:00.000Z',
    runID: 'run-1',
    provider: 'claude',
    model: 'claude-sonnet',
    botRole: 'developer',
    usageSource: 'provider_reported',
    startedAt: '2026-01-01T00:00:00.000Z',
    endedAt: '2026-01-01T00:00:01.000Z',
  };
  const records = [];
  // ABC-12: 2 turns × small token cost.
  records.push({ ...base, turn: 1, issueIdentifier: 'ABC-12', inputTokens: 100, outputTokens: 50, totalTokens: 150 });
  records.push({ ...base, turn: 2, issueIdentifier: 'ABC-12', inputTokens: 200, outputTokens: 50, totalTokens: 250 });
  // ABC-34: 4 turns × big token cost.
  records.push({ ...base, runID: 'run-2', turn: 1, issueIdentifier: 'ABC-34', inputTokens: 5_000, outputTokens: 1_000, totalTokens: 6_000 });
  records.push({ ...base, runID: 'run-2', turn: 2, issueIdentifier: 'ABC-34', inputTokens: 6_000, outputTokens: 1_000, totalTokens: 7_000 });
  records.push({ ...base, runID: 'run-2', turn: 3, issueIdentifier: 'ABC-34', inputTokens: 7_000, outputTokens: 1_000, totalTokens: 8_000 });
  records.push({ ...base, runID: 'run-2', turn: 4, issueIdentifier: 'ABC-34', inputTokens: 8_000, outputTokens: 1_000, totalTokens: 9_000 });
  // One unjoinable record (no diff for XYZ-99).
  records.push({ ...base, runID: 'run-3', turn: 1, issueIdentifier: 'XYZ-99', inputTokens: 50, outputTokens: 50, totalTokens: 100 });
  return records.map((r) => JSON.stringify(r)).join('\n') + '\n';
}

describe('llm-cost CLI: cost-drivers / dump-* / correlate', () => {
  let scratch;
  let repoDir;
  let usagePath;

  before(async () => {
    scratch = await mkdtemp(join(tmpdir(), 'llm-cost-cli-'));
    const { mkdir } = await import('node:fs/promises');
    repoDir = join(scratch, 'repo');
    await mkdir(repoDir, { recursive: true });
    await makeFixtureRepo(repoDir);
    usagePath = join(scratch, 'usage.jsonl');
    await writeFile(usagePath, syntheticUsage());
  });

  after(async () => {
    await rm(scratch, { recursive: true, force: true });
  });

  describe('--help', () => {
    it('mentions all four new verbs', () => {
      const r = runCli(['--help']);
      assert.equal(r.status, 0, r.stderr);
      assert.match(r.stdout, /cost-drivers/);
      assert.match(r.stdout, /dump-usage/);
      assert.match(r.stdout, /dump-diffs/);
      assert.match(r.stdout, /correlate --pairs/);
    });
  });

  describe('cost-drivers', () => {
    it('errors clearly when --repo is missing', () => {
      const r = runCli(['cost-drivers']);
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /cost-drivers requires --repo/);
    });

    it('rejects an unknown --metric', () => {
      const r = runCli(['cost-drivers', '--repo', repoDir, '--metric', 'usd', '--from-usage', usagePath]);
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /--metric must be one of tokens, turns/);
    });

    it('rejects an unknown --join-by', () => {
      const r = runCli(['cost-drivers', '--repo', repoDir, '--join-by', 'magic', '--from-usage', usagePath]);
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /--join-by must be one of issue, worktree, time/);
    });

    it('--json prints the full readout for diff↔tokens by issue key', () => {
      const r = runCli([
        'cost-drivers',
        '--repo', repoDir,
        '--from-usage', usagePath,
        '--json',
      ]);
      assert.equal(r.status, 0, r.stderr);
      const payload = JSON.parse(r.stdout);
      assert.equal(payload.metric, 'tokens');
      assert.equal(payload.joinBy, 'issue');
      assert.equal(payload.n, 2);
      // Two pairs, monotonic — Spearman should be exactly 1.
      assert.equal(payload.spearman, 1);
      // Pearson(linear) on n=2 points is also ±1.
      assert.equal(Math.abs(payload.pearsonLinear), 1);
      // ABC-12 had no diffless usage (joined), XYZ-99 did → 1 unjoined usage key.
      assert.equal(payload.unjoined.usage.length, 1);
      assert.deepEqual(payload.unjoined.usage, ['XYZ-99']);
      // README commit had no key → unmatched.
      assert.ok(payload.unmatchedCommits >= 1);
      assert.ok(Array.isArray(payload.deciles));
      assert.ok(payload.deciles.length > 0);
    });

    it('--metric turns switches the correlation dimension', () => {
      const r = runCli([
        'cost-drivers',
        '--repo', repoDir,
        '--from-usage', usagePath,
        '--metric', 'turns',
        '--json',
      ]);
      assert.equal(r.status, 0, r.stderr);
      const payload = JSON.parse(r.stdout);
      assert.equal(payload.metric, 'turns');
      assert.equal(payload.n, 2);
      // ABC-12 has 2 turns, ABC-34 has 4 → still monotonic with diff size.
      assert.equal(payload.spearman, 1);
    });

    it('default (no --json) prints a human-readable table', () => {
      const r = runCli([
        'cost-drivers',
        '--repo', repoDir,
        '--from-usage', usagePath,
      ]);
      assert.equal(r.status, 0, r.stderr);
      assert.match(r.stdout, /COST DRIVERS/);
      assert.match(r.stdout, /Join strategy:\s+issue/);
      assert.match(r.stdout, /n = 2 pairs/);
      assert.match(r.stdout, /Spearman\s+1\.000/);
      assert.match(r.stdout, /Decile table/);
    });

    it('--csv writes per-pair rows to the caller-named path', async () => {
      const out = join(scratch, 'pairs-out.csv');
      const r = runCli([
        'cost-drivers',
        '--repo', repoDir,
        '--from-usage', usagePath,
        '--csv', out,
        '--json',
      ]);
      assert.equal(r.status, 0, r.stderr);
      const csv = await readFile(out, 'utf8');
      assert.match(csv, /^key,feature,tokens\n/);
      assert.match(csv, /ABC-12,/);
      assert.match(csv, /ABC-34,/);
    });

    it('--join-by time requires --window', () => {
      const r = runCli([
        'cost-drivers',
        '--repo', repoDir,
        '--from-usage', usagePath,
        '--join-by', 'time',
      ]);
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /--window/);
    });

    it('errors on an unknown CLI flag (parseArgs strict)', () => {
      const r = runCli(['cost-drivers', '--repo', repoDir, '--from-usage', usagePath, '--nope']);
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /unknown/i);
    });
  });

  describe('dump-usage', () => {
    it('--json packs records into a single JSON array', () => {
      const r = runCli(['dump-usage', '--from-usage', usagePath, '--json']);
      assert.equal(r.status, 0, r.stderr);
      const arr = JSON.parse(r.stdout);
      assert.ok(Array.isArray(arr));
      assert.equal(arr.length, 7);
      assert.equal(arr[0].issueIdentifier, 'ABC-12');
    });

    it('default emits JSONL — one record per line', () => {
      const r = runCli(['dump-usage', '--from-usage', usagePath]);
      assert.equal(r.status, 0, r.stderr);
      const lines = r.stdout.trim().split('\n');
      assert.equal(lines.length, 7);
      // Each line is independently parseable JSON.
      for (const line of lines) {
        const rec = JSON.parse(line);
        assert.equal(rec.schemaVersion, 1);
      }
    });
  });

  describe('dump-diffs', () => {
    it('errors when --repo is missing', () => {
      const r = runCli(['dump-diffs']);
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /dump-diffs requires --repo/);
    });

    it('--json packs diff records into a single JSON array', () => {
      const r = runCli(['dump-diffs', '--repo', repoDir, '--json']);
      assert.equal(r.status, 0, r.stderr);
      const arr = JSON.parse(r.stdout);
      const keys = arr.map((d) => d.key).sort();
      assert.deepEqual(keys, ['ABC-12', 'ABC-34']);
      const big = arr.find((d) => d.key === 'ABC-34');
      assert.equal(big.additions, 300);
    });

    it('default emits JSONL — one record per line', () => {
      const r = runCli(['dump-diffs', '--repo', repoDir]);
      assert.equal(r.status, 0, r.stderr);
      const lines = r.stdout.trim().split('\n').filter((l) => l !== '');
      assert.equal(lines.length, 2);
      for (const line of lines) {
        const rec = JSON.parse(line);
        assert.ok(typeof rec.key === 'string');
      }
    });

    it('--key-pattern overrides the default issue-key regex', () => {
      const r = runCli([
        'dump-diffs',
        '--repo', repoDir,
        '--key-pattern', 'ABC-34',
        '--json',
      ]);
      assert.equal(r.status, 0, r.stderr);
      const arr = JSON.parse(r.stdout);
      assert.equal(arr.length, 1);
      assert.equal(arr[0].key, 'ABC-34');
    });
  });

  describe('correlate --pairs', () => {
    it('errors when --pairs is missing', () => {
      const r = runCli(['correlate']);
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /correlate requires --pairs/);
    });

    it('reads a CSV file and prints the readout (no git/transcripts needed)', async () => {
      const csv = 'feature,cost\n1,10\n2,40\n3,90\n4,160\n5,250\n6,360\n';
      const path = join(scratch, 'pairs.csv');
      await writeFile(path, csv);
      const r = runCli(['correlate', '--pairs', path, '--json']);
      assert.equal(r.status, 0, r.stderr);
      const payload = JSON.parse(r.stdout);
      assert.equal(payload.n, 6);
      assert.equal(payload.spearman, 1);
    });

    it('reads a JSON file of {feature, cost} pairs', async () => {
      const json = JSON.stringify([
        { feature: 1, cost: 1 },
        { feature: 2, cost: 4 },
        { feature: 3, cost: 9 },
      ]);
      const path = join(scratch, 'pairs.json');
      await writeFile(path, json);
      const r = runCli(['correlate', '--pairs', path, '--json']);
      assert.equal(r.status, 0, r.stderr);
      const payload = JSON.parse(r.stdout);
      assert.equal(payload.n, 3);
      assert.equal(payload.spearman, 1);
    });

    it('errors on malformed CSV (missing required columns)', async () => {
      const path = join(scratch, 'bad.csv');
      await writeFile(path, 'a,b\n1,2\n');
      const r = runCli(['correlate', '--pairs', path]);
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /must have header columns/);
    });

    it('--csv mirrors the input pairs to a caller-named file', async () => {
      const json = JSON.stringify([
        { feature: 1, cost: 10 },
        { feature: 2, cost: 20 },
      ]);
      const inPath = join(scratch, 'in.json');
      const outPath = join(scratch, 'mirror.csv');
      await writeFile(inPath, json);
      const r = runCli(['correlate', '--pairs', inPath, '--csv', outPath]);
      assert.equal(r.status, 0, r.stderr);
      const csv = await readFile(outPath, 'utf8');
      assert.match(csv, /^feature,cost\n/);
      assert.match(csv, /1,10/);
      assert.match(csv, /2,20/);
    });
  });
});
