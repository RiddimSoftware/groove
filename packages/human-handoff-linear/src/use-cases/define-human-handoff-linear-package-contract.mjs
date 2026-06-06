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
    summary: 'Bootstrap the final Human Handoff issue for a Linear project and wire blocks relations from every sibling issue.',
  }),
]);

export function defineHumanHandoffLinearPackageContract() {
  return Object.freeze({
    commandName: 'human-handoff-linear',
    commands: HUMAN_HANDOFF_LINEAR_COMMANDS,
    ports: Object.freeze(['LinearWorkspace', 'ConsoleReporter', 'SecretReader']),
    values: Object.freeze([
      'SetupCommand',
      'LinearTeamSelector',
      'LinearProjectRef',
      'HumanHandoffTemplateBody',
      'HumanHandoffIssueSpec',
      'IssueRelationPlan',
    ]),
    mutationPolicy: 'setup-mutates-labels; sync-template and bootstrap-project mutate Linear',
  });
}
