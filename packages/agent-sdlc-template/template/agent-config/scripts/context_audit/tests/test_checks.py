"""Unit tests for the deterministic agent-context checks D1-D9.

Every check has at least one passing and one failing fixture. The repos and
registries are built hermetically under ``tmp_path`` so the suite is portable
(it does not depend on any repo living under ``/YOUR/WORKSPACE/DIR``) and can run
unchanged in CI.
"""

from __future__ import annotations

import json
import subprocess
import sys
import textwrap
from pathlib import Path

import pytest

# Make ``context_audit`` importable when the suite is collected from the repo
# root (``python -m pytest scripts/context_audit/``).
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from context_audit import checks  # noqa: E402
from context_audit.checks import (  # noqa: E402
    build_context,
    evaluate_repo,
    format_json,
    load_registry,
    main,
)

REFERENCE_SHIM = textwrap.dedent(
    """\
    # Agent Instructions

    This repository's canonical agent context lives in [`CLAUDE.md`](./CLAUDE.md).

    Read `CLAUDE.md` before multi-step work, regardless of which coding agent or tool is active.
    """
)

# Ordered required + recommended STRUCT keys for the conforming template.
DEFAULT_SNAPSHOT: list[tuple[str, str]] = [
    ("Purpose", "A sample repository used in tests."),
    ("Primary users", "internal tooling"),
    ("Production surface", "package"),
    ("Stack", "Python 3"),
    ("Package manager", "uv"),
    ("Build command", "N/A"),
    ("Test command", "python -m pytest"),
    ("Lint/Typecheck command", "N/A"),
    ("Verify command", "python -m pytest"),
    ("Linear team", "SMP (issue prefix `SMP-`)"),
    ("Canonical path", "{canonical}"),
    ("Status", "active"),
]


# --------------------------------------------------------------------------- #
# Fixture builders
# --------------------------------------------------------------------------- #
def make_claude(
    canonical: Path,
    *,
    drop: tuple[str, ...] = (),
    overrides: dict[str, str] | None = None,
    map_dirs: tuple[str, ...] = ("src/", "tests/"),
    include_snapshot: bool = True,
    header: str = "# Sample - Agent Context",
    pad_lines: int = 0,
) -> str:
    """Render a standard, schema-conforming CLAUDE.md for the pass cases."""

    overrides = overrides or {}
    lines = [
        header,
        "",
        "Canonical context; AGENTS.md is a thin shim pointing here.",
        "",
    ]
    if include_snapshot:
        lines += ["## Project Snapshot", ""]
        for key, value in DEFAULT_SNAPSHOT:
            if key in drop:
                continue
            rendered = overrides.get(key, value).replace("{canonical}", str(canonical))
            lines.append(f"- **{key}:** {rendered}")
        lines.append("")
    lines += ["## Repository Map", ""]
    for directory in map_dirs:
        lines.append(f"- `{directory}` - sample directory.")
    lines += [
        "",
        "## Architecture & Invariants",
        "",
        "The sample mental model. Landmine: never hand-edit generated files.",
    ]
    for index in range(pad_lines):
        lines.append(f"- Filler invariant line {index} to pad the budget.")
    return "\n".join(lines) + "\n"


def make_repo(
    tmp_path: Path,
    name: str = "repo",
    *,
    claude: str | None = None,
    agents: str | None = None,
    files: dict[str, str] | None = None,
    dirs: tuple[str, ...] = ("src", "tests"),
) -> Path:
    """Create a repo directory with the requested files and subdirectories."""

    repo = (tmp_path / name)
    repo.mkdir(parents=True, exist_ok=True)
    for directory in dirs:
        (repo / directory).mkdir(parents=True, exist_ok=True)
    if claude is not None:
        (repo / "CLAUDE.md").write_text(claude, encoding="utf-8")
    if agents is not None:
        (repo / "AGENTS.md").write_text(agents, encoding="utf-8")
    for rel, content in (files or {}).items():
        target = repo / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
    return repo.resolve()


