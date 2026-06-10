#!/usr/bin/env python3
"""context-audit planner.

Selection + deterministic evaluation + remediation *planning* for repository
agent-context files. This is the deterministic spine of the ``context-audit``
skill (see ``../SKILL.md``). It does three things and stops:

1. **Select** repositories (one / all / changed-since a ref).
2. **Evaluate** each via the AGENT-51 deterministic check library (D1-D9) - by
   shelling out to its published CLI. It never reimplements the rubric.
3. **Plan** remediation: classify drift, dedup against an already-open audit PR,
   apply the per-run PR cap, and render an evidence-cited PR body per repo.

It deliberately does NOT open pull requests, edit context files, or run the
J1-J4 judgment pass - those are the agent's job (SKILL.md) and the PR workflow
described there. Keeping side-effects out of the planner is what makes the
no-op / dedup / cap guarantees mechanical and testable.

Exit codes: ``0`` on a successful plan (including a clean no-op fleet); ``2`` on
a hard input error (missing library, missing registry, bad arguments). Finding
drift is the normal case and is never an error here.
"""

from __future__ import annotations

import argparse
import dataclasses
import datetime as _dt
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any, Optional

DEFAULT_AGENT_CONFIG = "/YOUR/WORKSPACE/DIR/agent-config"
DEFAULT_MAX_PRS = 5
# A deterministic, per-repo head branch: re-running updates the same PR instead
# of opening a second one. The dedup guarantee leans on this being stable.
AUDIT_BRANCH = "context-audit/drift"


@dataclasses.dataclass(frozen=True)
class RegistryEntry:
    name: str
    path: str
    default_branch: str = "main"
    remote: Optional[str] = None
    status: Optional[str] = None  # None means active
    aliases: tuple[str, ...] = ()

    @property
    def gh_slug(self) -> str:
        """owner/repo for `gh`, derived from the remote, else YourGithubOrg/<name>."""
        if self.remote:
            m = re.search(r"[:/]([^/:]+/[^/]+?)(?:\.git)?$", self.remote.strip())
            if m:
                return m.group(1)
        return f"YourGithubOrg/{self.name}"


# --------------------------------------------------------------------------- #
# Registry reading (selection is the skill's own port - a minimal, dependency-
# free parser of just the scalar keys selection needs; the D-checks stay in the
# library).
# --------------------------------------------------------------------------- #
def parse_registry(registry_path: Path) -> list[RegistryEntry]:
    text = registry_path.read_text(encoding="utf-8")
    entries: list[RegistryEntry] = []
    cur: dict[str, str] = {}

    def flush() -> None:
        if cur.get("name") and cur.get("path"):
            entries.append(
                RegistryEntry(
                    name=cur["name"],
                    path=cur["path"],
                    default_branch=cur.get("default_branch", "main"),
                    remote=cur.get("remote"),
                    status=cur.get("status"),
                    aliases=tuple(a for a in cur.get("aliases", "").split("\n") if a),
                )
            )
        cur.clear()

    in_repos = False
    in_aliases = False
    for raw in text.splitlines():
        if re.match(r"^\s*#", raw):
            continue
        if re.match(r"^repositories:\s*$", raw):
            in_repos = True
            continue
        if not in_repos:
            continue
        # A new list item under repositories: "  - name: foo"
        m = re.match(r"^\s*-\s+name:\s*(.+?)\s*$", raw)
        if m:
            flush()
            cur["name"] = _scalar(m.group(1))
            in_aliases = False
            continue
        if re.match(r"^\s{4}aliases:\s*$", raw) and cur:
            cur["aliases"] = ""
            in_aliases = True
            continue
        if in_aliases:
            alias = re.match(r"^\s{6}-\s+(.+?)\s*$", raw)
            if alias:
                cur["aliases"] += _scalar(alias.group(1)) + "\n"
                continue
            if raw.strip() and not re.match(r"^\s{6}", raw):
                in_aliases = False
        # A scalar key on the current entry: "    path: /..."
        m = re.match(r"^\s{2,}([A-Za-z_]+):\s*(.*)$", raw)
        if m and cur:
            key, val = m.group(1), m.group(2)
            if key in {"path", "default_branch", "remote", "status"} and val.strip():
                cur[key] = _scalar(val)
    flush()
    return entries


