#!/usr/bin/env node
/**
 * PreToolUse hook - enforce LINEAR_ALLOWED_TEAMS for Linear issue writes.
 *
 * Blocks MCP Linear save_issue calls when the target team can be resolved and
 * the key is not present in LINEAR_ALLOWED_TEAMS. Unknown team shapes fail open
 * to avoid false-positive blocks.
 */

const SAVE_ISSUE_TOOL_REGEX = /^mcp__[^_].*__save_issue$/;
const LINEAR_SAVE_TOOL_REGEX = /^mcp__[^_].*__save_(issue|project|initiative)$/;
const LINEAR_TEAM_KEY_REGEX = /^[A-Z][A-Z0-9_]*$/;

const KNOWN_TEAM_KEYS = new Set([
  'AGENT',
  'ASO',
  'AUTO',
  'BASE',
  'BAP',
  'D12',
  'DOOR',
  'EPAC',
  'FAC',
  'FOLD',
  'LAB',
  'MCP',
  'REA',
  'S2S',
  'SON',
  'WEB',
]);

const TEAM_NAME_TO_KEY = new Map([
  ['agent', 'AGENT'],
  ['agent config', 'AGENT'],
  ['agents', 'AGENT'],
  ['app store optimization', 'ASO'],
  ['aso', 'ASO'],
  ['auto', 'AUTO'],
  ['autopilot', 'AUTO'],
  ['base', 'BASE'],
  ['baseball', 'BASE'],
  ['bap', 'BAP'],
  ['bubble bop', 'BAP'],
  ['d12', 'D12'],
  ['double dozen', 'D12'],
  ['door', 'DOOR'],
  ['epac', 'EPAC'],
  ['e pac', 'EPAC'],
  ['fac', 'FAC'],
  ['factory', 'FAC'],
  ['software factory', 'FAC'],
  ['fold', 'FOLD'],
  ['blindfold', 'FOLD'],
  ['lab', 'LAB'],
  ['mcp', 'MCP'],
  ['riddim mcp', 'MCP'],
  ['rea', 'REA'],
  ['reach', 'REA'],
  ['s2s', 'S2S'],
  ['bettrack', 'S2S'],
  ['son', 'SON'],
  ['sonnio', 'SON'],
  ['web', 'WEB'],
  ['website', 'WEB'],
  ['riddim website', 'WEB'],
]);

const TEAM_ID_TO_KEY = new Map([
  // Observed in existing hook fixtures for FAC save_issue/save_project calls.
  ['96468a5a-c0fe-4a4e-ac71-8281442b2184', 'FAC'],
  // Observed in existing hook fixtures for the Lab/claude_ai_Linear MCP shape.
  ['d2f6fa5b-1b60-4606-81ac-940597fe9892', 'LAB'],
]);

class ProcessEnvReader {
  constructor(env) {
    this.env = env;
  }

  read(name) {
    return this.env[name];
  }
}

class StdinJsonToolCallParser {
  constructor(stdin) {
    this.stdin = stdin;
  }

  async parse() {
    const chunks = [];
    for await (const chunk of this.stdin) chunks.push(chunk);
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }
}

function normalizeName(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseAllowList(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return { allowAll: true, keys: new Set(), source: '' };
  }

  const keys = new Set();
  for (const token of raw.split(',')) {
    const key = token.trim().toUpperCase();
    if (LINEAR_TEAM_KEY_REGEX.test(key)) keys.add(key);
  }

  return {
    allowAll: keys.size === 0,
    keys,
    source: raw.trim(),
  };
}

function resolveTeamKey(teamValue) {
  if (typeof teamValue !== 'string') return null;

  const trimmed = teamValue.trim();
  if (trimmed === '') return null;

  const lower = trimmed.toLowerCase();
  if (TEAM_ID_TO_KEY.has(lower)) return TEAM_ID_TO_KEY.get(lower);

  const upper = trimmed.toUpperCase();
  if (KNOWN_TEAM_KEYS.has(upper)) return upper;

  const prefix = upper.match(/^([A-Z][A-Z0-9_]*)(?:[^A-Z0-9_]|$)/)?.[1];
  if (prefix && KNOWN_TEAM_KEYS.has(prefix)) return prefix;

  const name = normalizeName(trimmed);
  if (TEAM_NAME_TO_KEY.has(name)) return TEAM_NAME_TO_KEY.get(name);

  return null;
}

function extractTeamArgument(toolInput) {
  if (!toolInput || typeof toolInput !== 'object' || Array.isArray(toolInput)) {
    return null;
  }

  for (const key of ['team', 'teamKey', 'teamName', 'teamId', 'teamID', 'team_id']) {
    if (typeof toolInput[key] === 'string') return toolInput[key];
  }

  return null;
}

function getToolInput(payload) {
  return payload.tool_input ?? payload.input ?? payload.inputs ?? payload.arguments ?? payload.args;
}

function decide({ toolName, toolInput, allowList }) {
  if (!SAVE_ISSUE_TOOL_REGEX.test(toolName)) {
    return { allowed: true };
  }

  if (allowList.allowAll) {
    return { allowed: true };
  }

  const teamArgument = extractTeamArgument(toolInput);
  const teamKey = resolveTeamKey(teamArgument);

  if (!teamKey) {
    return {
      allowed: true,
      warning: `could not resolve team from save_issue input; allowing (team=${JSON.stringify(teamArgument)})`,
    };
  }

  if (allowList.keys.has(teamKey)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    message: `Blocked: team ${teamKey} is not in LINEAR_ALLOWED_TEAMS=${allowList.source}`,
  };
}

async function main({ envReader, parser }) {
  let payload;
  try {
    payload = await parser.parse();
  } catch (err) {
    process.stderr.write(`[pre-tool-use-enforce-linear-teams] failed to parse stdin: ${err.message}\n`);
    process.exit(0);
  }

  const toolName = payload.tool_name;
  if (typeof toolName !== 'string' || !LINEAR_SAVE_TOOL_REGEX.test(toolName)) {
    process.exit(0);
  }

  const allowList = parseAllowList(envReader.read('LINEAR_ALLOWED_TEAMS'));
  const decision = decide({
    toolName,
    toolInput: getToolInput(payload),
    allowList,
  });

  if (decision.warning) {
    process.stderr.write(`[pre-tool-use-enforce-linear-teams] ${decision.warning}\n`);
  }

  if (!decision.allowed) {
    process.stderr.write(`[pre-tool-use-enforce-linear-teams] ${decision.message}\n`);
    process.exit(1);
  }

  process.exit(0);
}

main({
  envReader: new ProcessEnvReader(process.env),
  parser: new StdinJsonToolCallParser(process.stdin),
});
