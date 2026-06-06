const COMMANDS = new Set(['setup', 'sync-template', 'doctor', 'bootstrap-project']);

export const HUMAN_HANDOFF_LABEL_NAME = 'human-handoff';
export const HUMAN_HANDOFF_TEMPLATE_NAME = 'Human Handoff';
export const HUMAN_HANDOFF_TITLE_PREFIX = 'Human handoff for ';
export const BLOCKS_RELATION_TYPE = 'blocks';

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

/**
 * LinearProjectRef — caller-supplied project identifier (UUID or slug).
 *
 * The use case forwards `value` to the adapter; Linear's GraphQL `project(id:)`
 * accepts both shapes, so we keep the value object minimal rather than guessing
 * which form the user typed.
 */
export function createLinearProjectRef(value) {
  const raw = String(value ?? '').trim();
  if (raw === '') {
    throw new TypeError('LinearProjectRef requires a non-empty project id or slug.');
  }
  return Object.freeze({ value: raw });
}

export function humanHandoffIssueTitle(projectName) {
  const name = String(projectName ?? '').trim();
  if (name === '') {
    throw new TypeError('Project name required for Human Handoff issue title.');
  }
  return `${HUMAN_HANDOFF_TITLE_PREFIX}${name}`;
}

/**
 * HumanHandoffIssueSpec — the immutable description of the issue we will
 * create. Carries no Linear-specific transport detail; the adapter maps these
 * fields onto Linear's `IssueCreateInput`. `estimate` is held at `null` to
 * encode the acceptance criterion that the HH issue has no estimate.
 */
export function createHumanHandoffIssueSpec({
  projectId,
  projectName,
  teamId,
  labelId,
  templateId = null,
  stateId = null,
  body,
}) {
  if (!projectId) throw new TypeError('HumanHandoffIssueSpec requires projectId.');
  if (!projectName) throw new TypeError('HumanHandoffIssueSpec requires projectName.');
  if (!teamId) throw new TypeError('HumanHandoffIssueSpec requires teamId.');
  if (!labelId) throw new TypeError('HumanHandoffIssueSpec requires the human-handoff labelId.');
  if (!body) throw new TypeError('HumanHandoffIssueSpec requires a template body.');
  return Object.freeze({
    title: humanHandoffIssueTitle(projectName),
    projectId,
    teamId,
    labelIds: Object.freeze([labelId]),
    templateId,
    stateId,
    description: body,
    estimate: null,
  });
}

/**
 * IssueRelationPlan — one planned `blocks` relation. The blocker (sibling
 * implementation issue) is the source; the blocked issue (the HH issue) is the
 * target. Stored as `issueId`/`relatedIssueId` so it can be handed directly to
 * `LinearWorkspace.createRelation`.
 */
export function createIssueRelationPlan({ blockerIssueId, blockedIssueId }) {
  if (!blockerIssueId) throw new TypeError('IssueRelationPlan requires blockerIssueId.');
  if (!blockedIssueId) throw new TypeError('IssueRelationPlan requires blockedIssueId.');
  return Object.freeze({
    type: BLOCKS_RELATION_TYPE,
    issueId: blockerIssueId,
    relatedIssueId: blockedIssueId,
  });
}
