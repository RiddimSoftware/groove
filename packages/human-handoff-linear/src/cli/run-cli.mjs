import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEnvironmentSecretReader } from '../adapters/environment-secret-reader.mjs';
import { createInteractiveSecretReader } from '../adapters/interactive-secret-reader.mjs';
import { createLinearGraphqlWorkspace } from '../adapters/linear-graphql-workspace.mjs';
import { createNoopLinearWorkspace } from '../adapters/noop-linear-workspace.mjs';
import { createStreamConsoleReporter } from '../adapters/stream-console-reporter.mjs';
import { exitCodeFor } from '../errors.mjs';
import { defineHumanHandoffLinearPackageContract } from '../use-cases/define-human-handoff-linear-package-contract.mjs';
import { createBootstrapProjectUseCase } from '../use-cases/bootstrap-project.mjs';
import { createDoctorUseCase } from '../use-cases/doctor.mjs';
import { createSetupUseCase } from '../use-cases/setup.mjs';
import { createSyncTemplateUseCase } from '../use-cases/sync-template.mjs';

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TEMPLATE_PATH = join(PACKAGE_ROOT, 'templates', 'human-handoff-issue-body.md');

export async function runCli({ argv, env, stdout, stderr, stdin = null, fetch: fetchImpl, workspaceFactory } = {}) {
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

  if (command === 'doctor') {
    return runDoctorCommand({
      options: parsed.options,
      env,
      stdin,
      stdout,
      stderr,
      reporter,
      fetchImpl,
      workspaceFactory,
    });
  }

  if (command === 'sync-template') {
    return runSyncTemplateCommand({
      options: parsed.options,
      env,
      stdin,
      stdout,
      stderr,
      reporter,
      fetchImpl,
      workspaceFactory,
    });
  }

  if (command === 'setup') {
    return runSetupCommand({
      options: parsed.options,
      env,
      reporter,
      fetchImpl,
      workspaceFactory,
    });
  }

  if (command === 'bootstrap-project') {
    return runBootstrapProjectCommand({
      options: parsed.options,
      env,
      stdin,
      stdout,
      stderr,
      reporter,
      fetchImpl,
      workspaceFactory,
    });
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

async function runSyncTemplateCommand({ options, env, stdin, stdout, stderr, reporter, fetchImpl, workspaceFactory }) {
  const secretReader = createInteractiveSecretReader({ env, stdin, stdout });

  let apiKey = null;
  try {
    apiKey = await secretReader.readLinearApiKey({ interactive: !options.noPrompt });
  } catch (err) {
    reporter.error(`human-handoff-linear sync-template failed - ${err.message}`);
    return 1;
  }
  if (!apiKey) {
    reporter.error('human-handoff-linear sync-template failed - LINEAR_API_KEY is not set.');
    reporter.error('Export LINEAR_API_KEY or rerun without --no-prompt to be prompted.');
    return exitCodeFor('missing_token');
  }

  const factory = workspaceFactory ?? (({ apiKey: key }) => createLinearGraphqlWorkspace({ apiKey: key, fetch: fetchImpl }));
  const workspace = factory({ apiKey });

  const templateBody = await readFile(TEMPLATE_PATH, 'utf8');
  try {
    const result = await createSyncTemplateUseCase({ reporter, templateBody, workspace })(options);
    const suffix = result.mutationsPerformed === 1
      ? `${result.action} performed (id: ${result.templateId})`
      : (result.action === 'no-change' ? `no change (id: ${result.templateId})` : `${result.action} planned`);
    stdout.write(`human-handoff-linear sync-template complete - ${suffix}\n`);
    return 0;
  } catch (err) {
    reporter.error(`human-handoff-linear sync-template failed - ${err.message}`);
    return exitCodeFor(err);
  }
}

async function runSetupCommand({ options, env, reporter, fetchImpl, workspaceFactory }) {
  const secretReader = createEnvironmentSecretReader(env);
  const apiKey = await secretReader.read('LINEAR_API_KEY') ?? await secretReader.read('LINEAR_API_TOKEN');
  if (!apiKey) {
    reporter.error('human-handoff-linear setup failed - LINEAR_API_KEY is not set.');
    reporter.error('Export LINEAR_API_KEY or LINEAR_API_TOKEN and try again.');
    return exitCodeFor('missing_token');
  }

  const factory = workspaceFactory ?? (({ apiKey: key }) => createLinearGraphqlWorkspace({
    apiKey: key,
    fetch: fetchImpl,
    endpoint: env?.LINEAR_GRAPHQL_ENDPOINT,
  }));

  try {
    await createSetupUseCase({
      reporter,
      workspace: factory({ apiKey }),
    })(options);
    return 0;
  } catch (err) {
    reporter.error(`human-handoff-linear setup failed - ${err.message}`);
    return exitCodeFor(err);
  }
}

async function runBootstrapProjectCommand({ options, env, stdin, stdout, stderr, reporter, fetchImpl, workspaceFactory }) {
  if (!options.project) {
    reporter.error('human-handoff-linear bootstrap-project failed - --project <id-or-slug> is required.');
    return 1;
  }

  const secretReader = createInteractiveSecretReader({ env, stdin, stdout });

  let apiKey = null;
  try {
    apiKey = await secretReader.readLinearApiKey({ interactive: !options.noPrompt });
  } catch (err) {
    reporter.error(`human-handoff-linear bootstrap-project failed - ${err.message}`);
    return 1;
  }
  if (!apiKey) {
    reporter.error('human-handoff-linear bootstrap-project failed - LINEAR_API_KEY is not set.');
    reporter.error('Export LINEAR_API_KEY or rerun without --no-prompt to be prompted.');
    return exitCodeFor('missing_token');
  }

  const factory = workspaceFactory ?? (({ apiKey: key }) => createLinearGraphqlWorkspace({ apiKey: key, fetch: fetchImpl }));
  let workspace;
  try {
    workspace = factory({ apiKey });
  } catch (err) {
    reporter.error(`human-handoff-linear bootstrap-project failed - ${err.message}`);
    return exitCodeFor(err);
  }

  const templateBody = await readFile(TEMPLATE_PATH, 'utf8');

  try {
    const result = await createBootstrapProjectUseCase({
      reporter,
      workspace,
      templateBody,
    })({
      project: options.project,
      team: options.team,
      dryRun: options.dryRun,
    });

    if (result.dryRun) {
      stdout.write('human-handoff-linear bootstrap-project complete (dry-run) - no mutations performed\n');
    } else {
      stdout.write(`human-handoff-linear bootstrap-project complete - ${result.mutationsPerformed} mutation(s) performed\n`);
    }
    return 0;
  } catch (err) {
    reporter.error(`human-handoff-linear bootstrap-project failed - ${err.message}`);
    return exitCodeFor(err);
  }
}

async function runDoctorCommand({ options, env, stdin, stdout, stderr, reporter, fetchImpl, workspaceFactory }) {
  const secretReader = createInteractiveSecretReader({ env, stdin, stdout });

  let apiKey = null;
  try {
    apiKey = await secretReader.readLinearApiKey({ interactive: !options.noPrompt });
  } catch (err) {
    reporter.error(`human-handoff-linear doctor failed - ${err.message}`);
    return 1;
  }

  if (!apiKey) {
    reporter.error('human-handoff-linear doctor failed - LINEAR_API_KEY is not set.');
    reporter.error('Export LINEAR_API_KEY or rerun without --no-prompt to be prompted.');
    return exitCodeFor('missing_token');
  }

  // Promote the resolved key into the SecretReader port the use case sees,
  // so the use case stays pure and reads the token through `read('LINEAR_API_KEY')`.
  const portReader = createEnvironmentSecretReader({ LINEAR_API_KEY: apiKey });
  const factory = workspaceFactory ?? (({ apiKey: key }) => createLinearGraphqlWorkspace({ apiKey: key, fetch: fetchImpl }));

  let result;
  try {
    result = await createDoctorUseCase({
      reporter,
      secretReader: portReader,
      workspaceFactory: factory,
    })({ ...options, tokenRequired: true });
  } catch (err) {
    reporter.error(`human-handoff-linear doctor failed - ${err.message}`);
    return 1;
  }

  if (result.ok) {
    stdout.write('human-handoff-linear doctor complete - no mutations performed\n');
    return 0;
  }

  const failingCheck = result.checks.find((c) => !c.ok);
  return exitCodeFor(failingCheck?.error ?? { kind: 'unknown' });
}

async function dispatchCommand({ command }) {
  throw new Error(`Unknown command: ${command}`);
}

function parseArgs(argv) {
  const args = [...argv];
  const options = {
    dryRun: false,
    quiet: false,
    verbose: false,
    team: null,
    teamRefs: [],
    allTeams: false,
    project: null,
    noPrompt: false,
    color: undefined,
    description: undefined,
    labelName: undefined,
  };
  let help = false;
  let command = null;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') { help = true; continue; }
    if (arg === '--quiet' || arg === '-q') { options.quiet = true; continue; }
    if (arg === '--verbose' || arg === '-v') { options.verbose = true; continue; }
    if (arg === '--no-prompt') { options.noPrompt = true; continue; }
    if (arg === '--dry-run') { options.dryRun = true; continue; }
    if (arg === '--all-teams') { options.allTeams = true; continue; }
    if (arg === '--team') {
      if (args[i + 1] === undefined) return { options, error: '--team requires a value' };
      addTeamRefs(options, args[i + 1]);
      i += 1;
      continue;
    }
    if (arg.startsWith('--team=')) { addTeamRefs(options, arg.slice('--team='.length)); continue; }
    if (arg === '--project') {
      if (args[i + 1] === undefined) return { options, error: '--project requires a value' };
      options.project = args[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith('--project=')) { options.project = arg.slice('--project='.length); continue; }
    if (arg === '--color') {
      if (args[i + 1] === undefined) return { options, error: '--color requires a value' };
      options.color = args[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith('--color=')) { options.color = arg.slice('--color='.length); continue; }
    if (arg === '--description') {
      if (args[i + 1] === undefined) return { options, error: '--description requires a value' };
      options.description = args[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith('--description=')) { options.description = arg.slice('--description='.length); continue; }
    if (arg === '--label-name') {
      if (args[i + 1] === undefined) return { options, error: '--label-name requires a value' };
      options.labelName = args[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith('--label-name=')) { options.labelName = arg.slice('--label-name='.length); continue; }
    if (arg.startsWith('-')) return { options, error: `Unknown option: ${arg}` };
    if (command === null) { command = arg; continue; }
    return { options, error: `Unexpected argument: ${arg}` };
  }

  return { command, help, options };
}

function addTeamRefs(options, value) {
  for (const ref of String(value).split(',')) {
    const trimmed = ref.trim();
    if (trimmed === '') continue;
    options.teamRefs.push(trimmed);
    if (options.team === null) options.team = trimmed;
  }
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
  --project <ref>    Linear project id or slug (bootstrap-project)
  --team <key>       Linear team key or UUID. Repeat or comma-separate for
                     setup; required for bootstrap-project when the project
                     spans multiple teams.
  --all-teams        Setup every accessible Linear team
  --dry-run          Plan only — print the action the command would take
                     without calling any Linear write mutation.
  --color <hex>      Override setup label color
  --description <s>  Override setup label description
  --label-name <s>   Override setup label name
  --no-prompt        Disable interactive prompts (for CI / non-TTY environments)
  -q, --quiet        Print only final outcome and errors
  -v, --verbose      Print additional diagnostic detail
  -h, --help         Show this help

Auth:
  Commands that talk to Linear read the API key from LINEAR_API_KEY (setup
  also accepts LINEAR_API_TOKEN). doctor, sync-template, and bootstrap-project
  can prompt for the key in an interactive terminal. Pass --no-prompt to skip
  the prompt and exit with a missing-token error instead.

  Create a personal API key at https://linear.app/settings/api.

Mutations:
  setup ensures each selected team has a human-handoff issue label.
  sync-template creates or updates the workspace-level "Human Handoff" issue
  template. bootstrap-project creates the final Human Handoff issue for a
  Linear project and wires blocks relations from every sibling implementation
  issue. All three default to applying; pass --dry-run to plan without
  writing. doctor never mutates — it only validates auth.

  No Linear mutations are performed by --dry-run on any command.
`;
}