def _scalar(value: str) -> str:
    """Strip surrounding quotes and trailing inline comments from a YAML scalar."""
    value = value.strip()
    # Drop an inline comment, but only when not inside quotes.
    if value[:1] not in {'"', "'"}:
        value = value.split("#", 1)[0].strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
        value = value[1:-1]
    return value.strip()


# --------------------------------------------------------------------------- #
# Selection
# --------------------------------------------------------------------------- #
def select(
    entries: list[RegistryEntry],
    *,
    repo: Optional[str],
    all_repos: bool,
    changed_since: Optional[str],
) -> tuple[list[RegistryEntry], list[str]]:
    """Return (selected entries, notes). Selection rules are documented in SKILL.md."""
    notes: list[str] = []
    if repo:
        base = [e for e in entries if _matches(e, repo)]
        if not base:
            notes.append(f"no registry entry matched repo '{repo}'")
    else:
        # --all or bare --changed-since both start from the full fleet.
        base = list(entries)

    if changed_since:
        filtered: list[RegistryEntry] = []
        for e in base:
            verdict = changed_since_repo(Path(e.path), changed_since)
            if verdict is True:
                filtered.append(e)
            elif verdict is None:
                notes.append(f"{e.name}: ref '{changed_since}' not found; skipped from changed-since set")
        base = filtered
    return base, notes


def _matches(entry: RegistryEntry, token: str) -> bool:
    raw_token = token.strip()
    normalized = raw_token.lower()
    if normalized in {entry.name.lower(), entry.path.lower(), *(a.lower() for a in entry.aliases)}:
        return True
    # Allow passing an absolute path that resolves to the entry path.
    try:
        return Path(raw_token).resolve() == Path(entry.path).resolve()
    except OSError:
        return False


def changed_since_repo(repo_path: Path, ref: str) -> Optional[bool]:
    """True if the repo has commits in REF..HEAD; None if REF does not resolve."""
    if not (repo_path / ".git").exists():
        return None
    rev = subprocess.run(
        ["git", "-C", str(repo_path), "rev-parse", "--verify", "--quiet", ref + "^{commit}"],
        capture_output=True, text=True,
    )
    if rev.returncode != 0:
        return None
    out = subprocess.run(
        ["git", "-C", str(repo_path), "rev-list", "-n", "1", f"{ref}..HEAD"],
        capture_output=True, text=True,
    )
    return bool(out.stdout.strip())


def agent_config_checkout_notes(agent_config: Path) -> list[str]:
    """Surface stale/dirty library inputs without making the planner mutate them."""
    notes: list[str] = []
    if not (agent_config / ".git").exists():
        return notes

    dirty = subprocess.run(
        ["git", "-C", str(agent_config), "status", "--porcelain", "--",
         "scripts/context_audit", "context/repositories.yaml"],
        capture_output=True, text=True,
    )
    if dirty.returncode == 0 and dirty.stdout.strip():
        notes.append(
            "agent-config has local changes under scripts/context_audit or "
            "context/repositories.yaml; use a clean --agent-config worktree for release-grade runs"
        )

    behind = subprocess.run(
        ["git", "-C", str(agent_config), "rev-list", "--count", "HEAD..origin/main"],
        capture_output=True, text=True,
    )
    if behind.returncode == 0:
        try:
            count = int(behind.stdout.strip() or "0")
        except ValueError:
            count = 0
        if count:
            notes.append(
                f"agent-config checkout is {count} commit(s) behind origin/main; "
                "update it or pass a clean --agent-config worktree"
            )
    return notes


