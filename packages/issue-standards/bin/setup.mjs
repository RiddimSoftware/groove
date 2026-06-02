#!/usr/bin/env node
/**
 * issue-standards setup
 *
 * Installs the issue-standards skill into your Claude Code skills directory
 * so it is available as /issue-standards in any session.
 *
 * Usage:
 *   npx issue-standards setup
 */

import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILL_SRC = join(__dirname, '..', 'SKILL.md');

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] !== 'setup') {
    console.log('Usage: npx issue-standards setup');
    process.exit(0);
  }

  console.log('\nissue-standards setup\n');

  // Default skills directory — matches Claude Code's default
  const defaultSkillsDir = join(homedir(), '.claude', 'skills');
  const skillsDir = process.env.CLAUDE_SKILLS_DIR ?? defaultSkillsDir;
  const destDir = join(skillsDir, 'issue-standards');
  const destFile = join(destDir, 'SKILL.md');

  console.log(`Skill will be installed to:\n  ${destFile}\n`);

  if (existsSync(destFile)) {
    const answer = await ask('Skill already installed. Overwrite? [y/N] ');
    if (!answer.toLowerCase().startsWith('y')) {
      console.log('Aborted.');
      process.exit(0);
    }
  }

  try {
    mkdirSync(destDir, { recursive: true });
    copyFileSync(SKILL_SRC, destFile);
  } catch (err) {
    console.error(`\nFailed to install skill: ${err.message}`);
    process.exit(1);
  }

  console.log('✓ Skill installed\n');
  console.log('Verify it is active:');
  console.log('  1. Open a Claude Code session');
  console.log('  2. Type /hooks or check your skills directory');
  console.log('\nInvoke it in any session:');
  console.log('  /issue-standards\n');

  if (process.env.CLAUDE_SKILLS_DIR) {
    console.log(`Note: installed to custom directory $CLAUDE_SKILLS_DIR=${skillsDir}`);
    console.log('Make sure Claude Code is configured to load skills from that path.\n');
  }
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
