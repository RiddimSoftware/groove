import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  DEFAULT_DENY_PATTERNS,
  buildDenyPatterns,
  scanText,
} from '../src/sanitize.mjs';

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Test inputs are assembled from unicode escapes so this file's own source
// never contains the literal byte sequences the scanner flags — otherwise
// the "committed package tree is clean" test would trip on its own fixtures.
const SLASH = '/';
const U = `${SLASH}Users`;                // "/Users"
const H = `${SLASH}home`;                 // "/home"
const SYM = `.symphony${SLASH}workspaces`; // ".symphony/workspaces"

describe('scanText - synthetic fixtures', () => {
  it('returns no findings for a clean tree of synthetic, opaque content', () => {
    const text = [
      '// Tracked in EPAC-1999.',
      'const ISSUE = "GRV-42";',
      'export const x = 42;',
    ].join('\n');
    assert.deepEqual(scanText(text), []);
  });

  it('flags an absolute /Users/<name> path and reports the line + column', () => {
    const text = `first line\nconst cwd = "${U}/alice/proj";\nthird line`;
    const findings = scanText(text);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].patternName, 'home-path-users');
    assert.equal(findings[0].line, 2);
    assert.equal(findings[0].match, `${U}/alice`);
  });

  it('flags an absolute /home/<name> path', () => {
    const findings = scanText(`cwd = "${H}/bob/proj"`);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].patternName, 'home-path-home');
  });

  it('flags a .symphony/workspaces/<ID> path shape', () => {
    const findings = scanText(`see ${SYM}/EPAC-1940 for context`);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].patternName, 'symphony-workspace-path');
    assert.equal(findings[0].match, `${SYM}/EPAC-1940`);
  });

  it('allows opaque tracker IDs on their own (no path context)', () => {
    // Acceptance criterion: opaque IDs like EPAC-1999 must not be flagged.
    assert.deepEqual(scanText('Tracked in EPAC-1999 and GRV-42.'), []);
  });

  it('flags configured private repo names via buildDenyPatterns', () => {
    const patterns = buildDenyPatterns({ privateRepoNames: ['secret-repo'] });
    const findings = scanText('we ship to secret-repo nightly', patterns);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].patternName, 'private-repo:secret-repo');
  });

  it('private repo matching is whole-word (does not match substrings)', () => {
    const patterns = buildDenyPatterns({ privateRepoNames: ['epac'] });
    assert.deepEqual(scanText('we use epacenter', patterns), []);
    assert.equal(scanText('we use epac internally', patterns).length, 1);
  });

  it('escapes regex metacharacters in private repo names', () => {
    // A name containing regex metacharacters must be matched literally.
    const patterns = buildDenyPatterns({ privateRepoNames: ['my.repo'] });
    assert.equal(scanText('myXrepo', patterns).length, 0);
    assert.equal(scanText('my.repo', patterns).length, 1);
  });

  it('DEFAULT_DENY_PATTERNS covers the three documented categories', () => {
    const names = DEFAULT_DENY_PATTERNS.map((p) => p.name).sort();
    assert.deepEqual(names, [
      'home-path-home',
      'home-path-users',
      'symphony-workspace-path',
    ]);
  });
});

describe('committed package tree contains no leaked org/personal data', () => {
  it('every git-tracked file in the package scans clean', async () => {
    const files = listCommittedPackageFiles();
    const patterns = buildDenyPatterns();
    const offenses = [];
    for (const rel of files) {
      const full = join(PACKAGE_ROOT, rel);
      let text;
      try {
        text = await readFile(full, 'utf8');
      } catch {
        continue; // unreadable / binary — skip.
      }
      for (const f of scanText(text, patterns)) {
        offenses.push(
          `${rel}:${f.line}:${f.column}: ${f.description} (matched "${f.match}")`,
        );
      }
    }
    assert.equal(
      offenses.length,
      0,
      `leak-safety guard found offending content:\n  ${offenses.join('\n  ')}`,
    );
  });
});

function listCommittedPackageFiles() {
  // `git ls-files -- .` (run from the package root) lists committed files
  // under the package only. This is the canonical "what would ship" set:
  // node_modules and any local-only artifact like backfill.out are
  // gitignored and therefore excluded automatically.
  const result = spawnSync('git', ['ls-files', '-z', '--', '.'], {
    cwd: PACKAGE_ROOT,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(
      `git ls-files failed (status ${result.status}): ${result.stderr ?? ''}`,
    );
  }
  return result.stdout.split('\0').filter(Boolean);
}
