#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd -P "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

python3 - "$ROOT" <<'PY'
import sys
from pathlib import Path

root = Path(sys.argv[1])
template = (root / "context/templates/agent-prompt-issue-body.md").read_text()

# The canonical skeleton intentionally keeps placeholder text (e.g. "<One sentence...>")
# so filled issues are self-contained without being an example. The contract tests below
# enforce section presence and durable safety guardrails — not exact prose — so useful
# wording changes pass while structural regressions fail.

required_sections = [
    "## Target",
    "## Source-of-truth inputs",
    "## Expected output",
    "## Project review output contract",
    "## Acceptance TDD contract",
    "## Architecture gate",
    "## Surface gate",
    "## Verification matrix",
    "## Stop conditions",
    "## Failure trace",
]

for section in required_sections:
    if section not in template:
        raise SystemExit(f"FAIL: missing required section: {section}")

# Project-review safeguards — protect correctness for gate/verification issues
review_safeguards = {
    "Follow-up issue target Project:": (
        "follow-up issues must name the same Linear Project"
    ),
    "No-code expectation:": (
        "reviewers must declare explicitly whether this issue closes without a PR"
    ),
    "not needing follow-up": (
        "remediation findings must be filed or recorded as accepted residual risk"
    ),
}

for phrase, rationale in review_safeguards.items():
    if phrase not in template:
        raise SystemExit(
            f"FAIL: missing project-review safeguard ({rationale}): {phrase!r}"
        )

# Surface/testing safeguards — keep UI interaction deterministic and human exercises explicit
surface_safeguards = {
    "Model UI interaction: none; write or run deterministic tests instead.": (
        "prohibits non-deterministic model UI interaction in surface gate"
    ),
    "Human exercise:": (
        "requires at least one named human exercise scenario in the verification matrix"
    ),
    "Expected success signal:": (
        "human exercise must document what success looks like"
    ),
    "Expected failure signal:": (
        "human exercise must document what failure looks like"
    ),
}

for phrase, rationale in surface_safeguards.items():
    if phrase not in template:
        raise SystemExit(
            f"FAIL: missing surface/testing safeguard ({rationale}): {phrase!r}"
        )

# Failure trace — every issue must include a pre-filled failure trace scaffold
failure_trace_fields = [
    "- First failing command or test:",
    "- Short error excerpt:",
    "- Likely failure class:",
    "- Next debug step:",
]

for field in failure_trace_fields:
    if field not in template:
        raise SystemExit(f"FAIL: missing failure-trace field: {field!r}")

print("PASS: agent-prompt template contract checks passed")
PY
