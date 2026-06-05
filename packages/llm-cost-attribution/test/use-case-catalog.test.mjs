import { strict as assert } from 'node:assert';
import { access, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = join(PACKAGE_ROOT, '..', '..');
const CATALOG_PATH = join(REPO_ROOT, 'docs/architecture/use-case-catalog.md');
const INDEX_PATH = join(PACKAGE_ROOT, 'src/index.mjs');

const DURABLE_ATTRIBUTION_APIS = [
  {
    useCase: 'ForecastIssueCost',
    exportName: 'forecastIssueCost',
    implementation: 'packages/llm-cost-attribution/src/forecast.mjs',
  },
  {
    useCase: 'JoinCostWithFeature',
    exportName: 'joinCostWithFeature',
    implementation: 'packages/llm-cost-attribution/src/cost-feature-join.mjs',
  },
  {
    useCase: 'ForecastProjectCost',
    exportName: 'forecastProjectCost',
    implementation: 'packages/llm-cost-attribution/src/project-forecast.mjs',
  },
  {
    useCase: 'ReadGitDiffs',
    exportName: 'readGitDiffs',
    implementation: 'packages/llm-cost-attribution/src/git-diff-source.mjs',
  },
  {
    useCase: 'CorrelateCostWithFeature',
    exportName: 'correlateCostWithFeature',
    implementation: 'packages/llm-cost-attribution/src/correlate.mjs',
  },
];

describe('attribution use-case catalog alignment', () => {
  it('documents each durable attribution API with a live implementation path', async () => {
    const [catalog, indexSource] = await Promise.all([
      readFile(CATALOG_PATH, 'utf8'),
      readFile(INDEX_PATH, 'utf8'),
    ]);

    for (const api of DURABLE_ATTRIBUTION_APIS) {
      const section = catalogSection(catalog, api.useCase);
      assert.notEqual(section, null, `docs catalog must include ${api.useCase}`);
      assert.match(section, new RegExp(`Current implementation: \`${escapeRegExp(api.implementation)}\``));
      assert.ok(hasNamedExport(indexSource, api.exportName), `src/index.mjs must export ${api.exportName}`);

      const implementationPath = join(REPO_ROOT, api.implementation);
      await access(implementationPath);
      const implementationSource = await readFile(implementationPath, 'utf8');
      assert.ok(
        hasNamedExport(implementationSource, api.exportName),
        `${api.implementation} must export ${api.exportName}`,
      );
    }
  });
});

function catalogSection(catalog, useCaseName) {
  const start = catalog.indexOf(`### ${useCaseName}\n`);
  if (start === -1) return null;
  const rest = catalog.slice(start);
  const next = rest.slice(1).search(/\n### /);
  return next === -1 ? rest : rest.slice(0, next + 1);
}

function hasNamedExport(source, exportName) {
  const escaped = escapeRegExp(exportName);
  return new RegExp(`\\bexport\\s+(?:async\\s+)?(?:function\\s*\\*?\\s*|class\\s+|const\\s+|let\\s+|var\\s+)${escaped}\\b`).test(source) ||
    new RegExp(`\\bexport\\s*\\{[\\s\\S]*?\\b${escaped}\\b[\\s\\S]*?\\}`).test(source);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
