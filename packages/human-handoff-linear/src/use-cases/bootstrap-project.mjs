/**
 * BootstrapProjectHumanHandoff — the `bootstrap-project` use case.
 *
 * Reads a Linear Project, decides whether its final Human Handoff issue already
 * exists, and wires every non-HH sibling implementation issue as a `blocks`
 * relation pointing at the HH issue. The decision is computed entirely from
 * port responses (project, label, template, sibling issues, existing
 * relations) so dry-run is a pure read-only walk that produces the same plan
 * the apply pass executes.
 *
 * Idempotency rule: a Linear Project has at most one Human Handoff issue,
 * identified by the `human-handoff` label. Re-running the command:
 *   - reuses the existing HH issue rather than creating a duplicate.
 *   - skips `blocks` relations whose blocker→HH pair already exists.
 *
 * Failure rule: the command fails closed when the Linear project, the
 * `human-handoff` label, or the `Human Handoff` template is missing. Operators
 * must install those primitives via `setup` / `sync-template` first; we do not
 * create them implicitly here.
 *
 * Dependency rule: only the LinearWorkspace and ConsoleReporter ports cross
 * inward. No fetch/env/child_process is touched here.
 */

import {
  BLOCKS_RELATION_TYPE,
  HUMAN_HANDOFF_LABEL_NAME,
  HUMAN_HANDOFF_TEMPLATE_NAME,
  createHumanHandoffIssueSpec,
  createIssueRelationPlan,
  createLinearProjectRef,
  createLinearTeamSelector,
  createSetupCommand,
  humanHandoffIssueTitle,
} from '../values.mjs';

const HH_PLACEHOLDER_ID = '<human-handoff-issue:not-yet-created>';

