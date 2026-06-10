#!/usr/bin/env python3
"""Sync context/templates/human-handoff-issue-body.md to the Linear workspace template.

Runs on push to main when the template file changes. Uses the self-hosted runner's
AWS_PROFILE=your-aws-profile to fetch the Linear API token from Parameter Store.
The GHA run log is the audit trail for every sync.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request

TEMPLATE_ID = "135dbbd2-68cc-46bc-873b-8b74788ea130"
LINEAR_API_URL = "https://api.linear.app/graphql"
TEMPLATE_FILE = "context/templates/human-handoff-issue-body.md"


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
        raise RuntimeError(f"Failed to fetch Linear token from Parameter Store: {result.stderr.strip()}")
    return result.stdout.strip()


def graphql(token: str, query: str, variables: dict | None = None) -> dict:
    payload = json.dumps({"query": query, "variables": variables or {}}).encode()
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


def parse_inline(text: str) -> list[dict]:
    """Convert inline markdown spans to TipTap inline nodes."""
    nodes: list[dict] = []
    # Order matters: **bold** before *italic* to avoid partial matches
    pattern = re.compile(r"\*\*(.+?)\*\*|`(.+?)`|\*(.+?)\*|([^*`]+)", re.DOTALL)
    for m in pattern.finditer(text):
        bold, code, italic, plain = m.groups()
        if bold is not None:
            nodes.append({"type": "text", "marks": [{"type": "strong"}], "text": bold})
        elif code is not None:
            nodes.append({"type": "text", "marks": [{"type": "code"}], "text": code})
        elif italic is not None:
            nodes.append({"type": "text", "marks": [{"type": "em"}], "text": italic})
        elif plain is not None:
            nodes.append({"type": "text", "text": plain})
    return nodes


def md_to_tiptap(md_text: str) -> dict:
    """Convert markdown to a TipTap document (Linear's rich-text format)."""
    lines = md_text.splitlines()
    content: list[dict] = []
    i = 0

    while i < len(lines):
        line = lines[i]

        # Blank line — paragraph boundary only
        if not line.strip():
            i += 1
            continue

        # ATX heading: ## Heading
        m = re.match(r"^(#{1,6})\s+(.+)$", line)
        if m:
            level = len(m.group(1))
            content.append({
                "type": "heading",
                "attrs": {"level": level},
                "content": parse_inline(m.group(2).strip()),
            })
            i += 1
            continue

        # Fenced code block
        if re.match(r"^```", line.strip()):
            lang_match = re.match(r"^```(\w*)", line.strip())
            lang = lang_match.group(1) if lang_match else ""
            i += 1
            code_lines: list[str] = []
            while i < len(lines) and not re.match(r"^```", lines[i].strip()):
                code_lines.append(lines[i])
                i += 1
            i += 1  # skip closing fence
            node: dict = {"type": "code_block", "content": [{"type": "text", "text": "\n".join(code_lines)}]}
            if lang:
                node["attrs"] = {"language": lang}
            content.append(node)
            continue

        # Todo list: - [ ] or - [x]
        if re.match(r"^- \[[ xX]\] ", line):
            items: list[dict] = []
            while i < len(lines) and re.match(r"^- \[[ xX]\] ", lines[i]):
                m2 = re.match(r"^- \[([ xX])\] (.+)$", lines[i])
                if m2:
                    done = m2.group(1).lower() == "x"
                    item_text = m2.group(2)
                    # Collect indented continuation lines
                    i += 1
                    while i < len(lines) and re.match(r"^  +", lines[i]) and not re.match(r"^- ", lines[i]):
                        item_text += " " + lines[i].strip()
                        i += 1
                    items.append({
                        "type": "todo_item",
                        "attrs": {"done": done},
                        "content": [{"type": "paragraph", "content": parse_inline(item_text)}],
                    })
                else:
                    i += 1
            content.append({"type": "todo_list", "content": items})
            continue

        # Ordered list: 1. item
        if re.match(r"^\d+\.\s+", line):
            items2: list[dict] = []
            while i < len(lines) and re.match(r"^\d+\.\s+", lines[i]):
                item_text = re.sub(r"^\d+\.\s+", "", lines[i])
                i += 1
                while i < len(lines) and re.match(r"^   ", lines[i]) and not re.match(r"^\d+\.", lines[i]):
                    item_text += " " + lines[i].strip()
                    i += 1
                items2.append({
                    "type": "list_item",
                    "content": [{"type": "paragraph", "content": parse_inline(item_text)}],
                })
            content.append({"type": "ordered_list", "attrs": {"order": 1}, "content": items2})
            continue

        # Bullet list: - item (not a todo)
        if re.match(r"^-\s+", line) and not re.match(r"^- \[", line):
            items3: list[dict] = []
            while i < len(lines) and re.match(r"^-\s+", lines[i]) and not re.match(r"^- \[", lines[i]):
                item_text = re.sub(r"^-\s+", "", lines[i])
                i += 1
                while i < len(lines) and re.match(r"^  +", lines[i]) and not re.match(r"^-", lines[i]):
                    item_text += " " + lines[i].strip()
                    i += 1
                items3.append({
                    "type": "list_item",
                    "content": [{"type": "paragraph", "content": parse_inline(item_text)}],
                })
            content.append({"type": "bullet_list", "content": items3})
            continue

        # Paragraph: collect lines until a block boundary
        para_lines: list[str] = []
        while i < len(lines):
            l = lines[i]
            is_block_start = (
                not l.strip()
                or re.match(r"^#{1,6}\s", l)
                or re.match(r"^```", l.strip())
                or re.match(r"^- \[[ xX]\] ", l)
                or re.match(r"^\d+\.\s+", l)
                or (re.match(r"^-\s+", l) and not re.match(r"^- \[", l))
            )
            if is_block_start:
                break
            para_lines.append(l)
            i += 1

        text = " ".join(para_lines).strip()
        if text:
            content.append({"type": "paragraph", "content": parse_inline(text)})

    return {"type": "doc", "content": content}


def main() -> None:
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    template_path = os.path.join(repo_root, TEMPLATE_FILE)

    if not os.path.exists(template_path):
        print(f"ERROR: template file not found: {template_path}", file=sys.stderr)
        sys.exit(1)

    with open(template_path) as f:
        md = f.read()

    doc = md_to_tiptap(md)
    template_data = {"priority": 0, "descriptionData": doc}

    token = get_linear_token()

    mutation = """
    mutation SyncHHTemplate($id: String!, $input: TemplateUpdateInput!) {
      templateUpdate(id: $id, input: $input) {
        success
        template { id name }
      }
    }
    """
    result = graphql(token, mutation, {
        "id": TEMPLATE_ID,
        "input": {"templateData": json.dumps(template_data)},
    })

    update = result["templateUpdate"]
    if update["success"]:
        print(f"Synced '{update['template']['name']}' to Linear (id: {TEMPLATE_ID})")
    else:
        print("templateUpdate returned success=false", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
