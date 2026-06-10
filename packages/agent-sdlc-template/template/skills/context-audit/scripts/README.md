# context-audit scripts

`audit.py` is the side-effect-free planner for the `context-audit` skill.

It does not edit files, run the J1-J4 judgment pass, commit, push, or open PRs.
It selects repositories, delegates D1-D9 to the AGENT-51 library in
`/YOUR/WORKSPACE/DIR/agent-config/scripts/context_audit/`, checks for an existing
audit PR, applies the per-run cap for deterministic drift, and prints the run
ledger the skill uses for remediation.

Use a current `agent-config` checkout. If the root checkout is stale or dirty,
pass a clean worktree with `--agent-config <path>`.

## Modes

```bash
python context-audit/scripts/audit.py --repo autopilot --no-pr --include-clean
python context-audit/scripts/audit.py --all --max-prs 5 --no-pr
python context-audit/scripts/audit.py --all --changed-since origin/main --no-pr
python context-audit/scripts/audit.py --repo /YOUR/WORKSPACE/DIR/autopilot --format json --include-clean
```

`--no-pr` is carried in the output so the skill can clearly report dry-run mode,
but the script is always non-mutating.

## Output

Text output is for humans. JSON output is the stable shape for agents:

```json
{
  "dry_run": true,
  "max_prs": 5,
  "mode": "repo:autopilot",
  "counts": {
    "selected": 1,
    "clean": 1,
    "drift": 0,
    "to_remediate": 0
  },
  "repos": [
    {
      "name": "autopilot",
      "path": "/YOUR/WORKSPACE/DIR/autopilot",
      "gh_slug": "YourGithubOrg/autopilot",
      "state": "clean",
      "summary": {"pass": 9, "warn": 0, "fail": 0, "skip": 0},
      "findings": []
    }
  ]
}
```

Warnings count as drift because the proactive audit should remove budget
pressure before it becomes a blocking failure.
