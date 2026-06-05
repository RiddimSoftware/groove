#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_PACKAGES = [
  {
    name: 'llm-cost-attribution',
    packageDir: 'packages/llm-cost-attribution',
    barrel: 'src/index.mjs',
    readme: 'README.md',
    catalog: 'docs/use-cases.md',
    remediation: {
      missingCatalog:
        'Create packages/llm-cost-attribution/docs/use-cases.md and catalog each README-ready application API, or remove the ready-use README import until the catalog lands.',
      missingEntry:
        'Add a use-case catalog entry for the ready attribution API, including its ports/adapters and boundary rule.',
      stubReadme:
        'Move stubbed attribution APIs out of ready-use README import examples until they are implemented.',
      plannedReady:
        'Update the attribution catalog status to match the implemented barrel export, or stop exporting the API as ready.',
    },
  },
  {
    name: 'llm-cost-estimation',
    packageDir: 'packages/llm-cost-estimation',
    barrel: 'src/index.mjs',
    readme: 'README.md',
    catalog: 'docs/use-cases.md',
    remediation: {
      missingCatalog:
        'Create packages/llm-cost-estimation/docs/use-cases.md before presenting estimation APIs as ready to use.',
      missingEntry:
        'Add or update the estimation use-case catalog entry for this ready API.',
      stubReadme:
        'Remove the throwing estimation API from ready-use README imports, or implement it before advertising it as ready.',
      plannedReady:
        'Update the estimation catalog so implemented APIs are not described as planned stubs.',
    },
  },
];