def make_registry_text(entries: list[dict]) -> str:
    """Render a repositories.yaml that both PyYAML and the fallback parser read."""

    lines = ["version: 1", "default_github_owner: YourGithubOrg", "repositories:"]
    for entry in entries:
        lines.append(f"  - name: {entry['name']}")
        lines.append(f"    path: {entry['path']}")
        if entry.get("linear_team") is not None:
            lines.append(f"    linear_team: {entry['linear_team']}")
        lines.append(f"    remote: {entry.get('remote', 'null')}")
        if entry.get("status") is not None:
            lines.append(f"    status: {entry['status']}")
        lines.append("    aliases: []")
        lines.append("    context_files:")
        for context_file in entry.get("context_files", ["CLAUDE.md"]):
            lines.append(f"      - {context_file}")
    return "\n".join(lines) + "\n"


def build(
    tmp_path: Path,
    *,
    name: str = "repo",
    claude: str | None = None,
    agents: str | None = None,
    files: dict[str, str] | None = None,
    dirs: tuple[str, ...] = ("src", "tests"),
    registry_overrides: dict | None = None,
):
    """Create a repo + single-entry registry and return (context, repo, registry_path)."""

    repo = make_repo(tmp_path, name, claude=claude, agents=agents, files=files, dirs=dirs)
    entry = {
        "name": name,
        "path": str(repo),
        "linear_team": "SMP",
        "context_files": ["CLAUDE.md"],
    }
    entry.update(registry_overrides or {})
    registry_path = tmp_path / "repositories.yaml"
    registry_path.write_text(make_registry_text([entry]), encoding="utf-8")
    registry = load_registry(registry_path)
    return build_context(repo, registry), repo, registry_path


# --------------------------------------------------------------------------- #
# D1 - primary exists & non-empty
# --------------------------------------------------------------------------- #
def test_d1_pass(tmp_path):
    canonical = (tmp_path / "repo").resolve()
    ctx, _, _ = build(tmp_path, claude=make_claude(canonical))
    assert checks.check_d1(ctx).status == "pass"


def test_d1_fail_missing(tmp_path):
    ctx, _, _ = build(tmp_path, claude=None)
    result = checks.check_d1(ctx)
    assert result.status == "fail"
    assert "missing" in result.message.lower()


def test_d1_fail_too_short(tmp_path):
    ctx, _, _ = build(tmp_path, claude="# Title\n\nOne short line.\n")
    assert checks.check_d1(ctx).status == "fail"


def test_d1_skip_when_inactive(tmp_path):
    ctx, _, _ = build(tmp_path, claude=None, registry_overrides={"status": "inactive"})
    assert checks.check_d1(ctx).status == "skip"


# --------------------------------------------------------------------------- #
# D2 - no placeholder shipped
# --------------------------------------------------------------------------- #
def test_d2_pass(tmp_path):
    canonical = (tmp_path / "repo").resolve()
    ctx, _, _ = build(tmp_path, claude=make_claude(canonical))
    assert checks.check_d2(ctx).status == "pass"


def test_d2_fail_names_marker(tmp_path):
    canonical = (tmp_path / "repo").resolve()
    body = make_claude(canonical) + "\n## Notes\n\nTODO: fill this in.\n"
    ctx, _, _ = build(tmp_path, claude=body)
    result = checks.check_d2(ctx)
    assert result.status == "fail"
    assert "TODO" in result.message


# --------------------------------------------------------------------------- #
# D3 - shim points home
# --------------------------------------------------------------------------- #
def test_d3_pass(tmp_path):
    canonical = (tmp_path / "repo").resolve()
    ctx, _, _ = build(tmp_path, claude=make_claude(canonical), agents=REFERENCE_SHIM)
    assert checks.check_d3(ctx).status == "pass"


def test_d3_skip_when_absent(tmp_path):
    canonical = (tmp_path / "repo").resolve()
    ctx, _, _ = build(tmp_path, claude=make_claude(canonical), agents=None)
    assert checks.check_d3(ctx).status == "skip"


