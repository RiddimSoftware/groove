const COMMANDS = new Set(['setup', 'sync-template', 'doctor', 'bootstrap-project']);

export function createSetupCommand(name, options = {}) {
  if (!COMMANDS.has(name)) {
    throw new Error(`Unknown setup command: ${name}`);
  }
  return Object.freeze({
    name,
    dryRun: options.dryRun !== false,
    quiet: options.quiet === true,
    verbose: options.verbose === true,
  });
}

export function createLinearTeamSelector(value) {
  const teamKey = String(value ?? '').trim();
  if (teamKey === '') {
    return Object.freeze({ kind: 'unspecified', teamKey: null });
  }
  return Object.freeze({ kind: 'team-key', teamKey });
}

export function createHumanHandoffTemplateBody(body) {
  const value = String(body ?? '').trimEnd();
  if (!value.includes('## Autonomous prep instructions')) {
    throw new Error('Human Handoff template must include autonomous prep instructions.');
  }
  if (!value.includes('## Anticipated human work')) {
    throw new Error('Human Handoff template must include anticipated human work.');
  }
  return Object.freeze({ body: value });
}
