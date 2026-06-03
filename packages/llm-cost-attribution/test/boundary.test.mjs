import { strict as assert } from 'node:assert';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { spawnSync } from 'node:child_process';

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK_BOUNDARY = join(PACKAGE_ROOT, 'scripts/check-boundary.mjs');

async function withFixture(files, fn) {
  const root = await mkdtemp(join(tmpdir(), 'llm-cost-boundary-'));
  try {
    for (const [path, contents] of Object.entries(files)) {
      const file = join(root, path);
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, contents);
    }
    return await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function runBoundary(root) {
  return spawnSync(process.execPath, [CHECK_BOUNDARY, '--root', root], {
    encoding: 'utf8',
  });
}

describe('boundary checker', () => {
  it('passes when configured core modules import only core modules', async () => {
    await withFixture({
      'src/forecast.mjs': "import { quantile } from './quantiles.mjs';\nexport const forecast = quantile;\n",
      'src/quantiles.mjs': 'export function quantile() { return 0; }\n',
    }, async (root) => {
      const result = runBoundary(root);
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /Boundary check passed/);
    });
  });

  it('fails when a core module imports the Linear adapter', async () => {
    await withFixture({
      'src/forecast.mjs': "import { LinearEstimateSource } from './linear-estimate-source.mjs';\nvoid LinearEstimateSource;\n",
    }, async (root) => {
      const result = runBoundary(root);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /src\/forecast\.mjs imports \.\/linear-estimate-source\.mjs/);
      assert.match(result.stderr, /Linear adapter/);
      assert.match(result.stderr, /EstimateTaggedUsageSource \/ LinearEstimateSource port/);
      assert.match(result.stderr, /docs\/architecture\/use-case-catalog\.md/);
    });
  });

  it('fails when a core module imports filesystem APIs', async () => {
    await withFixture({
      'src/forecast.mjs': "import { readFile } from 'node:fs/promises';\nvoid readFile;\n",
    }, async (root) => {
      const result = runBoundary(root);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /src\/forecast\.mjs imports node:fs\/promises/);
      assert.match(result.stderr, /filesystem API/);
      assert.match(result.stderr, /Filesystem access belongs in adapter\/CLI modules/);
    });
  });

  it('fails when correlate.mjs imports child_process', async () => {
    await withFixture({
      'src/correlate.mjs': "import { execSync } from 'node:child_process';\nvoid execSync;\n",
    }, async (root) => {
      const result = runBoundary(root);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /src\/correlate\.mjs imports node:child_process/);
      assert.match(result.stderr, /child_process API/);
      assert.match(result.stderr, /Shelling out .* belongs in `LocalGitDiffSource`/);
      assert.match(result.stderr, /DiffSource. port instead/);
      assert.match(result.stderr, /docs\/architecture\/use-case-catalog\.md/);
    });
  });

  it('fails when correlate.mjs imports bare child_process specifier', async () => {
    await withFixture({
      'src/correlate.mjs': "import cp from 'child_process';\nvoid cp;\n",
    }, async (root) => {
      const result = runBoundary(root);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /src\/correlate\.mjs imports child_process/);
      assert.match(result.stderr, /child_process API/);
    });
  });

  it('fails when cost-feature-join.mjs imports filesystem APIs', async () => {
    await withFixture({
      'src/cost-feature-join.mjs': "import { readFile } from 'node:fs/promises';\nvoid readFile;\n",
    }, async (root) => {
      const result = runBoundary(root);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /src\/cost-feature-join\.mjs imports node:fs\/promises/);
      assert.match(result.stderr, /filesystem API/);
    });
  });

  it('fails when cost-feature-join.mjs imports the Linear SDK', async () => {
    await withFixture({
      'src/cost-feature-join.mjs': "import { LinearClient } from '@linear/sdk';\nvoid LinearClient;\n",
    }, async (root) => {
      const result = runBoundary(root);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /src\/cost-feature-join\.mjs imports @linear\/sdk/);
      assert.match(result.stderr, /Linear SDK/);
    });
  });

  it('allows git-diff-source.mjs (adapter) to import child_process', async () => {
    await withFixture({
      'src/git-diff-source.mjs': "import { execFileSync } from 'node:child_process';\nexport function read() { return execFileSync('git'); }\n",
    }, async (root) => {
      const result = runBoundary(root);
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /Boundary check passed/);
    });
  });
});