def test_d3_fail_too_long(tmp_path):
    canonical = (tmp_path / "repo").resolve()
    long_shim = "# Agent Instructions\n\nSee [`CLAUDE.md`](./CLAUDE.md).\n" + "\n".join(
        f"Line {n}" for n in range(20)
    )
    ctx, _, _ = build(tmp_path, claude=make_claude(canonical), agents=long_shim)
    result = checks.check_d3(ctx)
    assert result.status == "fail"
    assert "15 lines" in result.message


def test_d3_fail_no_link(tmp_path):
    canonical = (tmp_path / "repo").resolve()
    ctx, _, _ = build(
        tmp_path,
        claude=make_claude(canonical),
        agents="# Agent Instructions\n\nRead the docs before working.\n",
    )
    assert checks.check_d3(ctx).status == "fail"


# --------------------------------------------------------------------------- #
# D4 - budget
# --------------------------------------------------------------------------- #
def test_d4_pass(tmp_path):
    canonical = (tmp_path / "repo").resolve()
    ctx, _, _ = build(tmp_path, claude=make_claude(canonical))
    assert checks.check_d4(ctx).status == "pass"


def test_d4_warn_over_120(tmp_path):
    canonical = (tmp_path / "repo").resolve()
    ctx, _, _ = build(tmp_path, claude=make_claude(canonical, pad_lines=110))
    result = checks.check_d4(ctx)
    assert result.status == "warn"
    assert len(ctx.primary_text.splitlines()) <= 150


def test_d4_fail_over_150(tmp_path):
    canonical = (tmp_path / "repo").resolve()
    ctx, _, _ = build(tmp_path, claude=make_claude(canonical, pad_lines=200))
    assert checks.check_d4(ctx).status == "fail"


# --------------------------------------------------------------------------- #
# D5 - STRUCT schema present & parseable
# --------------------------------------------------------------------------- #
def test_d5_pass(tmp_path):
    canonical = (tmp_path / "repo").resolve()
    ctx, _, _ = build(tmp_path, claude=make_claude(canonical))
    assert checks.check_d5(ctx).status == "pass"


def test_d5_fail_missing_key_is_named(tmp_path):
    canonical = (tmp_path / "repo").resolve()
    ctx, _, _ = build(tmp_path, claude=make_claude(canonical, drop=("Test command",)))
    result = checks.check_d5(ctx)
    assert result.status == "fail"
    assert "Test command" in result.message


def test_d5_fail_no_snapshot_block(tmp_path):
    canonical = (tmp_path / "repo").resolve()
    ctx, _, _ = build(tmp_path, claude=make_claude(canonical, include_snapshot=False))
    result = checks.check_d5(ctx)
    assert result.status == "fail"
    assert "Project Snapshot" in result.message


# --------------------------------------------------------------------------- #
# D6 - mapped dirs resolve
# --------------------------------------------------------------------------- #
def test_d6_pass(tmp_path):
    canonical = (tmp_path / "repo").resolve()
    ctx, _, _ = build(tmp_path, claude=make_claude(canonical, map_dirs=("src/", "tests/")))
    assert checks.check_d6(ctx).status == "pass"


def test_d6_fail_missing_dir_is_named(tmp_path):
    canonical = (tmp_path / "repo").resolve()
    ctx, _, _ = build(
        tmp_path,
        claude=make_claude(canonical, map_dirs=("src/", "apps/foo/")),
    )
    result = checks.check_d6(ctx)
    assert result.status == "fail"
    assert "apps/foo" in result.message


def test_d6_pass_when_planned(tmp_path):
    canonical = (tmp_path / "repo").resolve()
    claude = make_claude(canonical, map_dirs=("src/",))
    claude += "\n- `apps/future/` - new surface (planned).\n"
    ctx, _, _ = build(tmp_path, claude=claude)
    assert checks.check_d6(ctx).status == "pass"


def test_d6_ignores_inline_code_that_is_not_a_path(tmp_path):
    canonical = (tmp_path / "repo").resolve()
    claude = make_claude(canonical, map_dirs=("src/",))
    # `daemonbin` is a binary name in inline code, not a directory; must not fail.
    claude += "\n- `src/` runs the `daemonbin` binary.\n"
    ctx, _, _ = build(tmp_path, claude=claude)
    assert checks.check_d6(ctx).status == "pass"


