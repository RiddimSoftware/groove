import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  DEFAULT_CWD_PATTERN,
  issueFromClaudeProjectDirName,
  issueFromCwd,
} from '../src/issue-pattern.mjs';

describe('DEFAULT_CWD_PATTERN against raw Codex cwd strings', () => {
  it('extracts the issue identifier from a Symphony workspace path', () => {
    const cwd = '/Users/sunny/code/epac/.symphony/workspaces/EPAC-1940';
    assert.equal(issueFromCwd(cwd, DEFAULT_CWD_PATTERN), 'EPAC-1940');
  });

  it('returns null for a path that is not a Symphony workspace', () => {
    const cwd = '/Users/sunny/code/epac';
    assert.equal(issueFromCwd(cwd, DEFAULT_CWD_PATTERN), null);
  });

  it('requires the issue id to be at the end of the path', () => {
    const cwd = '/Users/sunny/code/epac/.symphony/workspaces/EPAC-1940/src';
    assert.equal(issueFromCwd(cwd, DEFAULT_CWD_PATTERN), null);
  });
});

describe('DEFAULT_CWD_PATTERN against encoded Claude project directory names', () => {
  it('extracts the issue identifier from an encoded Symphony workspace name', () => {
    const dirName = '-Users-sunny-code-epac--symphony-workspaces-EPAC-1940';
    assert.equal(issueFromClaudeProjectDirName(dirName, DEFAULT_CWD_PATTERN), 'EPAC-1940');
  });

  it('returns null for an encoded non-Symphony cwd', () => {
    const dirName = '-Users-sunny-code-some-other-project';
    assert.equal(issueFromClaudeProjectDirName(dirName, DEFAULT_CWD_PATTERN), null);
  });

  it('handles multiple team prefixes (FAC, WEB, AGENT, etc.)', () => {
    assert.equal(
      issueFromClaudeProjectDirName('-Users-x-software-factory--symphony-workspaces-FAC-67', DEFAULT_CWD_PATTERN),
      'FAC-67',
    );
    assert.equal(
      issueFromClaudeProjectDirName('-Users-x-riddim-website--symphony-workspaces-WEB-175', DEFAULT_CWD_PATTERN),
      'WEB-175',
    );
  });
});

describe('caller-supplied patterns', () => {
  it('supports a "/issues/<num>" convention', () => {
    const pattern = /\/issues\/(\d+)$/;
    assert.equal(issueFromCwd('/Users/x/code/issues/1234', pattern), '1234');
    assert.equal(issueFromCwd('/Users/x/code/issues/1234/src', pattern), null);
  });

  it('supports a worktree-suffix convention like `<repo>-PROJ-12`', () => {
    const pattern = /-([A-Z]+-\d+)$/;
    assert.equal(issueFromCwd('/Users/x/code/myrepo-PROJ-12', pattern), 'PROJ-12');
  });
});
