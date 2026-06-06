import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, '..');
const USE_CASE_DIR = resolve(PACKAGE_ROOT, 'src', 'use-cases');

test('core use-case modules avoid process, child_process, direct fetch, and env reads', async () => {
  const files = await findMjsFiles(USE_CASE_DIR);
  const violations = [];

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    if (/\bfrom\s+['"]node:process['"]/.test(source)) violations.push(`${file}: imports node:process`);
    if (/\bfrom\s+['"]node:child_process['"]/.test(source)) violations.push(`${file}: imports node:child_process`);
    if (/\bprocess\.env\b/.test(source)) violations.push(`${file}: reads process.env`);
    if (/\bfetch\s*\(/.test(source)) violations.push(`${file}: calls fetch`);
  }

  assert.deepEqual(
    violations.map((file) => relative(PACKAGE_ROOT, file)),
    [],
  );
});

async function findMjsFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findMjsFiles(path));
    } else if (entry.name.endsWith('.mjs')) {
      files.push(path);
    }
  }
  return files;
}