# --------------------------------------------------------------------------- #
# D7 - commands resolve
# --------------------------------------------------------------------------- #
def test_d7_pass_python_and_na(tmp_path):
    canonical = (tmp_path / "repo").resolve()
    ctx, _, _ = build(tmp_path, claude=make_claude(canonical))
    assert checks.check_d7(ctx).status == "pass"


def test_d7_pass_make_target_present(tmp_path):
    canonical = (tmp_path / "repo").resolve()
    claude = make_claude(canonical, overrides={"Build command": "make build"})
    ctx, _, _ = build(
        tmp_path,
        claude=claude,
        files={"Makefile": "build:\n\techo building\n"},
    )
    assert checks.check_d7(ctx).status == "pass"


def test_d7_fail_make_target_absent(tmp_path):
    canonical = (tmp_path / "repo").resolve()
    claude = make_claude(canonical, overrides={"Build command": "make ship"})
    ctx, _, _ = build(
        tmp_path,
        claude=claude,
        files={"Makefile": "build:\n\techo building\n"},
    )
    result = checks.check_d7(ctx)
    assert result.status == "fail"
    assert "ship" in result.message


def test_d7_unrecognized_command_does_not_fail(tmp_path):
    canonical = (tmp_path / "repo").resolve()
    claude = make_claude(canonical, overrides={"Build command": "bazel build //..."})
    ctx, _, _ = build(tmp_path, claude=claude)
    assert checks.check_d7(ctx).status == "pass"


# --------------------------------------------------------------------------- #
# D8 - registry agreement
# --------------------------------------------------------------------------- #
def test_d8_pass(tmp_path):
    canonical = (tmp_path / "repo").resolve()
    ctx, _, _ = build(tmp_path, claude=make_claude(canonical))
    assert checks.check_d8(ctx).status == "pass"


def test_d8_fail_missing_context_file(tmp_path):
    canonical = (tmp_path / "repo").resolve()
    ctx, _, _ = build(
        tmp_path,
        claude=make_claude(canonical),
        registry_overrides={"context_files": ["CLAUDE.md", "README.md"]},
    )
    result = checks.check_d8(ctx)
    assert result.status == "fail"
    assert "README.md" in result.message


def test_d8_fail_team_mismatch(tmp_path):
    canonical = (tmp_path / "repo").resolve()
    ctx, _, _ = build(
        tmp_path,
        claude=make_claude(canonical),
        registry_overrides={"linear_team": "XYZ"},
    )
    result = checks.check_d8(ctx)
    assert result.status == "fail"
    assert "XYZ" in result.message and "SMP" in result.message


# --------------------------------------------------------------------------- #
# D9 - canonical-path truthful
# --------------------------------------------------------------------------- #
def test_d9_pass(tmp_path):
    canonical = (tmp_path / "repo").resolve()
    ctx, _, _ = build(tmp_path, claude=make_claude(canonical))
    assert checks.check_d9(ctx).status == "pass"


def test_d9_fail_wrong_path(tmp_path):
    canonical = (tmp_path / "repo").resolve()
    ctx, _, _ = build(
        tmp_path,
        claude=make_claude(canonical, overrides={"Canonical path": "/YOUR/WORKSPACE/DIR/wrong"}),
    )
    result = checks.check_d9(ctx)
    assert result.status == "fail"
    assert "wrong" in result.message


def test_runner_checkout_path_matches_registry_by_tokenized_github_remote(tmp_path):
    canonical = (tmp_path / "canonical" / "agent-config").resolve()
    checkout = make_repo(
        tmp_path,
        "actions-runners/runner3/_work/agent-config/agent-config",
        claude=make_claude(canonical),
    )
    subprocess.run(["git", "init"], cwd=checkout, check=True, capture_output=True, text=True)
    subprocess.run(
        [
            "git",
            "remote",
            "add",
            "origin",
            "https://x-access-token:ghs_redacted@github.com/YourGithubOrg/agent-config.git",
        ],
        cwd=checkout,
        check=True,
        capture_output=True,
        text=True,
    )

    registry_path = tmp_path / "repositories.yaml"
    registry_path.write_text(
        make_registry_text([
            {
                "name": "agent-config",
                "path": str(canonical),
                "linear_team": "SMP",
                "remote": "git@github.com:YourGithubOrg/agent-config.git",
                "context_files": ["CLAUDE.md"],
            }
        ]),
        encoding="utf-8",
    )
    registry = load_registry(registry_path)
    ctx = build_context(checkout, registry)

    assert ctx.registry_entry is not None
    assert ctx.registry_entry.name == "agent-config"
    assert checks.check_d8(ctx).status == "pass"
    assert checks.check_d9(ctx).status == "pass"


