#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd -P "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

python3 - "$ROOT" <<'PY'
import re
import sys
from pathlib import Path

root = Path(sys.argv[1])
template = (root / "symphony/default-agent-prompt.md").read_text()

verification_command = "Run `swift test`."
local_sections = """<!-- symphony-workflow:local-section id=purpose -->
## Purpose

Local section fixture.
<!-- /symphony-workflow:local-section -->"""


def compose(raw: str) -> str:
    return (
        raw.replace("__REPO_NAME__", "agent-config")
        .replace("__LOCAL_PROMPT_SECTIONS__", local_sections)
        .replace("__VERIFY_COMMAND__", verification_command)
    )


legacy_template = f"""# agent-config Symphony Workflow

You are implementing Linear issue {{{{ issue.identifier }}}} for agent-config: {{{{ issue.title }}}}.

State: {{{{ issue.state }}}}
Estimate: {{{{ issue.estimate }}}}
Attempt: {{{{ attempt }}}}

Labels:
{{% for label in issue.labels %}}
- {{{{ label }}}}
{{% endfor %}}

Description:
{{{{ issue.description }}}}

Follow the repository instructions in AGENTS.md and CLAUDE.md when present.

- Confirm {{{{ issue.identifier }}}} is In Progress in Linear. Update the status if required.
- You are already in a git worktree, do not create another one.
- Check the status of your worktree vs. latest `origin/main` before work. If there is existing changes, check if there's an open PR. If there's an open PR, inspect the CI status of the PR and if there are merge conflicts with main. This will inform your work.
- Keep the root checkout on main if you inspect it.
- Create at least one commit for the issue before handoff.
- Confirm the branch is clean with `git status --porcelain`.
- Rebase the worktree branch onto the latest `origin/main`. If a rebase is already in progress when you begin work, abort it and restart.
- Push the branch to origin before opening the PR with `gh pr create`.
- Use the PR title format `[{{{{ issue.identifier }}}}]: <short description>`.
- Include verification evidence and any skipped checks with reasons in the PR body.
- After opening the PR, keep working until it merges. Watch required CI, fix failures with follow-up commits, resolve merge conflicts against the latest `origin/main`, re-run the affected checks, and push again. Do not hand off a failing or conflicted PR unless the blocker is outside this repo or requires human action.

{local_sections}

Verification expectations:
- {verification_command}

Leave no loose ends.
"""


def render(raw: str, issue: dict, attempt: int) -> str:
    labels = [label.lower() for label in issue["labels"]]

    condition_token = re.compile(
        r"\{% if '([^']+)' in ([A-Za-z0-9_.]+) %\}|\{% else %\}|\{% endif %\}"
    )

    def evaluate_condition(value: str, path: str) -> bool:
        if path != "issue.labels":
            raise AssertionError(f"unexpected condition path in fixture: {path}")
        return value.lower() in labels

    def render_conditionals(position: int = 0) -> tuple[str, int, str | None]:
        chunks: list[str] = []
        while True:
            match = condition_token.search(raw, position)
            if match is None:
                chunks.append(raw[position:])
                return "".join(chunks), len(raw), None

            chunks.append(raw[position:match.start()])
            token = match.group(0)
            if token.startswith("{% if"):
                condition_value = evaluate_condition(match.group(1), match.group(2))
                then_body, next_position, stop_token = render_conditionals(match.end())
                else_body = ""
                if stop_token == "else":
                    else_body, next_position, stop_token = render_conditionals(next_position)
                if stop_token != "endif":
                    raise AssertionError("unterminated if block in fixture")
                chunks.append(then_body if condition_value else else_body)
                position = next_position
            elif token == "{% else %}":
                return "".join(chunks), match.end(), "else"
            elif token == "{% endif %}":
                return "".join(chunks), match.end(), "endif"
            else:
                raise AssertionError(f"unexpected token in fixture: {token}")

    raw, _, stop_token = render_conditionals()
    if stop_token is not None:
        raise AssertionError(f"unexpected top-level {stop_token} in fixture")

    raw = re.sub(
        r"\{% for label in issue\.labels %\}(.*?)\{% endfor %\}",
        lambda match: "".join(match.group(1).replace("{{ label }}", label) for label in labels),
        raw,
        flags=re.S,
    )

    replacements = {
        "{{ issue.identifier }}": issue["identifier"],
        "{{ issue.title }}": issue["title"],
        "{{ issue.state }}": issue["state"],
        "{{ issue.estimate }}": "" if issue["estimate"] is None else str(issue["estimate"]),
        "{{ attempt }}": str(attempt),
        "{{ issue.description }}": issue["description"],
    }
    for needle, value in replacements.items():
        raw = raw.replace(needle, value)
    return raw


implementation_issue = {
    "identifier": "AGENT-100",
    "title": "Implement fixture",
    "description": "Implementation issue description.",
    "estimate": 2,
    "state": "In Progress",
    "labels": ["bug"],
}
handoff_issue = {
    "identifier": "AGENT-101",
    "title": "Human handoff fixture",
    "description": "Autonomous prep instructions fixture.",
    "estimate": None,
    "state": "Todo",
    "labels": ["human-handoff"],
}
agent_prompt_issue = {
    "identifier": "AGENT-102",
    "title": "Prompt-as-prompt fixture",
    "description": "Linear description is the full prompt for this issue.",
    "estimate": 4,
    "state": "Todo",
    "labels": ["agent-prompt"],
}

implementation_rendered = render(compose(template), implementation_issue, 1)
legacy_rendered = render(legacy_template, implementation_issue, 1)
if implementation_rendered != legacy_rendered:
    raise SystemExit("FAIL: implementation render is not byte-identical to legacy output")

handoff_rendered = render(compose(template), handoff_issue, 1)
for required in [
    "Human handoff fixture",
    "AGENT-101",
    "State: Todo",
    "Estimate:",
    "Attempt: 1",
    "- human-handoff",
    "Autonomous prep instructions fixture.",
]:
    if required not in handoff_rendered:
        raise SystemExit(f"FAIL: HH render missing required payload: {required}")

for forbidden in [
    "Create at least one commit",
    "git status --porcelain",
    "Rebase the worktree branch",
    "Push the branch to origin",
    "gh pr create",
    "Use the PR title format",
    "Verification expectations:",
    verification_command,
]:
    if forbidden in handoff_rendered:
        raise SystemExit(f"FAIL: HH render still contains implementation-only text: {forbidden}")

agent_prompt_rendered = render(compose(template), agent_prompt_issue, 1)
for required in [
    "Linear description is the full prompt for this issue.",
]:
    if required not in agent_prompt_rendered:
        raise SystemExit(f"FAIL: agent-prompt render missing required payload: {required}")

for forbidden in [
    "You are implementing Linear issue",
    "Create at least one commit",
    "git status --porcelain",
    "Rebase the worktree branch",
    "Push the branch to origin",
    "gh pr create",
    "Use the PR title format",
    "Verification expectations:",
    verification_command,
    "__LOCAL_PROMPT_SECTIONS__",
]:
    if forbidden in agent_prompt_rendered:
        raise SystemExit(f"FAIL: agent-prompt mode still contains injected scaffolding: {forbidden}")

print("PASS: default agent prompt uses issue description only for agent-prompt label")
PY
