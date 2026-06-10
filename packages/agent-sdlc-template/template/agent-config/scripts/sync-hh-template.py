#!/usr/bin/env python3
"""Sync the canonical Human Handoff issue body into the Linear template.

The source of truth for the HH body is
`context/templates/human-handoff-issue-body.md`. The workspace-level Linear
issue template `Human Handoff` (template ID `135dbbd2-68cc-46bc-873b-8b74788ea130`)
is a mirror — it exists so humans creating HH issues in the Linear UI get
the verbatim contract block for free. This script pushes the .md into
Linear after edits.

Run after editing `context/templates/human-handoff-issue-body.md`. Idempotent.

Auth: requires the `your-aws-profile` AWS profile (reads the Linear API token
from AWS Parameter Store `/linear/api-token`).
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

TEMPLATE_ID = "135dbbd2-68cc-46bc-873b-8b74788ea130"
REPO_ROOT = Path(__file__).resolve().parent.parent
BODY_PATH = REPO_ROOT / "context" / "templates" / "human-handoff-issue-body.md"


def fetch_linear_token() -> str:
    env = {**os.environ, "AWS_PROFILE": "your-aws-profile"}
    return subprocess.check_output(
        [
            "aws", "ssm", "get-parameter",
            "--region", "us-east-1",
            "--name", "/linear/api-token",
            "--with-decryption",
            "--query", "Parameter.Value",
            "--output", "text",
        ],
        env=env,
        text=True,
    ).strip()


def linear_request(token: str, query: str, variables: dict) -> dict:
    req = urllib.request.Request(
        "https://api.linear.app/graphql",
        data=json.dumps({"query": query, "variables": variables}).encode("utf-8"),
        headers={"Authorization": token, "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.read().decode('utf-8')}", file=sys.stderr)
        raise


def main() -> int:
    if not BODY_PATH.is_file():
        print(f"missing {BODY_PATH}", file=sys.stderr)
        return 1

    body = BODY_PATH.read_text(encoding="utf-8")
    token = fetch_linear_token()

    # `templateData` is a JSON-encoded string of pre-filled issue fields.
    # We pass `description` as Markdown; Linear converts it into the
    # ProseMirror tree stored under `descriptionData` server-side.
    template_data = {"description": body, "priority": 0}

    mutation = """
    mutation Sync($id: String!, $input: TemplateUpdateInput!) {
      templateUpdate(id: $id, input: $input) {
        success
        template { id name updatedAt }
      }
    }
    """
    result = linear_request(token, mutation, {
        "id": TEMPLATE_ID,
        "input": {
            "name": "Human Handoff",
            "description": "Project-level Human Handoff issue. Pre-fills the verbatim Autonomous prep instructions contract that the read-only prep agent runs against, plus the standard scaffolding sections (Context, Anticipated human work, Discovered blockers, Verification checklist, Closing evidence). Canonical source: agent-config/context/templates/human-handoff-issue-body.md. See agent-config/context/human-handoff.md for the full spec.",
            "templateData": json.dumps(template_data),
        },
    })

    errors = result.get("errors")
    if errors:
        print(json.dumps(errors, indent=2), file=sys.stderr)
        return 1
    update = result["data"]["templateUpdate"]
    if not update["success"]:
        print(f"templateUpdate returned success=false: {update}", file=sys.stderr)
        return 1
    print(f"synced: template {update['template']['id']} updated at {update['template']['updatedAt']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