# --------------------------------------------------------------------------- #
# Deterministic evaluation - delegate to the AGENT-51 library CLI.
# --------------------------------------------------------------------------- #
class LibraryError(RuntimeError):
    pass


def run_library(repo_path: str, agent_config: Path, registry_path: Path) -> dict[str, Any]:
    """Invoke `python -m scripts.context_audit <repo> --format json` and parse it."""
    pkg = agent_config / "scripts" / "context_audit"
    if not (pkg / "checks.py").exists():
        raise LibraryError(
            f"AGENT-51 check library not found at {pkg}. Check out agent-config 'main' "
            f"or set CONTEXT_AUDIT_AGENT_CONFIG. See context-audit/SKILL.md."
        )
    proc = subprocess.run(
        [sys.executable, "-m", "scripts.context_audit", repo_path,
         "--format", "json", "--registry", str(registry_path)],
        cwd=str(agent_config), capture_output=True, text=True,
    )
    # Exit 1 (fails present) is expected; any other non-zero code is fatal.
    if proc.returncode not in (0, 1) or not proc.stdout.strip():
        raise LibraryError(
            f"library evaluation failed for {repo_path} (rc={proc.returncode}): "
            f"{proc.stderr.strip() or proc.stdout.strip()}"
        )
    try:
        return json.loads(proc.stdout)
    except json.JSONDecodeError as exc:  # pragma: no cover - defensive
        raise LibraryError(f"library returned non-JSON for {repo_path}: {exc}") from exc


def summary_for(results: list[dict[str, str]], data: dict[str, Any]) -> dict[str, int]:
    """Return the AGENT-51 summary, or compute it for older local checkouts."""
    raw = data.get("summary")
    if isinstance(raw, dict) and all(k in raw for k in ("pass", "warn", "fail", "skip")):
        return {k: int(raw.get(k, 0)) for k in ("pass", "warn", "fail", "skip")}
    summary = {"pass": 0, "warn": 0, "fail": 0, "skip": 0}
    for result in results:
        status = result.get("status")
        if status in summary:
            summary[status] += 1
    return summary


# --------------------------------------------------------------------------- #
# Dedup - best effort; the hard guarantee is enforced again at emit time.
# --------------------------------------------------------------------------- #
def existing_audit_pr(gh_slug: str, branch: str = AUDIT_BRANCH) -> Optional[dict[str, Any]]:
    """Return an open audit PR ({number,url}) for the repo, or None. Returns None
    (and is silently best-effort) when `gh` is unavailable/unauthenticated - the
    emitter re-checks before creating, so a missed dedup here never doubles PRs."""
    if shutil.which("gh") is None:
        return None
    proc = subprocess.run(
        ["gh", "pr", "list", "--repo", gh_slug, "--state", "open",
         "--head", branch, "--json", "number,url"],
        capture_output=True, text=True,
    )
    if proc.returncode != 0 or not proc.stdout.strip():
        return None
    try:
        items = json.loads(proc.stdout)
    except json.JSONDecodeError:
        return None
    return items[0] if items else None


# --------------------------------------------------------------------------- #
# PR body rendering (deterministic section; the agent appends J1-J4 + edits).
# --------------------------------------------------------------------------- #
def render_pr_body(name: str, results: list[dict[str, str]], summary: dict[str, int], mode: str) -> str:
    actionable = [r for r in results if r["status"] in {"fail", "warn"}]
    det_lines = (
        "\n".join(f"- **{r['check_id']} {r['status']}:** {r['message']}" for r in actionable)
        if actionable else "- All deterministic checks pass; this PR carries judgment edits only."
    )
    today = _dt.date.today().isoformat()
    return f"""## context-audit - `{name}` agent-context drift fix

Automated remediation from the `context-audit` skill. Per the Agent Context
Standard, **all audit PRs auto-merge on green**; revert this PR to roll back.

### Deterministic findings - D1-D9 (AGENT-51 check library)
{det_lines}

### Judgment findings - J1-J4 (LLM pass)
<!-- The agent fills this with grounded, evidence-cited edits, or states
     "No judgment findings." Every entry must cite repo evidence (path/line). -->

### What changed
<!-- One line per edit applied in this PR. -->

<sub>Trigger: {mode} | {today} | library summary pass={summary.get('pass', 0)} fail={summary.get('fail', 0)} warn={summary.get('warn', 0)} skip={summary.get('skip', 0)}</sub>
"""


