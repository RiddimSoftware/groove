#!/usr/bin/env python3
"""Sync the agent-prompt issue body into the Linear workspace template.

The source of truth is `context/templates/agent-prompt-issue-body.md`.
The workspace-level Linear issue template should point to the same body so humans
creating an "agent prompt" ticket get the correct skeleton.

Set `LINEAR_AGENT_PROMPT_TEMPLATE_ID` in CI or env before running.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import urllib.error
import urllib.request

from sync_hh_template import md_to_tiptap

LINEAR_API_URL = "https://api.linear.app/graphql"
TEMPLATE_FILE = "context/templates/agent-prompt-issue-body.md"
TEMPLATE_ID_ENV = "LINEAR_AGENT_PROMPT_TEMPLATE_ID"


def get_linear_token() -> str:
    token = os.environ.get("LINEAR_API_TOKEN")
    if token:
        return token
    result = subprocess.run(
        [
            "aws", "ssm", "get-parameter",
            "--region", "us-east-1",
            "--name", "/linear/api-token",
            "--with-decryption",
            "--query", "Parameter.Value",
            "--output", "text",
        ],
        capture_output=True,
        text=True,
        env={**os.environ, "AWS_PROFILE": os.environ.get("AWS_PROFILE", "your-aws-profile")},
    )
    if result.returncode != 0:
        raise RuntimeError(f"failed to fetch Linear token from SSM: {result.stderr.strip()}")
    return result.stdout.strip()


def graphql(token: str, query: str, variables: dict | None = None) -> dict:
    payload = json.dumps({"query": query, "variables": variables or {}}).encode("utf-8")
    req = urllib.request.Request(
        LINEAR_API_URL,
        data=payload,
        headers={"Authorization": token, "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read())
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Linear GraphQL HTTP {exc.code}: {body}") from exc
    if "errors" in data:
        raise RuntimeError(f"GraphQL error: {data['errors']}")
    return data["data"]


def build_template_body(md_text: str) -> dict:
    return {
        "priority": 0,
        "descriptionData": md_to_tiptap(md_text),
    }


def main() -> int:
    template_id = os.environ.get(TEMPLATE_ID_ENV)
    if not template_id:
        print(
            f"error: missing {TEMPLATE_ID_ENV}; set the repository variable before running this sync",
            file=sys.stderr,
        )
        return 1

    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    template_path = os.path.join(repo_root, TEMPLATE_FILE)

    if not os.path.exists(template_path):
        print(f"error: template file not found: {template_path}", file=sys.stderr)
        return 1

    print(f"sync-agent-prompt-template: reading {TEMPLATE_FILE}", flush=True)
    with open(template_path) as f:
        md = f.read()

    print("sync-agent-prompt-template: fetching Linear token", flush=True)
    token = get_linear_token()
    mutation = """
    mutation SyncAgentPromptTemplate($id: String!, $input: TemplateUpdateInput!) {
      templateUpdate(id: $id, input: $input) {
        success
        template { id name updatedAt }
      }
    }
    """
    print(f"sync-agent-prompt-template: updating Linear template {template_id}", flush=True)
    result = graphql(token, mutation, {
        "id": template_id,
        "input": {
            "name": "Agent Prompt",
            "description": "Template for implementation issues where the Linear description is the full prompt for Symphony.",
            "templateData": json.dumps(build_template_body(md)),
        },
    })

    update = result["templateUpdate"]
    if not update["success"]:
        print(f"error: templateUpdate returned success=false: {update}", file=sys.stderr)
        return 1

    print(f"synced: template {update['template']['id']} updated at {update['template']['updatedAt']}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(1)