# --------------------------------------------------------------------------- #
# Inactive repos: D1/D4/D6/D7 skip, D8/D9 still run
# --------------------------------------------------------------------------- #
def test_inactive_skips_filesystem_checks_but_runs_registry(tmp_path):
    canonical = (tmp_path / "repo").resolve()
    # A map naming a missing dir would fail D6 if active; inactive must skip it.
    claude = make_claude(
        canonical,
        overrides={"Status": "inactive"},
        map_dirs=("does-not-exist/",),
    )
    ctx, _, _ = build(tmp_path, claude=claude)
    assert checks.check_d1(ctx).status == "skip"
    assert checks.check_d4(ctx).status == "skip"
    assert checks.check_d6(ctx).status == "skip"
    assert checks.check_d7(ctx).status == "skip"
    assert checks.check_d8(ctx).status == "pass"
    assert checks.check_d9(ctx).status == "pass"


# --------------------------------------------------------------------------- #
# Holistic: exemplar passes all D1-D9; captured stub fails D1/D5
# --------------------------------------------------------------------------- #
def _autopilot_legacy_claude(canonical: Path) -> str:
    """A faithful capture of the autopilot legacy-schema context file.

    Exercises the transitional compatibility layer (Tracker/project, Local Setup
    command block, Canonical repo path) end to end.
    """

    return textwrap.dedent(
        f"""\
        # Autopilot - Agent Context

        This file is the canonical source of truth for agents working in this repository. `AGENTS.md` is a compatibility shim that points here.

        ## Project Snapshot

        - **Purpose:** Autopilot is the Swift implementation home for Symphony.
        - **Primary users/customers:** Riddim internal engineering and operations teams.
        - **Production surface:** Internal Swift package + CLI/daemon (`symphonyd`).
        - **Tracker/project:** **Autopilot** (`AUTO`) is the team for repo maintenance.
        - **Canonical repo path:** `{canonical}`.

        ## Local Setup

        - **Primary stack:** Swift Package Manager.
        - **Install/build command:** `swift build`
        - **Test command:** `swift test`
        - **Symphony validation command:** `swift run symphonyd --validate-only WORKFLOW.md`

        ## Repository Map

        - `Sources/` - AutopilotCore and `symphonyd` implementation.
        - `Tests/` - Swift package tests.
        - `docs/symphony.md` - product/runtime behavior notes.
        - `.github/workflows/` - CI shims and auto-merge wiring.

        ## Engineering Rules

        - `main` is integration-safe only; do not treat merges as release approval.
        """
    )


def test_exemplar_autopilot_passes_all(tmp_path):
    repo = make_repo(
        tmp_path,
        "autopilot",
        agents=REFERENCE_SHIM,
        files={
            "Package.swift": "// swift-tools-version:5.9\n",
            "README.md": "# Autopilot\n",
            "docs/symphony.md": "# Symphony\n",
        },
        dirs=("Sources", "Tests", ".github/workflows"),
    )
    (repo / "CLAUDE.md").write_text(_autopilot_legacy_claude(repo), encoding="utf-8")
    registry_path = tmp_path / "repositories.yaml"
    registry_path.write_text(
        make_registry_text(
            [
                {
                    "name": "autopilot",
                    "path": str(repo),
                    "linear_team": "AUTO",
                    "context_files": ["README.md"],
                }
            ]
        ),
        encoding="utf-8",
    )
    results = evaluate_repo(repo, registry_path=registry_path)
    statuses = {r.check_id: r.status for r in results}
    assert statuses == {f"D{n}": "pass" for n in range(1, 10)}, statuses