export function createBootstrapProjectUseCase({ reporter, workspace, templateBody }) {
  return async function bootstrapProject(input = {}) {
    const command = createSetupCommand('bootstrap-project', input);
    const teamSelector = createLinearTeamSelector(input.team);
    const projectRef = createLinearProjectRef(input.project);
    const dryRun = command.dryRun;

    requireReadMethods(workspace);

    if (typeof templateBody !== 'string' || templateBody.length === 0) {
      throw new TypeError('bootstrap-project requires a Human Handoff template body.');
    }

    const project = await workspace.getProject({ id: projectRef.value });
    if (!project) {
      throw new Error(`Linear project not found for "${projectRef.value}".`);
    }
    reporter.info(`bootstrap-project: project ${project.name} (${project.id})`);

    const team = await resolveTargetTeam({ workspace, project, teamSelector });
    reporter.info(`bootstrap-project: target team ${team.key} (${team.id})`);

    const labels = await workspace.listLabels({ teamId: team.id });
    const hhLabel = labels.find((l) => l.name === HUMAN_HANDOFF_LABEL_NAME);
    if (!hhLabel) {
      throw new Error(
        `Label "${HUMAN_HANDOFF_LABEL_NAME}" is not installed for team ${team.key}. Run "human-handoff-linear setup" first.`,
      );
    }

    const hhTemplate = await workspace.getTemplate({
      teamId: team.id,
      name: HUMAN_HANDOFF_TEMPLATE_NAME,
    });
    if (!hhTemplate) {
      throw new Error(
        `Template "${HUMAN_HANDOFF_TEMPLATE_NAME}" is not installed for team ${team.key}. Run "human-handoff-linear sync-template" first.`,
      );
    }

    const projectIssues = await workspace.listProjectIssues({ projectId: project.id });
    const existingHHIssue = findExistingHHIssue({ projectIssues, hhLabel });
    const siblings = projectIssues.filter((issue) => issue.id !== existingHHIssue?.id
      && !hasHumanHandoffLabel(issue, hhLabel));

    let hhIssue = existingHHIssue;
    let issueSpec = null;
    let hhDecision;

    if (existingHHIssue) {
      hhDecision = 'reuse';
      reporter.info(`bootstrap-project: reusing Human Handoff issue ${existingHHIssue.identifier} "${existingHHIssue.title}".`);
    } else {
      hhDecision = 'create';
      const initialState = await resolveInitialState({ workspace, teamId: team.id });
      issueSpec = createHumanHandoffIssueSpec({
        projectId: project.id,
        projectName: project.name,
        teamId: team.id,
        labelId: hhLabel.id,
        templateId: hhTemplate.id,
        stateId: initialState?.id ?? null,
        body: templateBody,
      });
      reporter.info(`bootstrap-project: will ${dryRun ? 'plan' : 'create'} Human Handoff issue "${issueSpec.title}".`);

      if (!dryRun) {
        requireMutationMethods(workspace, ['createIssue']);
        hhIssue = await workspace.createIssue({
          teamId: issueSpec.teamId,
          title: issueSpec.title,
          description: issueSpec.description,
          labelIds: [...issueSpec.labelIds],
          templateId: issueSpec.templateId ?? undefined,
          projectId: issueSpec.projectId,
          stateId: issueSpec.stateId ?? undefined,
        });
        reporter.info(`bootstrap-project: created Human Handoff issue ${hhIssue.identifier}.`);
      }
    }

    const existingBlockerIds = hhIssue?.id
      ? await collectExistingBlockerIds({ workspace, hhIssueId: hhIssue.id })
      : new Set();

    const relationPlans = [];
    const relationsCreated = [];
    const relationsSkipped = [];

    for (const sibling of siblings) {
      const blockedId = hhIssue?.id ?? HH_PLACEHOLDER_ID;
      const plan = createIssueRelationPlan({
        blockerIssueId: sibling.id,
        blockedIssueId: blockedId,
      });
      const alreadyExists = existingBlockerIds.has(sibling.id);
      const planEntry = Object.freeze({
        plan,
        sibling: Object.freeze({ id: sibling.id, identifier: sibling.identifier, title: sibling.title }),
        action: alreadyExists ? 'skip' : (dryRun ? 'plan' : 'create'),
      });
      relationPlans.push(planEntry);

      if (alreadyExists) {
        relationsSkipped.push(planEntry.sibling);
        reporter.info(
          `bootstrap-project: ${sibling.identifier} already blocks ${hhIssue.identifier} - skipping.`,
        );
        continue;
      }

      const targetLabel = hhIssue?.identifier ?? '<human handoff issue>';
      reporter.info(
        `bootstrap-project: will ${dryRun ? 'plan' : 'create'} blocks ${sibling.identifier} -> ${targetLabel}.`,
      );

      if (!dryRun) {
        requireMutationMethods(workspace, ['createRelation']);
        await workspace.createRelation({
          issueId: sibling.id,
          relatedIssueId: hhIssue.id,
          type: BLOCKS_RELATION_TYPE,
        });
        relationsCreated.push(planEntry.sibling);
      }
    }

    const issueMutationsPerformed = !dryRun && hhDecision === 'create' ? 1 : 0;
    const mutationsPerformed = issueMutationsPerformed + (dryRun ? 0 : relationsCreated.length);

    const summary = Object.freeze({
      command,
      dryRun,
      project: Object.freeze({
        id: project.id,
        name: project.name,
        slugId: project.slugId ?? null,
      }),
      team: Object.freeze({ id: team.id, key: team.key, name: team.name }),
      humanHandoff: Object.freeze({
        decision: hhDecision,
        issue: hhIssue
          ? Object.freeze({ id: hhIssue.id, identifier: hhIssue.identifier, title: hhIssue.title })
          : null,
        spec: issueSpec,
      }),
      siblings: Object.freeze(siblings.map((s) => Object.freeze({
        id: s.id,
        identifier: s.identifier,
        title: s.title,
      }))),
      relations: Object.freeze({
        planned: Object.freeze(relationPlans),
        created: Object.freeze(relationsCreated),
        skipped: Object.freeze(relationsSkipped),
      }),
      mutationsPerformed,
    });

    if (dryRun) {
      reporter.info(
        `bootstrap-project (dry-run): ${hhDecision} HH issue, ${relationPlans.filter((r) => r.action !== 'skip').length} blocks relation(s) planned, ${relationsSkipped.length} already exist.`,
      );
    } else {
      reporter.info(
        `bootstrap-project: ${hhDecision} HH issue, ${relationsCreated.length} blocks relation(s) created, ${relationsSkipped.length} already existed.`,
      );
    }

    return summary;
  };
}

