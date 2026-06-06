import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEnvironmentSecretReader } from '../adapters/environment-secret-reader.mjs';
import { createNoopLinearWorkspace } from '../adapters/noop-linear-workspace.mjs';
import { createStreamConsoleReporter } from '../adapters/stream-console-reporter.mjs';
import { defineHumanHandoffLinearPackageContract } from '../use-cases/define-human-handoff-linear-package-contract.mjs';
import { createBootstrapProjectUseCase } from '../use-cases/bootstrap-project.mjs';
import { createDoctorUseCase } from '../use-cases/doctor.mjs';
import { createSetupUseCase } from '../use-cases/setup.mjs';
import { createSyncTemplateUseCase } from '../use-cases/sync-template.mjs';

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TEMPLATE_PATH = join(PACKAGE_ROOT, 'templates', 'human-handoff-issue-body.md');

export async function runCli({ argv, env, stdout, stderr }) {
  const parsed = parseArgs(argv);
  const reporter = createStreamConsoleReporter({
    stdout,
    stderr,
    quiet: parsed.options.quiet,
    verbose: parsed.options.verbose,
  });

  if (parsed.help) {
    stdout.write(helpText());
    return 0;
  }

  if (parsed.error) {
    reporter.error(`human-handoff-linear: ${parsed.error}`);
    reporter.error('Run `human-handoff-linear --help` for usage.');
    reporter.error('human-handoff-linear failed - no mutations performed');
    return 1;
  }

  const command = parsed.command ?? 'help';
  if (command === 'help') {
    stdout.write(helpText());
    return 0;
  }

  const secretReader = createEnvironmentSecretReader(env);
  const workspace = createNoopLinearWorkspace();

  try {
    await dispatchCommand({ command, options: parsed.options, reporter, secretReader, workspace });
    stdout.write(`human-handoff-linear ${command} complete - no mutations performed\n`);
    return 0;
  } catch (err) {
    reporter.error(`human-handoff-linear ${command} failed - ${err.message}`);
    reporter.error('human-handoff-linear failed - no mutations performed');
    return 1;
  }
}

async function dispatchCommand({ command, options, reporter, secretReader, workspace }) {
  if (command === 'setup') {
    return createSetupUseCase({ reporter, secretReader, workspace })(options);
  }
  if (command === 'sync-template') {
    const templateBody = await readFile(TEMPLATE_PATH, 'utf8');
    return createSyncTemplateUseCase({ reporter, templateBody, workspace })(options);
  }
  if (command === 'doctor') {
    return createDoctorUseCase({ reporter, secretReader })(options);
  }
  if (command === 'bootstrap-project') {
    return createBootstrapProjectUseCase({ reporter, workspace })(options);
  }
  throw new Error(`Unknown command: ${command}`);
}

function parseArgs(argv) {
  const args = [...argv];
  const options = { dryRun: true, quiet: false, verbose: false, team: null };
  let help = false;
  let command = null;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      help = true;
      continue;
    }
    if (arg === '--quiet' || arg === '-q') {
      options.quiet = true;
      continue;
    }
    if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
      continue;
    }
    if (arg === '--team') {
      if (args[i + 1] === undefined) return { options, error: '--team requires a value' };
      options.team = args[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith('--team=')) {
      options.team = arg.slice('--team='.length);
      continue;
    }
    if (arg.startsWith('-')) {
      return { options, error: `Unknown option: ${arg}` };
    }
    if (command === null) {
      command = arg;
      continue;
    }
    return { options, error: `Unexpected argument: ${arg}` };
  }

  return { command, help, options };
}

function helpText() {
  const contract = defineHumanHandoffLinearPackageContract();
  const rows = contract.commands
    .map((command) => `  ${command.name.padEnd(17)} ${command.summary}`)
    .join('\n');

  return `human-handoff-linear - Linear Human Handoff workflow tools

Usage:
  human-handoff-linear <command> [options]

Commands:
${rows}

Options:
  --team <key>       Linear team key for future setup/bootstrap operations
  -q, --quiet        Print only final outcome and errors
  -v, --verbose      Print additional diagnostic detail
  -h, --help         Show this help

Current scaffold behavior:
  Commands validate routing and contracts only. No Linear mutations are performed.
`;
}