def test_stub_baseball_fails_d1_and_d5(tmp_path):
    # baseball "as captured": a two-line README, no CLAUDE.md.
    repo = make_repo(
        tmp_path,
        "baseball",
        files={"README.md": "# baseball\nPitch-by-pitch simulator (moonshot experiment)\n"},
        dirs=(),
    )
    registry_path = tmp_path / "repositories.yaml"
    registry_path.write_text(
        make_registry_text(
            [
                {
                    "name": "baseball",
                    "path": str(repo),
                    "linear_team": "BASE",
                    "context_files": ["README.md"],
                }
            ]
        ),
        encoding="utf-8",
    )
    results = {r.check_id: r.status for r in evaluate_repo(repo, registry_path=registry_path)}
    assert results["D1"] == "fail"
    assert results["D5"] == "fail"


# --------------------------------------------------------------------------- #
# Contract: evaluate_repo shape, CLI exit codes, JSON output
# --------------------------------------------------------------------------- #
def test_evaluate_repo_returns_nine_ordered_results(tmp_path):
    canonical = (tmp_path / "repo").resolve()
    _, repo, registry_path = build(tmp_path, claude=make_claude(canonical))
    results = evaluate_repo(repo, registry_path=registry_path)
    assert [r.check_id for r in results] == [f"D{n}" for n in range(1, 10)]
    for result in results:
        assert result.status in {"pass", "fail", "warn", "skip"}
        assert result.message.startswith(f"{result.check_id}:")


def test_cli_exit_zero_on_pass(tmp_path, capsys):
    canonical = (tmp_path / "repo").resolve()
    _, repo, registry_path = build(tmp_path, claude=make_claude(canonical))
    code = main([str(repo), "--registry", str(registry_path)])
    assert code == 0
    assert "Summary:" in capsys.readouterr().out


def test_cli_exit_one_on_fail(tmp_path):
    _, repo, registry_path = build(tmp_path, claude="# Title\n\ntoo short\n")
    code = main([str(repo), "--registry", str(registry_path)])
    assert code == 1


def test_cli_exit_two_on_missing_registry(tmp_path):
    code = main([str(tmp_path / "repo"), "--registry", str(tmp_path / "nope.yaml")])
    assert code == 2


def test_cli_json_contract(tmp_path, capsys):
    canonical = (tmp_path / "repo").resolve()
    _, repo, registry_path = build(tmp_path, claude=make_claude(canonical))
    code = main([str(repo), "--registry", str(registry_path), "--format", "json"])
    assert code == 0
    payload = json.loads(capsys.readouterr().out)
    assert set(payload) == {"repo_path", "registry_path", "results", "summary"}
    assert len(payload["results"]) == 9
    for entry in payload["results"]:
        assert set(entry) == {"check_id", "status", "message"}
    assert set(payload["summary"]) == {"pass", "warn", "fail", "skip"}
    assert sum(payload["summary"].values()) == 9


def test_format_json_is_stable(tmp_path):
    canonical = (tmp_path / "repo").resolve()
    _, repo, registry_path = build(tmp_path, claude=make_claude(canonical))
    results = evaluate_repo(repo, registry_path=registry_path)
    rendered = format_json(results, repo, registry_path)
    assert json.loads(rendered)["summary"]["pass"] >= 1


def test_module_entrypoint_runs(tmp_path):
    """`python -m context_audit <repo>` works via the documented PYTHONPATH form."""

    canonical = (tmp_path / "repo").resolve()
    _, repo, registry_path = build(tmp_path, claude=make_claude(canonical))
    scripts_dir = Path(checks.__file__).resolve().parents[1]
    completed = subprocess.run(
        [sys.executable, "-m", "context_audit", str(repo), "--registry", str(registry_path)],
        env={"PYTHONPATH": str(scripts_dir), "PATH": __import__("os").environ.get("PATH", "")},
        capture_output=True,
        text=True,
    )
    assert completed.returncode == 0, completed.stderr
    assert "D1" in completed.stdout
