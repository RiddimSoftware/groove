import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const REPO_ROOT = process.cwd();

const PACKAGES = [
  {
    name: 'llm-cost-attribution',
    packageDir: 'packages/llm-cost-attribution',
    catalogs: [
      'packages/llm-cost-attribution/docs/use-cases.md',
      'docs/architecture/use-case-catalog.md',
    ],
  },
  {
    name: 'llm-cost-estimation',
    packageDir: 'packages/llm-cost-estimation',
    catalogs: [
      'packages/llm-cost-estimation/docs/use-cases.md',
    ],
  },
];

describe('llm-cost README/barrel/catalog alignment', () => {
  for (const packageConfig of PACKAGES) {
    it(`${packageConfig.name} documents README-ready application APIs`, async () => {
      const packageRoot = join(REPO_ROOT, packageConfig.packageDir);
      const [readme, barrel, ...catalogs] = await Promise.all([
        readFile(join(packageRoot, 'README.md'), 'utf8'),
        readFile(join(packageRoot, 'src/index.mjs'), 'utf8'),
        ...packageConfig.catalogs.map((catalog) => readFile(join(REPO_ROOT, catalog), 'utf8')),
      ]);

      const exportedApis = exportedNames(barrel);
      const catalogText = catalogs.join('\n\n');
      const imports = readmeImports(readme, packageConfig.name);

      assert.notEqual(imports.length, 0, `${packageConfig.name} README must include at least one ready-use import`);

      for (const apiName of imports) {
        assert.ok(
          exportedApis.has(apiName),
          `${packageConfig.name} README imports ${apiName}, but src/index.mjs does not export it`,
        );
        if (!requiresUseCaseCatalog(apiName)) continue;
        assert.ok(
          catalogMentionsApi(catalogText, apiName),
          `${packageConfig.name} README-ready API ${apiName} must be covered by a use-case catalog`,
        );
      }
    });
  }
});

function readmeImports(readme, packageName) {
  const imports = new Set();
  const exactPackage = new RegExp(`\\}\\s*from\\s*['"]${escapeRegExp(packageName)}['"]`);
  const anyPackage = /\}\s*from\s*['"][^'"]+['"]/;
  let pending = null;

  for (const line of readme.split(/\r?\n/)) {
    if (pending !== null) {
      pending.push(line);
      if (exactPackage.test(line)) addImportNames(imports, pending.join('\n'));
      if (anyPackage.test(line)) pending = null;
      continue;
    }

    const singleLine = line.match(new RegExp(`\\bimport\\s*\\{([^}]*)\\}\\s*from\\s*['"]${escapeRegExp(packageName)}['"]`));
    if (singleLine !== null) {
      addImportNames(imports, singleLine[1]);
      continue;
    }

    if (/\bimport\s*\{/.test(line)) pending = [line.replace(/^.*\bimport\s*\{/u, '')];
  }
  return [...imports].sort();
}

function addImportNames(imports, rawNames) {
  const namesOnly = rawNames
    .replace(/^.*\bimport\s*\{/su, '')
    .replace(/\}\s*from\s*['"][^'"]+['"].*$/su, '');
  for (const rawName of namesOnly.split(',')) {
    const name = rawName.trim().replace(/\s+as\s+.+$/u, '');
    if (name !== '') imports.add(name);
  }
}

function exportedNames(source) {
  const names = new Set();
  const uncommented = stripComments(source);
  for (const match of uncommented.matchAll(/\bexport\s+(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\b/g)) {
    names.add(match[1]);
  }
  for (const match of uncommented.matchAll(/\bexport\s+(?:const|let|var|class)\s+([A-Za-z_$][\w$]*)\b/g)) {
    names.add(match[1]);
  }
  for (const match of uncommented.matchAll(/\bexport\s*\{([\s\S]*?)\}\s*(?:from\s*['"][^'"]+['"])?/g)) {
    for (const rawName of match[1].split(',')) {
      const [name] = rawName.trim().split(/\s+as\s+/u);
      if (name !== '') names.add(name);
    }
  }
  return names;
}

function requiresUseCaseCatalog(apiName) {
  if (/^[A-Z0-9_]+$/.test(apiName)) return false;
  if (/^create[A-Z].*Source$/.test(apiName)) return false;
  if (/^is[A-Z]/.test(apiName)) return false;
  if (/^synthetic/.test(apiName)) return false;
  if (apiName === 'readUsageRecords') return false;
  return true;
}

function catalogMentionsApi(catalogText, apiName) {
  const normalizedApi = normalizeName(apiName);
  return exactWordRegExp(apiName).test(catalogText) || normalizeName(catalogText).includes(normalizedApi);
}

function normalizeName(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function exactWordRegExp(value) {
  return new RegExp(`(^|[^A-Za-z0-9_$])${escapeRegExp(value)}([^A-Za-z0-9_$]|$)`);
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
