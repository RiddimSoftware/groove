#!/usr/bin/env node
/**
 * linear-agent-hooks CLI
 *
 * Installs the post-tool-use and stop hooks into Claude Code and optionally
 * Codex, validates your Linear API key, and backfills provenance comments for
 * sessions where the stop hook couldn't run (e.g. LINEAR_API_KEY wasn't set).
 *
 * Usage:
 *   npx linear-agent-hooks setup     Install hooks
 *   npx linear-agent-hooks remove    Uninstall hooks
 *   npx linear-agent-hooks backfill  Post missing provenance comments
 */

import {
  copyFileSync, mkdirSync, existsSync, readdirSync,
  readFileSync, writeFileSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOOKS_SRC = join(__dirname, '..', 'hooks');

// ---------------------------------------------------------------------------
// Shared imports from lib (available at install-time when run from the package)
// ---------------------------------------------------------------------------

const { buildCommentBody } = await import('../lib/comment.mjs');
const { findTranscript, extractPrecedingContext } = await import('../lib/transcript.mjs');

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

async function postLinearComment(issueId, body, apiKey) {
  const mutation = `
    mutation CreateComment($issueId: String!, $body: String!) {
      commentCreate(input: { issueId: $issueId, body: $body }) {
        success
      }
    }
  `;
  const res = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: apiKey },
    body: JSON.stringify({ query: mutation, variables: { issueId, body } }),
  });
  if (!res.ok) throw new Error(`Linear API ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors.map(e => e.message).join('; '));
  return json.data?.commentCreate?.success ?? false;
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

function loadDoneSet(doneFile) {
  if (!existsSync(doneFile)) return new Set();
  try {
    const ids = JSON.parse(readFileSync(doneFile, 'utf8'));
    return new Set(Array.isArray(ids) ? ids : []);
  } catch {
    return new Set();
  }
}

function saveDoneSet(doneFile, doneSet) {
  mkdirSync(dirname(doneFile), { recursive: true });
  writeFileSync(doneFile, JSON.stringify([...doneSet], null, 2) + '\n', 'utf8');
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
  console.log('\nIMPORTANT: Add your API key to your shell profile so the hooks can use it.');
  console.log('The hooks run as subprocesses that inherit Claude\'s launch environment,');
  console.log('so the key must be present before you start Claude or Codex:\n');
  console.log(`  export LINEAR_API_KEY="${apiKey}"\n`);
  console.log('This is the same key the Linear MCP server uses — no separate credential needed.\n');

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
  console.log('Missed sessions? Run: npx linear-agent-hooks backfill');
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

async function backfill() {
  console.log('\nlinear-agent-hooks backfill\n');

  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) {
    console.error('LINEAR_API_KEY is not set.');
    console.error('Export it in your shell profile and re-run:\n');
    console.error('  export LINEAR_API_KEY="lin_api_..."');
    process.exit(1);
  }

  process.stdout.write('Validating API key… ');
  const viewer = await validateLinearKey(apiKey);
  if (!viewer) {
    console.error('\nCould not validate key. Check the key and try again.');
    process.exit(1);
  }
  console.log(`✓ Connected to ${viewer.organization?.name ?? viewer.name}\n`);

  const stateDir = process.env.GROOVE_STATE_DIR ?? join(homedir(), '.groove');
  const provenanceDir = join(stateDir, 'provenance');

  if (!existsSync(provenanceDir)) {
    console.log('No provenance files found at', provenanceDir);
    console.log('Nothing to backfill — hooks have not recorded any sessions yet.');
    return;
  }

  const itemFiles = readdirSync(provenanceDir).filter(f => f.endsWith('.items.jsonl'));

  if (itemFiles.length === 0) {
    console.log('No session files found. Nothing to backfill.');
    return;
  }

  let totalPosted = 0;
  let totalSkipped = 0;

  for (const file of itemFiles.sort()) {
    const sessionId = file.replace('.items.jsonl', '');
    const itemsFile = join(provenanceDir, file);
    const doneFile = join(provenanceDir, `${sessionId}.done`);

    const contents = readFileSync(itemsFile, 'utf8').trim();
    if (!contents) continue;

    const items = contents.split('\n').filter(Boolean).map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);

    const doneSet = loadDoneSet(doneFile);

    // Only process issues not yet in the done set
    const issues = items.filter(item => item.kind === 'issue' && !doneSet.has(item.linearId));

    if (issues.length === 0) {
      totalSkipped += items.filter(i => i.kind === 'issue').length;
      continue;
    }

    const transcriptPath = findTranscript(sessionId);
    const contextTurns = parseInt(process.env.GROOVE_CONTEXT_TURNS ?? '1', 10);
    const contextMessages = extractPrecedingContext(transcriptPath, contextTurns);
    const body = buildCommentBody(sessionId, 'agent', contextMessages);

    for (const item of issues) {
      try {
        await postLinearComment(item.linearId, body, apiKey);
        doneSet.add(item.linearId);
        totalPosted++;
        console.log(`  ✓ ${item.linearId}  (session ${sessionId.slice(0, 8)}…)`);
      } catch (err) {
        console.error(`  ✗ ${item.linearId}: ${err.message}`);
      }
    }

    saveDoneSet(doneFile, doneSet);
  }

  console.log('');
  if (totalPosted > 0) {
    console.log(`Posted ${totalPosted} provenance comment(s).`);
  } else {
    console.log('All sessions already up to date — nothing new to backfill.');
  }
  if (totalSkipped > 0) {
    console.log(`Skipped ${totalSkipped} already-commented issue(s).`);
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const command = process.argv[2];
if (command === 'setup') {
  setup().catch(err => { console.error(err.message); process.exit(1); });
} else if (command === 'remove') {
  remove().catch(err => { console.error(err.message); process.exit(1); });
} else if (command === 'backfill') {
  backfill().catch(err => { console.error(err.message); process.exit(1); });
} else {
  console.log('Usage:');
  console.log('  npx linear-agent-hooks setup     Install hooks');
  console.log('  npx linear-agent-hooks remove    Uninstall hooks');
  console.log('  npx linear-agent-hooks backfill  Post missing provenance comments');
  process.exit(0);
}
