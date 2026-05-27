#!/usr/bin/env node
/**
 * linear-agent-hooks setup
 *
 * Installs the post-tool-use and stop hooks into Claude Code and optionally
 * Codex, and validates your Linear API key.
 *
 * Usage:
 *   npx linear-agent-hooks setup
 *   npx linear-agent-hooks remove
 */

import { copyFileSync, mkdirSync, existsSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOOKS_SRC = join(__dirname, '..', 'hooks');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

async function validateLinearKey(apiKey) {
  try {
    const res = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: apiKey },
      body: JSON.stringify({ query: '{ viewer { name organization { name } } }' }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data?.viewer ?? null;
  } catch {
    return null;
  }
}

function readJSON(filePath) {
  if (!existsSync(filePath)) return {};
  try { return JSON.parse(readFileSync(filePath, 'utf8')); }
  catch { return {}; }
}

function writeJSON(filePath, data) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

// ---------------------------------------------------------------------------
// Claude Code settings.json patching
// ---------------------------------------------------------------------------

const HOOK_MARKER = 'groove/linear-agent-hooks';

function buildClaudeHooks(hooksInstallDir) {
  return {
    PostToolUse: [
      {
        // groove marker so we can find and remove our entries
        _groove: HOOK_MARKER,
        matcher: 'mcp__.*__save_(issue|project|initiative)',
        hooks: [{ type: 'command', command: `node "${join(hooksInstallDir, 'post-tool-use.mjs')}"` }],
      },
    ],
    Stop: [
      {
        _groove: HOOK_MARKER,
        hooks: [{ type: 'command', command: `node "${join(hooksInstallDir, 'stop.mjs')}"` }],
      },
    ],
  };
}

function patchClaudeSettings(settingsPath, hooksInstallDir) {
  const settings = readJSON(settingsPath);
  if (!settings.hooks) settings.hooks = {};

  const newHooks = buildClaudeHooks(hooksInstallDir);

  for (const [event, entries] of Object.entries(newHooks)) {
    if (!Array.isArray(settings.hooks[event])) settings.hooks[event] = [];
    // Remove any existing groove entries for this event
    settings.hooks[event] = settings.hooks[event].filter(e => e._groove !== HOOK_MARKER);
    settings.hooks[event].push(...entries);
  }

  writeJSON(settingsPath, settings);
}

function removeClaudeSettings(settingsPath) {
  if (!existsSync(settingsPath)) return false;
  const settings = readJSON(settingsPath);
  if (!settings.hooks) return false;

  let removed = false;
  for (const event of Object.keys(settings.hooks)) {
    const before = settings.hooks[event].length;
    settings.hooks[event] = settings.hooks[event].filter(e => e._groove !== HOOK_MARKER);
    if (settings.hooks[event].length < before) removed = true;
  }

  if (removed) writeJSON(settingsPath, settings);
  return removed;
}

// ---------------------------------------------------------------------------
// Codex hooks.json patching
// ---------------------------------------------------------------------------

function buildCodexHooks(hooksInstallDir) {
  return {
    postToolUse: [
      {
        _groove: HOOK_MARKER,
        matcher: 'mcp__.*__save_(issue|project|initiative)',
        command: `node "${join(hooksInstallDir, 'post-tool-use.mjs')}"`,
      },
    ],
    stop: [
      {
        _groove: HOOK_MARKER,
        command: `node "${join(hooksInstallDir, 'stop.mjs')}"`,
      },
    ],
  };
}

function patchCodexSettings(hooksPath, hooksInstallDir) {
  const hooks = readJSON(hooksPath);
  const newHooks = buildCodexHooks(hooksInstallDir);

  for (const [event, entries] of Object.entries(newHooks)) {
    if (!Array.isArray(hooks[event])) hooks[event] = [];
    hooks[event] = hooks[event].filter(e => e._groove !== HOOK_MARKER);
    hooks[event].push(...entries);
  }

  writeJSON(hooksPath, hooks);
}

function removeCodexSettings(hooksPath) {
  if (!existsSync(hooksPath)) return false;
  const hooks = readJSON(hooksPath);
  let removed = false;
  for (const event of Object.keys(hooks)) {
    if (!Array.isArray(hooks[event])) continue;
    const before = hooks[event].length;
    hooks[event] = hooks[event].filter(e => e._groove !== HOOK_MARKER);
    if (hooks[event].length < before) removed = true;
  }
  if (removed) writeJSON(hooksPath, hooks);
  return removed;
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function setup() {
  console.log('\nlinear-agent-hooks setup\n');

  // 1. Linear API key
  let apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) {
    apiKey = await ask('Linear API key (lin_api_...): ');
  }

  if (!apiKey) {
    console.error('No API key provided. Set LINEAR_API_KEY in your environment and re-run.');
    process.exit(1);
  }

  process.stdout.write('Validating API key… ');
  const viewer = await validateLinearKey(apiKey);
  if (!viewer) {
    console.error('\nCould not validate key against Linear API. Check the key and try again.');
    process.exit(1);
  }
  console.log(`✓ Connected to ${viewer.organization?.name ?? viewer.name}\n`);

  // 2. Install hook scripts
  const hooksInstallDir = join(homedir(), '.groove', 'hooks');
  mkdirSync(hooksInstallDir, { recursive: true });
  copyFileSync(join(HOOKS_SRC, 'post-tool-use.mjs'), join(hooksInstallDir, 'post-tool-use.mjs'));
  copyFileSync(join(HOOKS_SRC, 'stop.mjs'), join(hooksInstallDir, 'stop.mjs'));
  console.log(`✓ Hook scripts installed to ${hooksInstallDir}`);

  // 3. API key guidance
  console.log('\nAdd your API key to your shell profile so the hooks can use it:');
  console.log(`  export LINEAR_API_KEY="${apiKey}"\n`);

  // 4. Patch Claude Code settings
  const claudeSettings = join(homedir(), '.claude', 'settings.json');
  patchClaudeSettings(claudeSettings, hooksInstallDir);
  console.log(`✓ Claude Code configured (${claudeSettings})`);

  // 5. Optionally patch Codex
  const codexHooks = join(homedir(), '.codex', 'hooks.json');
  if (existsSync(join(homedir(), '.codex'))) {
    patchCodexSettings(codexHooks, hooksInstallDir);
    console.log(`✓ Codex configured (${codexHooks})`);
  } else {
    const answer = await ask('\nConfigure Codex too? [y/N] ');
    if (answer.toLowerCase().startsWith('y')) {
      patchCodexSettings(codexHooks, hooksInstallDir);
      console.log(`✓ Codex configured (${codexHooks})`);
    }
  }

  console.log('\nDone. After your next Claude Code session creates a Linear issue,');
  console.log('a provenance comment will appear on it automatically.');
  console.log('\nVerify hooks are active: open Claude Code and type /hooks');
}

async function remove() {
  console.log('\nlinear-agent-hooks remove\n');

  const claudeSettings = join(homedir(), '.claude', 'settings.json');
  const removed = removeClaudeSettings(claudeSettings);
  if (removed) console.log(`✓ Removed from Claude Code settings`);

  const codexHooks = join(homedir(), '.codex', 'hooks.json');
  const removedCodex = removeCodexSettings(codexHooks);
  if (removedCodex) console.log(`✓ Removed from Codex hooks`);

  if (!removed && !removedCodex) {
    console.log('No groove hooks found in settings files.');
  }

  console.log('\nHook scripts remain at ~/.groove/hooks/ — delete manually if desired.');
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const command = process.argv[2];
if (command === 'setup') {
  setup().catch(err => { console.error(err.message); process.exit(1); });
} else if (command === 'remove') {
  remove().catch(err => { console.error(err.message); process.exit(1); });
} else {
  console.log('Usage:');
  console.log('  npx linear-agent-hooks setup   Install hooks');
  console.log('  npx linear-agent-hooks remove  Uninstall hooks');
  process.exit(0);
}
