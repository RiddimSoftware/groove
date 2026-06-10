{% if 'agent-prompt' in issue.labels %}{{ issue.description }}{% else %}# __REPO_NAME__ Symphony Workflow

You are implementing Linear issue {{ issue.identifier }} for __REPO_NAME__: {{ issue.title }}.

State: {{ issue.state }}
Estimate: {{ issue.estimate }}
Attempt: {{ attempt }}

Labels:
{% for label in issue.labels %}
- {{ label }}
{% endfor %}

Description:
{{ issue.description }}

Follow the repository instructions in AGENTS.md and CLAUDE.md when present.

- Confirm {{ issue.identifier }} is In Progress in Linear. Update the status if required.
- You are already in a git worktree, do not create another one.
- Check the status of your worktree vs. latest `origin/main` before work. If there is existing changes, check if there's an open PR. If there's an open PR, inspect the CI status of the PR and if there are merge conflicts with main. This will inform your work.
- Keep the root checkout on main if you inspect it.{% if 'human-handoff' in issue.labels %}{% else %}
- Create at least one commit for the issue before handoff.
- Confirm the branch is clean with `git status --porcelain`.
- Rebase the worktree branch onto the latest `origin/main`. If a rebase is already in progress when you begin work, abort it and restart.
- Push the branch to origin before opening the PR with `gh pr create`.
- Use the PR title format `[{{ issue.identifier }}]: <short description>`.
- Include verification evidence and any skipped checks with reasons in the PR body.
- After opening the PR, keep working until it merges. Watch required CI, fix failures with follow-up commits, resolve merge conflicts against the latest `origin/main`, re-run the affected checks, and push again. Do not hand off a failing or conflicted PR unless the blocker is outside this repo or requires human action.{% endif %}

__LOCAL_PROMPT_SECTIONS__{% if 'human-handoff' in issue.labels %}{% else %}

Verification expectations:
- __VERIFY_COMMAND__{% endif %}

Leave no loose ends.{% endif %}
