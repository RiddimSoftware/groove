import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  LocalGitDiffSource,
  parseGitNumstatLog,
  readGitDiffResult,
  readGitDiffs,
} from '../src/git-diff-source.mjs';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = join(TEST_DIR, 'fixtures/git-log-numstat.txt');

async function gitLogFixture() {
  const text = await readFile(FIXTURE_PATH, 'utf8');
  return text.replaceAll('\\x1e', '\x1e').replaceAll('\\x1f', '\x1f');
}

async function collect(generator) {
  const records = [];
  while (true) {
    const next = await generator.next();
    if (next.done) return { records, summary: next.value };
    records.push(next.value);
  }
}

describe('readGitDiffs', () => {
  it('exposes LocalGitDiffSource as the local adapter', async () => {
    const source = new LocalGitDiffSource();
    const { records } = await collect(source.read('/fake/repo', {
      gitLogText: await gitLogFixture(),
    }));

    assert.equal(records.some((record) => record.key === 'ABC-12'), true);
  });

  it('sums numstat lines per commit and keys them from the subject', async () => {
    const { records, summary } = await collect(readGitDiffs('/fake/repo', {
      gitLogText: await gitLogFixture(),
    }));

    const record = records.find((candidate) => candidate.key === 'ABC-12');
    assert.deepEqual(record, {
      key: 'ABC-12',
      additions: 100,
      deletions: 30,
      changedFiles: 1,
      shas: ['1111111111111111111111111111111111111111'],
    });
    assert.equal(record.additions + record.deletions, 130);
    assert.equal(summary.error, null);
  });

  it('aggregates multiple commits for one key and lists every sha', async () => {
    const log = `${await gitLogFixture()}\n`
      + '\x1e5555555555555555555555555555555555555555\x1fABC-12: polish widget\n'
      + '2\t3\tsrc/widget.css\n';

    const result = parseGitNumstatLog(log);
    const record = result.records.find((candidate) => candidate.key === 'ABC-12');

    assert.equal(record.additions, 102);
    assert.equal(record.deletions, 33);
    assert.equal(record.changedFiles, 2);
    assert.deepEqual(record.shas, [
      '1111111111111111111111111111111111111111',
      '5555555555555555555555555555555555555555',
    ]);
  });

  it('counts binary numstat files without producing NaN line counts', async () => {
    const result = parseGitNumstatLog(await gitLogFixture());
    const record = result.records.find((candidate) => candidate.key === 'BIN-1');

    assert.equal(record.additions, 0);
    assert.equal(record.deletions, 0);
    assert.equal(record.changedFiles, 1);
  });

  it('surfaces unmatched commits and skips merge commits with no numstat', async () => {
    const { summary } = await collect(readGitDiffs('/fake/repo', {
      gitLogText: await gitLogFixture(),
    }));

    assert.equal(summary.unmatched.count, 1);
    assert.deepEqual(summary.unmatched.shas, ['3333333333333333333333333333333333333333']);
    assert.equal(summary.unmatched.skippedEmptyCommits, 1);
  });

  it('honors a caller supplied keyPattern', async () => {
    const log = '\x1e6666666666666666666666666666666666666666\x1fticket #123: custom key\n'
      + '4\t6\tsrc/custom.js\n';

    const result = parseGitNumstatLog(log, { keyPattern: /#\d+/ });

    assert.deepEqual(result.records, [{
      key: '#123',
      additions: 4,
      deletions: 6,
      changedFiles: 1,
      shas: ['6666666666666666666666666666666666666666'],
    }]);
  });

  it('returns an empty structured error result for a git failure', async () => {
    const result = await readGitDiffResult('/definitely/not/a/git/repo');

    assert.deepEqual(result.records, []);
    assert.equal(result.unmatched.count, 0);
    assert.match(result.error.message, /git log --numstat failed/);
  });
});