const NOT_IMPLEMENTED_RE = /throw\s+new\s+Error\s*\(\s*['"]not implemented['"]\s*\)/;

export async function runAlignmentCheck(options = {}) {
  const root = resolve(options.root ?? process.cwd());
  const packageConfigs = options.packages ?? DEFAULT_PACKAGES;
  const findings = [];

  for (const packageConfig of packageConfigs) {
    const packageRoot = join(root, packageConfig.packageDir);
    const readmePath = join(packageRoot, packageConfig.readme);
    const barrelPath = join(packageRoot, packageConfig.barrel);
    const catalogPath = join(packageRoot, packageConfig.catalog);

    const barrelExports = await loadModuleExports(barrelPath, { root });
    const readme = await readText(readmePath);
    const readmeImports = extractReadyUseImports(readme, packageConfig.name);
    const catalogExists = existsSync(catalogPath);
    const catalog = catalogExists ? parseCatalog(await readText(catalogPath)) : null;

    const readyUseImports = readmeImports.filter((api) => {
      const exported = barrelExports.get(api.name);
      return exported !== undefined && exported.status !== 'stub';
    });

    if (!catalogExists && readyUseImports.some((api) => shouldRequireCatalogCoverage(api.name))) {
      findings.push({
        code: 'missing-catalog',
        packageName: packageConfig.name,
        file: relativePath(root, catalogPath),
        message: `Missing use-case catalog while README imports ready application APIs: ${readyUseImports.map((api) => api.name).join(', ')}.`,
        remediation: packageConfig.remediation?.missingCatalog ?? defaultRemediation(packageConfig.name, 'missingCatalog'),
      });
      continue;
    }

    for (const api of readmeImports) {
      const exported = barrelExports.get(api.name);
      if (exported === undefined) {
        findings.push({
          code: 'readme-imports-non-barrel-api',
          packageName: packageConfig.name,
          file: `${relativePath(root, readmePath)}:${api.line}`,
          message: `README ready-use example imports ${api.name}, but ${api.name} is not exported from ${relativePath(root, barrelPath)}.`,
          remediation: `Export ${api.name} from the ${packageConfig.name} barrel or remove it from the ready-use README example.`,
        });
        continue;
      }

      if (exported.status === 'stub') {
        findings.push({
          code: 'readme-imports-stub-api',
          packageName: packageConfig.name,
          file: `${relativePath(root, readmePath)}:${api.line}`,
          message: `README ready-use example imports ${api.name}, but the barrel implementation throws Error('not implemented') in ${relativePath(root, exported.sourcePath)}.`,
          remediation: packageConfig.remediation?.stubReadme ?? defaultRemediation(packageConfig.name, 'stubReadme'),
        });
      }
    }

    if (catalog === null) continue;

    for (const api of readyUseImports) {
      if (!shouldRequireCatalogCoverage(api.name)) continue;
      if (!catalogMentionsApi(catalog, api.name)) {
        findings.push({
          code: 'ready-api-missing-catalog-entry',
          packageName: packageConfig.name,
          file: relativePath(root, catalogPath),
          message: `Ready README/barrel API ${api.name} is not covered by the use-case catalog.`,
          remediation: packageConfig.remediation?.missingEntry ?? defaultRemediation(packageConfig.name, 'missingEntry'),
        });
      }
    }

    for (const section of catalog.sections) {
      for (const [apiName, exported] of barrelExports) {
        if (exported.status !== 'ready') continue;
        if (!sectionMatchesApi(section.title, apiName)) continue;
        if (!sectionMarksPlannedOrStubbed(section.body)) continue;
        findings.push({
          code: 'catalog-marks-ready-api-planned',
          packageName: packageConfig.name,
          file: `${relativePath(root, catalogPath)}:${section.line}`,
          message: `Catalog section "${section.title}" describes ready barrel export ${apiName} as planned/stubbed.`,
          remediation: packageConfig.remediation?.plannedReady ?? defaultRemediation(packageConfig.name, 'plannedReady'),
        });
      }
    }
  }

  return findings;
}

export function extractReadyUseImports(readmeText, packageName) {
  const imports = [];
  const lines = readmeText.split(/\r?\n/);
  let inFence = false;
  let fenceLang = '';
  let fenceStartLine = 0;
  let blockLines = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const fence = line.match(/^```\s*([A-Za-z0-9_-]*)\s*$/);
    if (fence !== null) {
      if (!inFence) {
        inFence = true;
        fenceLang = fence[1].toLowerCase();
        fenceStartLine = i + 1;
        blockLines = [];
      } else {
        if (isJavaScriptFence(fenceLang)) {
          imports.push(...extractImportsFromCode(blockLines.join('\n'), packageName, fenceStartLine + 1));
        }
        inFence = false;
        fenceLang = '';
        fenceStartLine = 0;
        blockLines = [];
      }
      continue;
    }

    if (inFence) blockLines.push(line);
  }

  return dedupeImports(imports);
}

export function parseCatalog(markdown) {
  const sections = [];
  const headingRe = /^##\s+(.+?)\s*$/gm;
  const headings = [...markdown.matchAll(headingRe)].map((match) => ({
    title: match[1].trim(),
    index: match.index ?? 0,
    line: lineNumberAt(markdown, match.index ?? 0),
  }));

  for (let i = 0; i < headings.length; i += 1) {
    const heading = headings[i];
    const next = headings[i + 1];
    sections.push({
      title: heading.title,
      line: heading.line,
      body: markdown.slice(heading.index, next?.index ?? markdown.length),
    });
  }

  return { sections };
}

export function catalogMentionsApi(catalog, apiName) {
  return catalog.sections.some((section) => (
    sectionMatchesApi(section.title, apiName) || exactWordRe(apiName).test(section.body)
  ));
}

export function sectionMatchesApi(title, apiName) {
  return normalizeName(title) === normalizeName(apiName)
    || normalizeName(title).startsWith(`${normalizeName(apiName)}supportfunction`);
}

export function sectionMarksPlannedOrStubbed(body) {
  return /\bplanned\b/i.test(body)
    || /\bstub(?:bed|s)?\b/i.test(body)
    || /not implemented/i.test(body);
}

export function shouldRequireCatalogCoverage(apiName) {
  if (/^[A-Z0-9_]+$/.test(apiName)) return false;
  if (/^create[A-Z].*Source$/.test(apiName)) return false;
  if (/^is[A-Z]/.test(apiName)) return false;
  return true;
}

export function formatFinding(finding, { verbose = false } = {}) {
  const lines = [
    `[${finding.packageName}] FAIL ${finding.file}`,
    `  ${finding.message}`,
    `  Remediation: ${finding.remediation}`,
  ];
  if (verbose) lines.push(`  Rule: ${finding.code}`);
  return lines.join('\n');
}

async function loadModuleExports(filePath, context, seen = new Set()) {
  const resolvedPath = resolve(filePath);
  context.cache ??= new Map();
  if (context.cache.has(resolvedPath)) return context.cache.get(resolvedPath);
  if (seen.has(resolvedPath)) return new Map();
  seen.add(resolvedPath);

  const code = await readText(resolvedPath);
  const exportsByName = new Map();
  context.cache.set(resolvedPath, exportsByName);
  const uncommented = stripComments(code);

  for (const match of uncommented.matchAll(/export\s+(?:async\s+)?function\s*\*?\s+([A-Za-z_$][\w$]*)\s*\(/g)) {
    const name = match[1];
    const openParenIndex = (match.index ?? 0) + match[0].length - 1;
    const bodyStart = findFunctionBodyStart(uncommented, openParenIndex);
    const body = bodyStart === -1 ? '' : extractBalancedBlock(uncommented, bodyStart);
    exportsByName.set(name, {
      name,
      status: NOT_IMPLEMENTED_RE.test(body) ? 'stub' : 'ready',
      sourcePath: resolvedPath,
    });
  }

  for (const match of uncommented.matchAll(/export\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)\b/g)) {
    const name = match[1];
    const declaration = statementAfter(uncommented, match.index ?? 0);
    exportsByName.set(name, {
      name,
      status: NOT_IMPLEMENTED_RE.test(declaration) ? 'stub' : 'ready',
      sourcePath: resolvedPath,
    });
  }

  for (const match of uncommented.matchAll(/export\s+class\s+([A-Za-z_$][\w$]*)\b/g)) {
    const name = match[1];
    exportsByName.set(name, { name, status: 'ready', sourcePath: resolvedPath });
  }

  for (const match of uncommented.matchAll(/export\s*\{([\s\S]*?)\}\s*from\s*['"]([^'"]+)['"]\s*;/g)) {
    const specs = parseExportSpecifiers(match[1]);
    const source = match[2];
    const sourcePath = resolveExportSource(source, dirname(resolvedPath), context.root);
    const sourceExports = sourcePath === null
      ? new Map()
      : await loadModuleExports(sourcePath, context, seen);

    for (const spec of specs) {
      const sourceExport = sourceExports.get(spec.imported);
      exportsByName.set(spec.exported, {
        name: spec.exported,
        status: sourceExport?.status ?? 'ready',
        sourcePath: sourceExport?.sourcePath ?? sourcePath ?? resolvedPath,
      });
    }
  }

  return exportsByName;
}

function resolveExportSource(source, fromDir, root) {
  if (source.startsWith('.')) {
    return resolve(fromDir, source);
  }

  const workspaceBarrel = join(root, 'packages', source, 'src/index.mjs');
  if (existsSync(workspaceBarrel)) return workspaceBarrel;
  return null;
}

function extractImportsFromCode(code, packageName, startLine) {
  const imports = [];
  const re = new RegExp(`import\\s*\\{([\\s\\S]*?)\\}\\s*from\\s*['"]${escapeRegExp(packageName)}['"]`, 'g');
  for (const match of code.matchAll(re)) {
    const line = startLine + lineNumberAt(code, match.index ?? 0) - 1;
    for (const name of parseNamedSpecifiers(match[1])) {
      imports.push({ name, line });
    }
  }
  return imports;
}

function parseExportSpecifiers(specifierText) {
  return specifierText
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const pieces = part.split(/\s+as\s+/i).map((piece) => piece.trim());
      return { imported: pieces[0], exported: pieces[1] ?? pieces[0] };
    });
}

function parseNamedSpecifiers(specifierText) {
  return specifierText
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.split(/\s+as\s+/i)[0].trim());
}

function dedupeImports(imports) {
  const seen = new Set();
  const deduped = [];
  for (const api of imports) {
    if (seen.has(api.name)) continue;
    seen.add(api.name);
    deduped.push(api);
  }
  return deduped;
}

function isJavaScriptFence(lang) {
  return ['', 'js', 'javascript', 'mjs', 'ts', 'typescript'].includes(lang);
}

function normalizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function exactWordRe(word) {
  return new RegExp(`(^|[^A-Za-z0-9_$])${escapeRegExp(word)}([^A-Za-z0-9_$]|$)`);
}

function lineNumberAt(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function extractBalancedBlock(text, openBraceIndex) {
  let depth = 0;
  for (let i = openBraceIndex; i < text.length; i += 1) {
    const char = text[i];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(openBraceIndex, i + 1);
    }
  }
  return text.slice(openBraceIndex);
}

function findFunctionBodyStart(text, openParenIndex) {
  let depth = 0;
  for (let i = openParenIndex; i < text.length; i += 1) {
    const char = text[i];
    if (char === '(') depth += 1;
    if (char === ')') {
      depth -= 1;
      if (depth === 0) return text.indexOf('{', i + 1);
    }
  }
  return -1;
}

function statementAfter(text, startIndex) {
  const end = text.indexOf(';', startIndex);
  return end === -1 ? text.slice(startIndex) : text.slice(startIndex, end + 1);
}

async function readText(filePath) {
  return readFile(filePath, 'utf8');
}

function relativePath(root, filePath) {
  return relative(root, filePath).replaceAll('\\', '/');
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function defaultRemediation(packageName, kind) {
  const packageLabel = packageName === undefined ? 'package' : packageName;
  if (kind === 'missingCatalog') return `Add a docs/use-cases.md catalog for ${packageLabel}.`;
  if (kind === 'missingEntry') return `Add a matching use-case catalog entry for ${packageLabel}.`;
  if (kind === 'stubReadme') return `Remove stubbed APIs from ${packageLabel} ready-use README examples.`;
  return `Align the ${packageLabel} catalog status with the barrel implementation.`;
}

function parseCliArgs(argv) {
  const args = { root: process.cwd(), quiet: false, verbose: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--quiet' || arg === '-q') {
      args.quiet = true;
    } else if (arg === '--verbose' || arg === '-v') {
      args.verbose = true;
    } else if (arg === '--root') {
      args.root = argv[i + 1];
      i += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function printFindings(findings, { quiet = false, verbose = false } = {}) {
  for (const finding of findings) {
    console.error(formatFinding(finding, { verbose }));
    if (!quiet) console.error('');
  }
}

async function main() {
  const startedAt = Date.now();
  let args;
  try {
    args = parseCliArgs(process.argv.slice(2));
  } catch (error) {
    console.error('project-acceptance - checking llm-cost catalog/API alignment');
    console.error(`FAIL project-acceptance - ${error.message}`);
    process.exitCode = 2;
    return;
  }

  if (!args.quiet) {
    console.error('project-acceptance - checking llm-cost catalog/API alignment');
    console.error('Static inputs: package barrels, package READMEs, and docs/use-cases.md catalogs only.');
  }

  const findings = await runAlignmentCheck({ root: args.root });
  if (findings.length > 0) {
    if (!args.quiet) console.error('');
    printFindings(findings, args);
    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.error(`FAIL project-acceptance - llm-cost catalog/API alignment found ${findings.length} issue(s) in ${elapsed}s`);
    process.exitCode = 1;
    return;
  }

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.error(`PASS project-acceptance - llm-cost catalog/API alignment passed in ${elapsed}s`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error('project-acceptance - checking llm-cost catalog/API alignment');
    console.error(`FAIL project-acceptance - ${error.stack ?? error.message}`);
    process.exitCode = 1;
  });
}
