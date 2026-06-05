#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const BOUNDARY_CONFIG = {
  coreModules: [
    'src/aggregator.mjs',
    'src/usage-aggregator.mjs',
    'src/multi-issue.mjs',
    'src/forecast.mjs',
    'src/quantiles.mjs',
    'src/project-forecast.mjs',
    'src/enrich.mjs',
    'src/correlate.mjs',
    'src/cost-feature-join.mjs',
    'src/attribution-ports.mjs',
    'src/attribution-workflow.mjs',
  ],
  adapterModules: [
    { path: 'src/linear-estimate-source.mjs', kind: 'Linear adapter' },
    { path: 'src/pricing.mjs', kind: 'pricing adapter/access point' },
    { path: 'src/quota.mjs', kind: 'quota adapter/access point' },
    { path: 'src/transcripts/', kind: 'transcript filesystem adapter' },
    { path: 'src/usage-jsonl.mjs', kind: 'usage JSONL filesystem adapter' },
    { path: 'src/attribution-adapters.mjs', kind: 'attribution transcript/usage adapter' },
    { path: 'src/util.mjs', kind: 'filesystem utility adapter' },
    { path: 'src/git-diff-source.mjs', kind: 'local-git diff adapter' },
    { path: 'bin/', kind: 'CLI adapter' },
  ],
  forbiddenPackages: [
    {
      pattern: /^(?:node:)?fs(?:\/promises)?$/,
      kind: 'filesystem API',
      remediation: 'Filesystem access belongs in adapter/CLI modules. Depend on a port instead.',
    },
    {
      pattern: /^(?:node:)?https?$/,
      kind: 'HTTP API',
      remediation: 'HTTP access belongs in LinearEstimateSource or another adapter. Depend on a port instead.',
    },
    {
      pattern: /^@linear(?:\/|$)/,
      kind: 'Linear SDK',
      remediation: 'Depend on the EstimateTaggedUsageSource / LinearEstimateSource port instead.',
    },
    {
      pattern: /^(?:node:)?child_process$/,
      kind: 'child_process API',
      remediation: 'Shelling out (e.g. `git`) belongs in `LocalGitDiffSource`. The correlate core and join logic depend only on in-memory data — depend on the `DiffSource` port instead.',
    },
  ],
  docsPath: 'docs/architecture/use-case-catalog.md',
};

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = normalize(join(SCRIPT_DIR, '..'));

export function findBoundaryViolations(rootDir = DEFAULT_ROOT, config = BOUNDARY_CONFIG) {
  const root = normalize(rootDir);
  const adapterEntries = config.adapterModules.map((entry) => ({
    ...entry,
    path: normalizeRelative(entry.path),
  }));
  const violations = [];

  for (const coreModule of config.coreModules) {
    const sourcePath = normalizeRelative(coreModule);
    const absoluteSourcePath = join(root, sourcePath);
    if (!existsSync(absoluteSourcePath)) continue;

    const source = readFileSync(absoluteSourcePath, 'utf8');
    for (const specifier of extractImportSpecifiers(source)) {
      const packageViolation = findForbiddenPackage(specifier, config.forbiddenPackages);
      if (packageViolation !== null) {
        violations.push(formatPackageViolation(sourcePath, specifier, packageViolation, config.docsPath));
        continue;
      }

      const resolvedPath = resolveRelativeImport(root, sourcePath, specifier);
      if (resolvedPath === null) continue;
      const adapterViolation = findAdapterImport(resolvedPath, adapterEntries);
      if (adapterViolation !== null) {
        violations.push(formatAdapterViolation(
          sourcePath,
          specifier,
          resolvedPath,
          adapterViolation.kind,
          config.docsPath,
        ));
      }
    }
  }

  return violations;
}

export function extractImportSpecifiers(source) {
  const stripped = stripComments(source);
  const specifiers = [];
  const patterns = [
    /\bimport\s+(?:[^'"()]*?\s+from\s*)?["']([^"']+)["']/g,
    /\bexport\s+[^"']*?\s+from\s*["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(stripped)) !== null) {
      specifiers.push(match[1]);
    }
  }
  return specifiers;
}

function stripComments(source) {
  let out = '';
  let i = 0;
  let quote = null;
  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];

    if (quote !== null) {
      out += ch;
      if (ch === '\\') {
        out += next ?? '';
        i += 2;
        continue;
      }
      if (ch === quote) quote = null;
      i += 1;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      out += ch;
      i += 1;
      continue;
    }

    if (ch === '/' && next === '/') {
      while (i < source.length && source[i] !== '\n') i += 1;
      out += '\n';
      continue;
    }

    if (ch === '/' && next === '*') {
      i += 2;
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) i += 1;
      i += 2;
      out += ' ';
      continue;
    }

    out += ch;
    i += 1;
  }
  return out;
}

function findForbiddenPackage(specifier, rules) {
  return rules.find((rule) => rule.pattern.test(specifier)) ?? null;
}

function resolveRelativeImport(root, sourcePath, specifier) {
  if (!specifier.startsWith('.')) return null;
  const absolute = normalize(join(root, dirname(sourcePath), specifier));
  const resolved = isAbsolute(absolute) ? absolute : join(root, absolute);
  const relativePath = normalize(relative(root, resolved));
  return normalizeRelative(relativePath);
}

function findAdapterImport(resolvedPath, adapterEntries) {
  return adapterEntries.find((entry) => {
    if (entry.path.endsWith('/')) return resolvedPath.startsWith(entry.path);
    return resolvedPath === entry.path;
  }) ?? null;
}

function formatPackageViolation(sourcePath, specifier, violation, docsPath) {
  return `${sourcePath} imports ${specifier} (${violation.kind}) - ${violation.remediation} See ${docsPath}.`;
}

function formatAdapterViolation(sourcePath, specifier, resolvedPath, kind, docsPath) {
  return (
    `${sourcePath} imports ${specifier} (${kind}; resolves to ${resolvedPath}) - ` +
    `Depend on the EstimateTaggedUsageSource / LinearEstimateSource port instead. See ${docsPath}.`
  );
}

function normalizeRelative(path) {
  return normalize(path).replaceAll('\\', '/').replace(/^\.?\//, '');
}

function parseArgs(args) {
  let root = DEFAULT_ROOT;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--root') {
      if (args[i + 1] === undefined) throw new Error('--root requires a path');
      root = args[i + 1];
      i += 1;
      continue;
    }
    throw new Error(`unknown argument: ${args[i]}`);
  }
  return { root };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let root;
  try {
    ({ root } = parseArgs(process.argv.slice(2)));
  } catch (err) {
    console.error(`Boundary check failed: ${err.message}`);
    process.exit(1);
  }

  const violations = findBoundaryViolations(root);
  if (violations.length > 0) {
    console.error('Boundary check failed: core modules imported adapters/framework details.');
    for (const violation of violations) console.error(`- ${violation}`);
    process.exit(1);
  }

  console.log('Boundary check passed: core modules have no adapter/framework imports.');
}
