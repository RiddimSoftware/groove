export const HUMAN_HANDOFF_LINEAR_COMMANDS = Object.freeze([
  Object.freeze({
    name: 'setup',
    summary: 'Validate the package contract and report the future Linear setup plan.',
  }),
  Object.freeze({
    name: 'sync-template',
    summary: 'Report the checked-in Human Handoff template that future work will sync.',
  }),
  Object.freeze({
    name: 'doctor',
    summary: 'Check local CLI readiness without contacting Linear.',
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
    mutationPolicy: 'scaffold-no-op',
  });
}
