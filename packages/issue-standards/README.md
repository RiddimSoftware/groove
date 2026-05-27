# issue-standards

A Claude Code skill that teaches agents (and humans) how to write issues that
autonomous developers can actually finish.

## Install

```bash
npx issue-standards setup
```

This copies the skill into `~/.claude/skills/issue-standards/`. After that,
`/issue-standards` is available in any Claude Code session.

## What it covers

- **The core rule** — an issue must be self-contained enough for a different team
  to complete it without asking the writer anything
- **Required sections** — title, context, acceptance criteria, inputs/dependencies,
  definition of done, estimate, and more
- **Acceptance criteria discipline** — what belongs in AC vs. what belongs in a
  human-handoff issue
- **The human-handoff pattern** — one issue per project aggregates all human-only
  work; every other issue stays autonomously completable
- **Sizing discipline** — one issue, one repo, one reason to change
- **Complexity estimation** — the `1, 2, 4, 8, 16` ladder (complexity, not hours)
- **Use-case-shaped issues** — naming application behaviors before naming
  implementation details

## Usage

Invoke the skill in a Claude Code session when writing or reviewing issues:

```
/issue-standards

Write a new issue for adding pagination to the search results API.
```

Or add it to your agent's system context so it applies automatically whenever
issues are created.

## Tracker compatibility

The standard is written around Linear examples but the principles apply to GitHub
Issues, Jira, or any tracker. The `Estimate` field maps to story points, effort
level, or any complexity signal your workflow uses.

## Customising

The skill is a single `SKILL.md` file installed at
`~/.claude/skills/issue-standards/SKILL.md`. Edit it directly to adapt the
standard to your team's conventions — tighter AC format, different estimate
scale, additional required sections.

## Uninstall

```bash
rm -rf ~/.claude/skills/issue-standards
```
