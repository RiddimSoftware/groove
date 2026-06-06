export const DEFAULT_HUMAN_HANDOFF_LABEL = Object.freeze({
  name: 'human-handoff',
  color: '#f59e0b',
  description: 'Marks the project issue where human-only blockers are tracked.',
});

export class UnknownLinearTeamError extends Error {
  constructor(ref) {
    super(`Unknown Linear team: ${ref}`);
    this.name = 'UnknownLinearTeamError';
    this.ref = ref;
  }
}

export class InvalidTeamSelectionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidTeamSelectionError';
  }
}

export function linearTeamRef(value) {
  if (typeof value !== 'string') {
    throw new TypeError('LinearTeamRef must be a string');
  }
  const text = value.trim();
  if (text === '') {
    throw new TypeError('LinearTeamRef cannot be empty');
  }
  return text;
}

export function issueLabelSpec(overrides = {}) {
  const spec = {
    ...DEFAULT_HUMAN_HANDOFF_LABEL,
    ...definedOnly(overrides),
  };
  if (typeof spec.name !== 'string' || spec.name.trim() === '') {
    throw new TypeError('IssueLabelSpec.name is required');
  }
  if (typeof spec.color !== 'string' || spec.color.trim() === '') {
    throw new TypeError('IssueLabelSpec.color is required');
  }
  if (typeof spec.description !== 'string') {
    throw new TypeError('IssueLabelSpec.description must be a string');
  }
  return {
    name: spec.name.trim(),
    color: spec.color.trim(),
    description: spec.description,
  };
}

export function labelEnsureResult({ team, label, status, dryRun = false }) {
  return {
    team: normalizeTeam(team),
    label: label === null || label === undefined ? null : normalizeLabel(label),
    status,
    dryRun,
  };
}

export function hasLabelName(label, expectedName) {
  return normalizeName(label?.name) === normalizeName(expectedName);
}

function normalizeName(value) {
  return String(value ?? '').trim().toLocaleLowerCase('en-US');
}

function normalizeTeam(team) {
  return {
    id: team.id,
    key: team.key,
    name: team.name,
  };
}

function normalizeLabel(label) {
  return {
    id: label.id,
    name: label.name,
    color: label.color,
    description: label.description ?? '',
  };
}

function definedOnly(value) {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined));
}
