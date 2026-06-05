import { strict as assert } from 'node:assert';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';

import {
  extractReadyUseImports,
  runAlignmentCheck,
} from './check-llm-cost-catalog-api-alignment.mjs';

describe('llm-cost catalog/API alignment acceptance check', () => {
  it('extracts named README imports from ready-use JavaScript examples', () => {
    const imports = extractReadyUseImports(`Intro

\`\`\`js
import {
  computeIssueCost,
  computeIssueCostFromUsage as fromUsage,
} from 'demo-cost';
\`\`\`

\`\`\`bash
import { notJavaScript } from 'demo-cost'
\`\`\`
`, 'demo-cost');

    assert.deepEqual(imports, [
      { name: 'computeIssueCost', line: 4 },
      { name: 'computeIssueCostFromUsage', line: 4 },
    ]);
  });

  it('fails when a README-ready package has no use-case catalog', async () => {
    const root = await makeFixtureRoot();
    await writePackage(root, {
      name: 'demo-cost',
      files: {
        'src/index.mjs': 'export function computeIssueCost() { return {}; }\n',
        'README.md': "```js\nimport { computeIssueCost } from 'demo-cost';\n```\n",
      },
    });

    const findings = await runAlignmentCheck({
      root,
      packages: [packageConfig('demo-cost')],
    });

    assert.equal(findings.length, 1);
    assert.equal(findings[0].code, 'missing-catalog');
    assert.equal(findings[0].file, 'packages/demo-cost/docs/use-cases.md');
  });

  it('fails when a ready-use README import is a not-implemented barrel function', async () => {
    const root = await makeFixtureRoot();
    await writePackage(root, {
      name: 'demo-cost',
      files: {
        'src/index.mjs': "export function forecastProjectCost() { throw new Error('not implemented'); }\n",
        'README.md': "```js\nimport { forecastProjectCost } from 'demo-cost';\n```\n",
        'docs/use-cases.md': "# Use-Case Catalog\n\n## ForecastProjectCost\n\n**Status:** Planned - stub throws `Error('not implemented')`.\n",
      },
    });

    const findings = await runAlignmentCheck({
      root,
      packages: [packageConfig('demo-cost')],
    });

    assert.equal(findings.length, 1);
    assert.equal(findings[0].code, 'readme-imports-stub-api');
    assert.match(findings[0].message, /forecastProjectCost/);
  });

  it('fails when a catalog describes an implemented barrel export as planned', async () => {
    const root = await makeFixtureRoot();
    await writePackage(root, {
      name: 'demo-cost',
      files: {
        'src/index.mjs': 'export function forecastIssueCost() { return { empty: true }; }\n',
        'README.md': "```js\nimport { forecastIssueCost } from 'demo-cost';\n```\n",
        'docs/use-cases.md': "# Use-Case Catalog\n\n## ForecastIssueCost\n\n**Status:** Planned - stub throws `Error('not implemented')`.\n",
      },
    });

    const findings = await runAlignmentCheck({
      root,
      packages: [packageConfig('demo-cost')],
    });

    assert.equal(findings.length, 1);
    assert.equal(findings[0].code, 'catalog-marks-ready-api-planned');
    assert.match(findings[0].file, /docs\/use-cases\.md:3$/);
  });

  it('passes when ready README APIs are cataloged and stubs are not advertised as ready', async () => {
    const root = await makeFixtureRoot();
    await writePackage(root, {
      name: 'demo-cost',
      files: {
        'src/index.mjs': `
export function computeIssueCost() { return {}; }
export function forecastProjectCost() { throw new Error('not implemented'); }
`,
        'README.md': "```js\nimport { computeIssueCost } from 'demo-cost';\n```\n",
        'docs/use-cases.md': `
# Use-Case Catalog

## ComputeIssueCost

Ready implementation.

## ForecastProjectCost

**Status:** Planned - stub throws \`Error('not implemented')\`.
`,
      },
    });

    const findings = await runAlignmentCheck({
      root,
      packages: [packageConfig('demo-cost')],
    });

    assert.deepEqual(findings, []);
  });
});

async function makeFixtureRoot() {
  return mkdtemp(join(tmpdir(), 'catalog-api-alignment-'));
}

async function writePackage(root, { name, files }) {
  const packageRoot = join(root, 'packages', name);
  await mkdir(packageRoot, { recursive: true });
  for (const [path, content] of Object.entries(files)) {
    const fullPath = join(packageRoot, path);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, content);
  }
}

function packageConfig(name) {
  return {
    name,
    packageDir: `packages/${name}`,
    barrel: 'src/index.mjs',
    readme: 'README.md',
    catalog: 'docs/use-cases.md',
    remediation: {
      missingCatalog: `Add packages/${name}/docs/use-cases.md.`,
      missingEntry: `Catalog the ready ${name} API.`,
      stubReadme: `Remove stubbed ${name} APIs from ready-use README examples.`,
      plannedReady: `Update the ${name} catalog status.`,
    },
  };
}