function requireReadMethods(workspace) {
  const required = ['getProject', 'listProjectIssues', 'listLabels', 'getTemplate', 'listTeams'];
  for (const method of required) {
    if (typeof workspace?.[method] !== 'function') {
      throw new TypeError(`bootstrap-project requires a LinearWorkspace with ${method}().`);
    }
  }
}

function requireMutationMethods(workspace, methods) {
  for (const method of methods) {
    if (typeof workspace?.[method] !== 'function') {
      throw new TypeError(`bootstrap-project requires a LinearWorkspace with ${method}() for apply mode.`);
    }
  }
}

async function resolveTargetTeam({ workspace, project, teamSelector }) {
  const teams = await workspace.listTeams();
  if (teamSelector.kind === 'team-key') {
    const match = teams.find(
      (t) => t.key === teamSelector.teamKey || t.id === teamSelector.teamKey,
    );
    if (!match) {
      throw new Error(`Linear team "${teamSelector.teamKey}" not found in workspace.`);
    }
    return match;
  }
  const projectTeamIds = Array.isArray(project.teamIds) ? project.teamIds : [];
  if (projectTeamIds.length === 1) {
    const team = teams.find((t) => t.id === projectTeamIds[0]);
    if (!team) {
      throw new Error(`Project team ${projectTeamIds[0]} not found in workspace teams.`);
    }
    return team;
  }
  if (projectTeamIds.length === 0) {
    throw new Error(
      'Cannot resolve target team for project: project has no team membership. Pass --team <key>.',
    );
  }
  throw new Error(
    `Cannot resolve target team for project: project spans ${projectTeamIds.length} teams. Pass --team <key>.`,
  );
}

async function resolveInitialState({ workspace, teamId }) {
  if (typeof workspace.listWorkflowStates !== 'function') return null;
  const states = await workspace.listWorkflowStates({ teamId });
  if (!Array.isArray(states) || states.length === 0) return null;
  const backlog = pickStateByType(states, 'backlog');
  if (backlog) return backlog;
  return pickStateByType(states, 'unstarted');
}

function pickStateByType(states, type) {
  const matches = states.filter((s) => s.type === type);
  if (matches.length === 0) return null;
  matches.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  return matches[0];
}

function hasHumanHandoffLabel(issue, hhLabel) {
  if (!Array.isArray(issue?.labels)) return false;
  return issue.labels.some((l) => l.id === hhLabel.id || l.name === hhLabel.name);
}

function findExistingHHIssue({ projectIssues, hhLabel }) {
  for (const issue of projectIssues) {
    if (hasHumanHandoffLabel(issue, hhLabel)) return issue;
  }
  return null;
}

async function collectExistingBlockerIds({ workspace, hhIssueId }) {
  const blockerIds = new Set();
  if (typeof workspace.listIssueRelations !== 'function') return blockerIds;
  const relations = await workspace.listIssueRelations({ issueId: hhIssueId });
  if (!Array.isArray(relations)) return blockerIds;
  for (const rel of relations) {
    if (rel?.type !== BLOCKS_RELATION_TYPE) continue;
    if (rel.relatedIssueId === hhIssueId && rel.issueId) {
      blockerIds.add(rel.issueId);
    }
  }
  return blockerIds;
}

export const __testExports = Object.freeze({
  HH_PLACEHOLDER_ID,
});