# --------------------------------------------------------------------------- #
# Planning
# --------------------------------------------------------------------------- #
def build_plan(args: argparse.Namespace) -> dict[str, Any]:
    agent_config = Path(args.agent_config).expanduser()
    registry_path = Path(args.registry).expanduser() if args.registry else agent_config / "context" / "repositories.yaml"
    if not registry_path.exists():
        raise LibraryError(f"registry not found: {registry_path}")

    entries = parse_registry(registry_path)
    mode = (
        f"repo:{args.repo}" if args.repo
        else (f"changed-since:{args.changed_since}" if (args.changed_since and not args.all)
              else "all")
    )
    if args.changed_since:
        mode = (f"repo:{args.repo} " if args.repo else "all ") + f"changed-since:{args.changed_since}"

    selected, notes = select(
        entries, repo=args.repo, all_repos=args.all, changed_since=args.changed_since
    )
    notes.extend(agent_config_checkout_notes(agent_config))

    repos: list[dict[str, Any]] = []
    remediate_candidates: list[dict[str, Any]] = []
    for e in selected:
        rec: dict[str, Any] = {
            "name": e.name, "path": e.path, "gh_slug": e.gh_slug,
            "base_branch": e.default_branch, "branch": AUDIT_BRANCH,
        }
        if not Path(e.path).exists():
            rec["state"] = "no_checkout"
            repos.append(rec)
            continue
        try:
            data = run_library(e.path, agent_config, registry_path)
        except LibraryError as exc:
            rec["state"] = "error"
            rec["error"] = str(exc)
            repos.append(rec)
            continue
        results = data.get("results", [])
        summary = summary_for(results, data)
        rec["summary"] = summary
        rec["results"] = results
        rec["findings"] = [r for r in results if r["status"] in {"fail", "warn"}]
        if summary.get("fail", 0) == 0 and summary.get("warn", 0) == 0:
            rec["state"] = "clean"
            repos.append(rec)
            continue
        # Drifted. Dedup against an already-open audit PR.
        existing = existing_audit_pr(e.gh_slug)
        rec["existing_pr"] = existing
        if existing:
            rec["state"] = "deduped"
            repos.append(rec)
            continue
        rec["state"] = "remediate"  # provisional; cap may push to deferred
        rec["pr_body"] = render_pr_body(e.name, results, summary, mode)
        remediate_candidates.append(rec)
        repos.append(rec)

    # Apply the per-run cap to the remediate-eligible set (stable registry order).
    for rec in remediate_candidates[args.max_prs:]:
        rec["state"] = "deferred"
        rec.pop("pr_body", None)

    def count(state: str) -> int:
        return sum(1 for r in repos if r["state"] == state)

    plan = {
        "dry_run": bool(args.no_pr),
        "max_prs": args.max_prs,
        "mode": mode,
        "registry": str(registry_path),
        "agent_config": str(agent_config),
        "notes": notes,
        "counts": {
            "selected": len(selected),
            "no_checkout": count("no_checkout"),
            "error": count("error"),
            "clean": count("clean"),
            "drift": count("remediate") + count("deferred") + count("deduped"),
            "deduped": count("deduped"),
            "deferred_over_cap": count("deferred"),
            "to_remediate": count("remediate"),
        },
        "repos": repos if args.include_clean else [r for r in repos if r["state"] != "clean"],
    }
    return plan


