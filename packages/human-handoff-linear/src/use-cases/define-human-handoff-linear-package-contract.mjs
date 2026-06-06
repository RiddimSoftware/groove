export const HUMAN_HANDOFF_LINEAR_COMMANDS = Object.freeze([
  Object.freeze({
    name: 'setup',
    summary: 'Ensure selected Linear teams have the human-handoff issue label.',
  }),
  Object.freeze({
    name: 'sync-template',
    summary: 'Create or update the Human Handoff workspace template idempotently (--dry-run plans without writing).',
  }),
  Object.freeze({
    name: 'doctor',
    summary: 'Validate the Linear API token by fetching the viewer/workspace (read-only).',
  }),
  Object.freeze({
    name: 'bootstrap-project',
    summary: 'Reserve the project bootstrap command surface for later implementation.',
  }),
]);

export function defineHumanHandoffLinearPackageContract() {
  return Object.freeze({
    commandName: 'human-handoff-linear',
    commands: HUMAN_HANDOFF_LINEAR_COMMANDS,
    ports: Object.freeze(['LinearWorkspace', 'ConsoleReporter', 'SecretReader']),
    values: Object.freeze(['SetupCommand', 'LinearTeamSelector', 'HumanHandoffTemplateBody']),
    mutationPolicy: 'setup-mutates-labels; other scaffold commands are no-op',
  });
}
