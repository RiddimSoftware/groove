#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT_DIR = join(REPO_ROOT, 'test/project-acceptance/llm-cost-architecture-contracts');
const ACCEPTANCE_FILE_SUFFIXES = ['.test.mjs', '.check.mjs'];
const startedAt = Date.now();

function parseArgs(args) {
  const options = {
    quiet: false,
    verbose: false,
    help: false,
  };

  for (const arg of args) {
    if (arg === '--quiet' || arg === '-q') {
      options.quiet = true;
      continue;
    }

    if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    throw new Error(`unknown argument: ${arg}`);
  }

  if (options.quiet && options.verbose) {
    throw new Error('--quiet and --verbose cannot be used together');
  }

  return options;
}

function relativePath(path) {
  return relative(REPO_ROOT, path).replaceAll('\\', '/');
}

function collectAcceptanceFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name));
  const files = [];

  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectAcceptanceFiles(path));
      continue;
    }

    if (entry.isFile() && ACCEPTANCE_FILE_SUFFIXES.some((suffix) => entry.name.endsWith(suffix))) {
      files.push(path);
    }
  }

  return files;
}

function elapsedSeconds() {
  return ((Date.now() - startedAt) / 1000).toFixed(1);
}

function printUsage(writeLine = (line) => console.log(line)) {
  writeLine('Usage: npm run project-acceptance -- [--quiet|--verbose]');
  writeLine(`Runs *.test.mjs and *.check.mjs files under ${relativePath(PROJECT_DIR)} with node --test.`);
}

let options;
try {
  options = parseArgs(process.argv.slice(2));
} catch (error) {
  printUsage((line) => console.error(line));
  console.error(`project-acceptance failed: ${error.message}`);
  process.exit(1);
}

if (options.help) {
  printUsage();
  console.log('project-acceptance help shown - no checks run');
  process.exit(0);
}

function log(message) {
  if (!options.quiet) console.log(message);
}

log(`project-acceptance: llm-cost architecture contracts - scanning ${relativePath(PROJECT_DIR)}`);

let files;
try {
  files = collectAcceptanceFiles(PROJECT_DIR);
} catch (error) {
  console.error(`Reason: ${error.message}`);
  console.error('Next step: restore the acceptance directory or remove the temporary gate during project closeout.');
  console.error(`project-acceptance failed in ${elapsedSeconds()}s: cannot read ${relativePath(PROJECT_DIR)}.`);
  process.exit(1);
}

if (files.length === 0) {
  console.error('Next step: add a project acceptance/check file or remove the temporary gate during project closeout.');
  console.error(
    `project-acceptance failed in ${elapsedSeconds()}s: no *.test.mjs or *.check.mjs files found under ${relativePath(PROJECT_DIR)}.`,
  );
  process.exit(1);
}

if (options.verbose) {
  for (const file of files) log(`project-acceptance: discovered ${relativePath(file)}`);
}

log(`project-acceptance: running ${files.length} acceptance/check file(s) with node --test`);

const result = spawnSync(process.execPath, ['--test', ...files], {
  cwd: REPO_ROOT,
  encoding: options.quiet ? 'utf8' : undefined,
  stdio: options.quiet ? 'pipe' : 'inherit',
});

if (result.error !== undefined) {
  console.error(`project-acceptance failed in ${elapsedSeconds()}s: ${result.error.message}`);
  process.exit(1);
}

if (result.status !== 0) {
  if (options.quiet) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
  }

  console.error(
    `project-acceptance failed in ${elapsedSeconds()}s - ${files.length} file(s) under ${relativePath(PROJECT_DIR)}`,
  );
  process.exit(result.status ?? 1);
}

console.log(
  `project-acceptance passed in ${elapsedSeconds()}s - ${files.length} file(s) under ${relativePath(PROJECT_DIR)}`,
);