# --------------------------------------------------------------------------- #
# Rendering
# --------------------------------------------------------------------------- #
def render_text(plan: dict[str, Any]) -> str:
    c = plan["counts"]
    banner = "DRY RUN - no PRs will be opened" if plan["dry_run"] else f"EXECUTE - agent will open up to {plan['max_prs']} PR(s)"
    lines = [
        f"context-audit | {banner}",
        f"mode={plan['mode']}  cap={plan['max_prs']}  registry={plan['registry']}",
        f"selected={c['selected']}  clean={c['clean']}  drift={c['drift']}  "
        f"to_remediate={c['to_remediate']}  deduped={c['deduped']}  "
        f"deferred_over_cap={c['deferred_over_cap']}  no_checkout={c['no_checkout']}  error={c['error']}",
    ]
    for note in plan.get("notes", []):
        lines.append(f"  note: {note}")
    if c["to_remediate"] == 0:
        lines.append("")
        lines.append("No repositories to remediate - opening 0 PRs (clean no-op).")
    for r in plan["repos"]:
        if r["state"] not in {"remediate", "deferred", "deduped", "error", "no_checkout"}:
            continue
        head = f"\n[{r['state'].upper()}] {r['name']}  ({r['gh_slug']})"
        lines.append(head)
        if r["state"] == "no_checkout":
            lines.append(f"  no local checkout at {r['path']}")
            continue
        if r["state"] == "error":
            lines.append(f"  {r.get('error', 'evaluation error')}")
            continue
        if r["state"] == "deduped":
            pr = r.get("existing_pr") or {}
            lines.append(f"  open audit PR already exists: {pr.get('url', '?')} - will update, not duplicate")
        for f in r.get("findings", []):
            lines.append(f"  - {f['check_id']} {f['status']}: {f['message']}")
        if r["state"] == "deferred":
            lines.append("  deferred: over the per-run cap; will be picked up next run")
    return "\n".join(lines) + "\n"


def build_arg_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="audit.py",
        description="Plan agent-context drift remediation across Riddim repositories (D1-D9 via the AGENT-51 library).",
    )
    sel = p.add_argument_group("selection (choose at least one)")
    sel.add_argument("--repo", metavar="NAME", help="audit a single repo by registry name, alias-name, or path")
    sel.add_argument("--all", action="store_true", help="audit every registered repo (the daily-routine mode)")
    sel.add_argument("--changed-since", metavar="REF",
                     help="restrict to repos with commits in REF..HEAD (on-merge mode); combinable with --repo/--all")
    p.add_argument("--max-prs", type=int, default=DEFAULT_MAX_PRS, help=f"per-run PR cap (default {DEFAULT_MAX_PRS})")
    p.add_argument("--no-pr", action="store_true", help="dry run: plan and print only; never author edits or open PRs")
    p.add_argument("--agent-config", default=os.environ.get("CONTEXT_AUDIT_AGENT_CONFIG", DEFAULT_AGENT_CONFIG),
                   help="path to the agent-config checkout hosting the AGENT-51 library")
    p.add_argument("--registry", default=None, help="path to repositories.yaml (default: <agent-config>/context/repositories.yaml)")
    p.add_argument("--format", choices=["text", "json"], default="text")
    p.add_argument("--include-clean", action="store_true", help="include clean repos in the output")
    return p


def main(argv: Optional[list[str]] = None) -> int:
    args = build_arg_parser().parse_args(argv)
    if not (args.repo or args.all or args.changed_since):
        print("error: choose a selection mode (--repo, --all, or --changed-since)", file=sys.stderr)
        return 2
    try:
        plan = build_plan(args)
    except LibraryError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    if args.format == "json":
        print(json.dumps(plan, indent=2))
    else:
        print(render_text(plan), end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
