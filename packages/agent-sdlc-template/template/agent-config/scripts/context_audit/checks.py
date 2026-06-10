"""Deterministic checks D1-D9 for repository agent-context files.

The functions in this module are deliberately framework-free. They return a
stable ``CheckResult`` shape consumed by the CLI, CI adapter, and future skills.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shlex
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence


RESULT_STATUSES = {"pass", "fail", "warn", "skip"}
PRIMARY_FILENAME = "CLAUDE.md"
SHIM_FILENAME = "AGENTS.md"
REQUIRED_SNAPSHOT_KEYS = (
    "Purpose",
    "Production surface",
    "Stack",
    "Build command",
    "Test command",
    "Linear team",
    "Canonical path",
    "Status",
)
COMMAND_KEYS = (
    "Build command",
    "Test command",
    "Lint/Typecheck command",
    "Verify command",
)
PLACEHOLDER_RE = re.compile(r"\b(TODO|TBD|Unknown|FIXME)\b")


@dataclass(frozen=True)
class CheckResult:
    check_id: str
    status: str
    message: str

    def __post_init__(self) -> None:
        if self.status not in RESULT_STATUSES:
            raise ValueError(f"invalid check status: {self.status}")

    def to_dict(self) -> dict[str, str]:
        return {
            "check_id": self.check_id,
            "status": self.status,
            "message": self.message,
        }


@dataclass(frozen=True)
class RepoRegistryEntry:
    name: str
    path: str
    linear_team: str | None
    context_files: tuple[str, ...]
    aliases: tuple[str, ...] = ()
    remote: str | None = None
    status: str | None = None


@dataclass(frozen=True)
class Registry:
    path: Path
    entries: tuple[RepoRegistryEntry, ...]

    def find_by_name(self, name: str) -> RepoRegistryEntry | None:
        normalized = name.lower()
        for entry in self.entries:
            names = (entry.name, *entry.aliases)
            if any(candidate.lower() == normalized for candidate in names):
                return entry
        return None

    def find_by_path(self, repo_path: Path) -> RepoRegistryEntry | None:
        resolved = repo_path.resolve()
        exact = [
            entry
            for entry in self.entries
            if _same_or_parent(Path(entry.path), resolved)
        ]
        if exact:
            return max(exact, key=lambda entry: len(Path(entry.path).parts))

        remote = _git_origin_url(resolved)
        if remote:
            for entry in self.entries:
                if entry.remote and _normalize_remote(entry.remote) == _normalize_remote(remote):
                    return entry
        return None


@dataclass(frozen=True)
class Snapshot:
    fields: Mapping[str, str]
    normalized_fields: Mapping[str, str]
    section_present: bool


@dataclass(frozen=True)
class EvaluationContext:
    repo_path: Path
    registry: Registry
    registry_entry: RepoRegistryEntry | None
    primary_path: Path
    shim_path: Path
    primary_text: str | None
    snapshot: Snapshot

    @property
    def is_inactive(self) -> bool:
        registry_status = (self.registry_entry.status if self.registry_entry else None) or ""
        snapshot_status = self.snapshot.normalized_fields.get("Status", "")
        return registry_status.lower() == "inactive" or snapshot_status.lower() == "inactive"


def evaluate_repo(
    repo_path: str | os.PathLike[str],
    registry_path: str | os.PathLike[str] | None = None,
) -> list[CheckResult]:
    """Run D1-D9 against a repository path or registered repo name."""

    registry = load_registry(_default_registry_path() if registry_path is None else Path(registry_path))
    resolved_repo_path = resolve_repo_path(repo_path, registry)
    context = build_context(resolved_repo_path, registry)
    return [
        check_d1(context),
        check_d2(context),
        check_d3(context),
        check_d4(context),
        check_d5(context),
        check_d6(context),
        check_d7(context),
        check_d8(context),
        check_d9(context),
    ]


def build_context(repo_path: Path, registry: Registry) -> EvaluationContext:
    repo_path = repo_path.resolve()
    primary_path = repo_path / PRIMARY_FILENAME
    primary_text = primary_path.read_text(encoding="utf-8") if primary_path.exists() else None
    snapshot = parse_snapshot(primary_text or "")
    return EvaluationContext(
        repo_path=repo_path,
        registry=registry,
        registry_entry=registry.find_by_path(repo_path),
        primary_path=primary_path,
        shim_path=repo_path / SHIM_FILENAME,
        primary_text=primary_text,
        snapshot=snapshot,
    )


def check_d1(context: EvaluationContext) -> CheckResult:
    if context.is_inactive:
        return _result("D1", "skip", "Repository is inactive; CLAUDE.md is not required.")
    if context.primary_text is None:
        return _result("D1", "fail", "CLAUDE.md is missing. Add the primary agent-context file.")

    nonblank = sum(1 for line in context.primary_text.splitlines() if line.strip())
    if nonblank <= 10:
        return _result(
            "D1",
            "fail",
            f"CLAUDE.md has {nonblank} non-blank lines; expand it beyond 10 non-blank lines.",
        )
    return _result("D1", "pass", f"CLAUDE.md exists with {nonblank} non-blank lines.")


def check_d2(context: EvaluationContext) -> CheckResult:
    if context.primary_text is None:
        return _result("D2", "skip", "CLAUDE.md is missing; placeholder scan is not applicable.")

    matches = sorted(set(PLACEHOLDER_RE.findall(context.primary_text)))
    if matches:
        markers = ", ".join(matches)
        return _result(
            "D2",
            "fail",
            f"Found unfilled placeholder marker(s): {markers}. Replace them with concrete context.",
        )
    return _result("D2", "pass", "No unfilled template placeholder markers found.")


def check_d3(context: EvaluationContext) -> CheckResult:
    if not context.shim_path.exists():
        return _result("D3", "skip", "AGENTS.md is absent; no shim is present to validate.")

    shim_text = context.shim_path.read_text(encoding="utf-8")
    line_count = len(shim_text.splitlines())
    if line_count > 15:
        return _result(
            "D3",
            "fail",
            f"AGENTS.md is {line_count} lines; keep the shim at 15 lines or fewer and point to CLAUDE.md.",
        )
    if PRIMARY_FILENAME not in shim_text:
        return _result(
            "D3",
            "fail",
            "AGENTS.md does not link to CLAUDE.md. Replace it with a thin shim pointing home.",
        )
    if context.primary_text and _duplicates_primary_context(shim_text, context.primary_text):
        return _result(
            "D3",
            "fail",
            "AGENTS.md duplicates canonical context. Keep unique content in CLAUDE.md only.",
        )
    return _result("D3", "pass", "AGENTS.md is a thin shim that points to CLAUDE.md.")


def check_d4(context: EvaluationContext) -> CheckResult:
    if context.is_inactive:
        return _result("D4", "skip", "Repository is inactive; primary-file budget is not enforced.")
    if context.primary_text is None:
        return _result("D4", "skip", "CLAUDE.md is missing; D1 reports the primary-file failure.")

    line_count = len(context.primary_text.splitlines())
    if line_count > 150:
        return _result(
            "D4",
            "fail",
            f"CLAUDE.md is {line_count} lines. Move retrieved-on-demand detail to docs/ and keep it at 150 lines or fewer.",
        )
    if line_count > 120:
        return _result(
            "D4",
            "warn",
            f"CLAUDE.md is {line_count} lines. It passes the 150-line cap but is above the 120-line warning threshold.",
        )
    return _result("D4", "pass", f"CLAUDE.md is {line_count} lines, within the 120-line target.")


def check_d5(context: EvaluationContext) -> CheckResult:
    if context.primary_text is None:
        return _result(
            "D5",
            "fail",
            "CLAUDE.md is missing, so the required Project Snapshot block cannot be parsed.",
        )
    if not context.snapshot.section_present:
        return _result(
            "D5",
            "fail",
            "Missing ## Project Snapshot block. Add the STRUCT schema block from the standard.",
        )
    if not context.snapshot.fields:
        return _result(
            "D5",
            "fail",
            "Project Snapshot contains no parseable '- **Key:** value' entries.",
        )

    missing = [
        key
        for key in REQUIRED_SNAPSHOT_KEYS
        if not context.snapshot.normalized_fields.get(key, "").strip()
    ]
    if missing:
        names = ", ".join(missing)
        return _result(
            "D5",
            "fail",
            f"Project Snapshot is missing required key(s): {names}. Add them using '- **Key:** value' entries.",
        )
    return _result("D5", "pass", "Project Snapshot parses with all required STRUCT keys.")


def check_d6(context: EvaluationContext) -> CheckResult:
    if context.is_inactive:
        return _result("D6", "skip", "Repository is inactive; Repository Map paths are not enforced.")
    if context.primary_text is None:
        return _result("D6", "skip", "CLAUDE.md is missing; no Repository Map can be checked.")

    map_lines = extract_section(context.primary_text, "Repository Map")
    if map_lines is None:
        return _result("D6", "skip", "No Repository Map block found; no mapped directories to validate.")

    candidates = extract_mapped_directories(map_lines)
    if not candidates:
        return _result("D6", "skip", "Repository Map names no directory paths for D6 to validate.")

    missing = []
    for candidate in candidates:
        if candidate.planned:
            continue
        path = _candidate_to_path(context.repo_path, candidate.path)
        if not path.is_dir():
            missing.append(candidate.path)

    if missing:
        quoted = ", ".join(f"'{path}'" for path in missing)
        return _result(
            "D6",
            "fail",
            f"Repository Map names {quoted}, which does not exist as a directory. Update the map or restore the path.",
        )
    return _result("D6", "pass", f"All {len(candidates)} mapped director{'y' if len(candidates) == 1 else 'ies'} resolve or are marked planned.")


def check_d7(context: EvaluationContext) -> CheckResult:
    if context.is_inactive:
        return _result("D7", "skip", "Repository is inactive; command resolution is not enforced.")
    if context.primary_text is None:
        return _result("D7", "skip", "CLAUDE.md is missing; no commands can be checked.")
    if not context.snapshot.normalized_fields:
        return _result("D7", "skip", "Project Snapshot did not parse; D5 reports the schema failure.")

    failures = []
    checked = 0
    for key in COMMAND_KEYS:
        command = context.snapshot.normalized_fields.get(key, "").strip()
        if not command:
            continue
        checked += 1
        if is_na(command):
            continue
        ok, reason = command_resolves(context.repo_path, command)
        if not ok:
            failures.append(f"{key} '{command}' ({reason})")

    if failures:
        return _result(
            "D7",
            "fail",
            "Command target does not resolve: "
            + "; ".join(failures)
            + ". Fix the command or add the missing tool target.",
        )
    if checked == 0:
        return _result("D7", "skip", "No build/test/lint/verify commands were present to validate.")
    return _result("D7", "pass", f"Validated {checked} command field(s); unrecognized plausible commands were not failed.")


def check_d8(context: EvaluationContext) -> CheckResult:
    if context.registry_entry is None:
        return _result(
            "D8",
            "fail",
            f"No repositories.yaml entry resolves to {context.repo_path}. Add or correct the registry entry.",
        )

    missing_files = [
        path
        for path in context.registry_entry.context_files
        if not (context.repo_path / path).exists()
    ]
    if missing_files:
        quoted = ", ".join(f"'{path}'" for path in missing_files)
        return _result(
            "D8",
            "fail",
            f"repositories.yaml lists context_files {quoted}, but they do not exist in the repo. Update the registry or restore the files.",
        )

    registry_team = context.registry_entry.linear_team
    snapshot_team = normalize_linear_team(context.snapshot.normalized_fields.get("Linear team", ""))
    if registry_team and snapshot_team and registry_team != snapshot_team:
        return _result(
            "D8",
            "fail",
            f"repositories.yaml linear_team '{registry_team}' does not match Project Snapshot Linear team '{snapshot_team}'. Update one source of truth.",
        )
    if registry_team is None and snapshot_team:
        return _result(
            "D8",
            "fail",
            f"Project Snapshot declares Linear team '{snapshot_team}', but repositories.yaml has no linear_team for this repo.",
        )

    return _result("D8", "pass", "Registry context_files exist and Linear team agrees when both sides are present.")


def check_d9(context: EvaluationContext) -> CheckResult:
    if context.registry_entry is None:
        return _result(
            "D9",
            "fail",
            f"No repositories.yaml entry resolves to {context.repo_path}. Add or correct the registry entry before checking canonical_path.",
        )

    canonical = normalize_path_value(context.snapshot.normalized_fields.get("Canonical path", ""))
    if not canonical:
        return _result(
            "D9",
            "skip",
            "Project Snapshot has no canonical path; D5 reports the missing STRUCT key.",
        )

    registry_path = str(Path(context.registry_entry.path).resolve())
    if str(Path(canonical).expanduser()) != registry_path:
        return _result(
            "D9",
            "fail",
            f"Project Snapshot Canonical path '{canonical}' does not equal registry path '{registry_path}'. Update the context file or registry.",
        )
    return _result("D9", "pass", f"Canonical path matches registry path '{registry_path}'.")


def parse_snapshot(markdown: str) -> Snapshot:
    section = extract_section(markdown, "Project Snapshot")
    section_present = section is not None
    fields = parse_key_value_bullets(section or [])

    legacy_fields = {}
    for section_name in ("Local Setup", "Local Setup / Verification", "Verification"):
        legacy_fields.update(parse_key_value_bullets(extract_section(markdown, section_name) or []))

    normalized: dict[str, str] = {}
    for key, value in fields.items():
        normalized[key] = value

    _fill_alias(normalized, "Stack", fields, legacy_fields, ("Primary stack",))
    _fill_alias(normalized, "Build command", fields, legacy_fields, ("Install/build command",))
    _fill_alias(normalized, "Test command", fields, legacy_fields, ("Test command",))
    _fill_alias(
        normalized,
        "Lint/Typecheck command",
        fields,
        legacy_fields,
        ("Lint/Typecheck command", "Lint command", "Lint/typecheck command", "Typecheck command"),
    )
    _fill_alias(normalized, "Verify command", fields, legacy_fields, ("Symphony validation command", "Validation command"))
    _fill_alias(normalized, "Canonical path", fields, legacy_fields, ("Canonical repo path",))
    _fill_linear_team_alias(normalized, fields)

    if "Status" not in normalized and _looks_like_legacy_snapshot(fields, legacy_fields):
        normalized["Status"] = "active"

    if "Canonical path" in normalized:
        normalized["Canonical path"] = normalize_path_value(normalized["Canonical path"])
    if "Linear team" in normalized:
        normalized["Linear team"] = normalize_linear_team(normalized["Linear team"])

    return Snapshot(
        fields=fields,
        normalized_fields=normalized,
        section_present=section_present,
    )


def extract_section(markdown: str, heading: str) -> list[str] | None:
    lines = markdown.splitlines()
    heading_re = re.compile(rf"^##\s+{re.escape(heading)}\s*$", re.IGNORECASE)
    start = None
    for index, line in enumerate(lines):
        if heading_re.match(line.strip()):
            start = index + 1
            break
    if start is None:
        return None

    end = len(lines)
    for index in range(start, len(lines)):
        if re.match(r"^##\s+\S+", lines[index].strip()):
            end = index
            break
    return lines[start:end]


def parse_key_value_bullets(lines: Sequence[str]) -> dict[str, str]:
    fields: dict[str, str] = {}
    pattern = re.compile(r"^\s*[-*]\s+\*\*(?P<key>[^*]+):\*\*\s*(?P<value>.*)\s*$")
    for line in lines:
        match = pattern.match(line)
        if match:
            fields[match.group("key").strip()] = match.group("value").strip()
    return fields


@dataclass(frozen=True)
class MappedDirectory:
    path: str
    planned: bool = False


def extract_mapped_directories(lines: Sequence[str]) -> tuple[MappedDirectory, ...]:
    candidates: dict[str, bool] = {}
    for line in lines:
        planned = "(planned)" in line.lower() or "[planned]" in line.lower()
        for raw in _path_tokens_from_map_line(line):
            candidate = _normalize_directory_candidate(raw)
            if candidate is None:
                continue
            candidates[candidate] = candidates.get(candidate, False) or planned
    return tuple(MappedDirectory(path, planned) for path, planned in sorted(candidates.items()))


def command_resolves(repo_path: Path, command: str) -> tuple[bool, str]:
    segments = _command_segments(command)
    if not segments:
        return False, "empty command"

    current_dir = repo_path
    for segment in segments:
        tokens = _shlex(segment)
        if not tokens:
            continue
        if tokens[0] == "cd":
            if len(tokens) < 2:
                return False, "cd command has no target"
            target = _candidate_to_path(current_dir, tokens[1])
            if not target.is_dir():
                return False, f"cd target '{tokens[1]}' is absent"
            current_dir = target
            continue
        ok, reason = _single_command_resolves(current_dir, tokens)
        if not ok:
            return ok, reason
    return True, "resolved"


def is_na(value: str) -> bool:
    return value.strip().lower() in {"n/a", "na", "none", "not applicable", "-"}


def normalize_linear_team(value: str) -> str:
    text = value.strip()
    if not text:
        return ""

    issue_prefix = re.search(r"issue prefix\s+`?([A-Z][A-Z0-9]+)-`?", text)
    if issue_prefix:
        return issue_prefix.group(1)

    backticked = re.findall(r"`([A-Z][A-Z0-9]{1,12})-?`", text)
    if backticked:
        return backticked[0]

    paren = re.search(r"\(([A-Z][A-Z0-9]{1,12})\)", text)
    if paren:
        return paren.group(1)

    token = re.search(r"\b([A-Z][A-Z0-9]{1,12})\b", text)
    return token.group(1) if token else text


def normalize_path_value(value: str) -> str:
    text = value.strip()
    if not text:
        return ""
    backticked = re.findall(r"`([^`]+)`", text)
    if backticked:
        path_tokens = [token for token in backticked if token.startswith(("/", "~", "."))]
        text = path_tokens[0] if path_tokens else backticked[0]
    return text.strip().rstrip(".")


def resolve_repo_path(repo_path: str | os.PathLike[str], registry: Registry) -> Path:
    raw = Path(repo_path)
    if raw.exists():
        return raw.resolve()
    entry = registry.find_by_name(str(repo_path))
    if entry:
        return Path(entry.path).resolve()
    return raw.resolve()


def load_registry(path: Path) -> Registry:
    if not path.exists():
        raise FileNotFoundError(f"registry not found: {path}")

    data = _load_yaml(path)
    entries = []
    for item in data.get("repositories", []):
        entries.append(
            RepoRegistryEntry(
                name=str(item.get("name", "")),
                path=str(item.get("path", "")),
                linear_team=item.get("linear_team"),
                context_files=tuple(item.get("context_files") or ()),
                aliases=tuple(item.get("aliases") or ()),
                remote=item.get("remote"),
                status=item.get("status"),
            )
        )
    return Registry(path=path, entries=tuple(entries))


def format_text(results: Sequence[CheckResult]) -> str:
    lines = [
        f"{result.check_id} {result.status.upper():4} {result.message}"
        for result in results
    ]
    counts = _status_counts(results)
    lines.append(
        "Summary: "
        + ", ".join(f"{status}={counts[status]}" for status in ("pass", "warn", "fail", "skip"))
    )
    return "\n".join(lines)


def format_json(results: Sequence[CheckResult], repo_path: Path, registry_path: Path) -> str:
    payload = {
        "repo_path": str(repo_path),
        "registry_path": str(registry_path),
        "results": [result.to_dict() for result in results],
        "summary": _status_counts(results),
    }
    return json.dumps(payload, indent=2, sort_keys=True)


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run deterministic agent-context checks D1-D9.")
    parser.add_argument("repo_path", help="Repository path, registered repo name, or alias to evaluate.")
    parser.add_argument(
        "--registry",
        default=str(_default_registry_path()),
        help="Path to context/repositories.yaml. Defaults to this repo's registry.",
    )
    parser.add_argument(
        "--format",
        choices=("text", "json"),
        default="text",
        help="Output format. JSON is stable for CI and skill consumers.",
    )
    args = parser.parse_args(argv)

    registry_path = Path(args.registry)
    try:
        registry = load_registry(registry_path)
        repo_path = resolve_repo_path(args.repo_path, registry)
        results = evaluate_repo(repo_path, registry_path=registry_path)
    except Exception as error:  # pragma: no cover - argparse-level safety net
        print(f"context_audit: {error}", file=sys.stderr)
        return 2

    if args.format == "json":
        print(format_json(results, repo_path, registry_path))
    else:
        print(format_text(results))
    return 1 if any(result.status == "fail" for result in results) else 0


def _result(check_id: str, status: str, message: str) -> CheckResult:
    return CheckResult(check_id=check_id, status=status, message=f"{check_id}: {message}")


def _default_registry_path() -> Path:
    return Path(__file__).resolve().parents[2] / "context" / "repositories.yaml"


def _load_yaml(path: Path) -> dict[str, Any]:
    try:
        import yaml  # type: ignore[import-not-found]

        with path.open(encoding="utf-8") as handle:
            return yaml.safe_load(handle) or {}
    except ModuleNotFoundError:
        return _load_simple_yaml(path)


def _load_simple_yaml(path: Path) -> dict[str, Any]:
    data: dict[str, Any] = {}
    repositories: list[dict[str, Any]] = []
    data["repositories"] = repositories
    current: dict[str, Any] | None = None
    current_list_key: str | None = None
    in_repositories = False

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.split("#", 1)[0].rstrip()
        if not line.strip():
            continue
        indent = len(raw_line) - len(raw_line.lstrip(" "))
        stripped = line.strip()

        if indent == 0 and stripped == "repositories:":
            in_repositories = True
            continue
        if not in_repositories:
            if indent == 0 and ":" in stripped:
                key, value = stripped.split(":", 1)
                data[key] = _parse_yaml_scalar(value.strip())
            continue

        if indent == 2 and stripped.startswith("- "):
            current = {}
            repositories.append(current)
            current_list_key = None
            rest = stripped[2:].strip()
            if rest:
                key, value = rest.split(":", 1)
                current[key.strip()] = _parse_yaml_scalar(value.strip())
            continue

        if current is None:
            continue
        if indent == 4 and stripped.endswith(":"):
            current_list_key = stripped[:-1].strip()
            current[current_list_key] = []
            continue
        if indent == 4 and ":" in stripped:
            key, value = stripped.split(":", 1)
            current[key.strip()] = _parse_yaml_scalar(value.strip())
            current_list_key = None
            continue
        if indent == 6 and stripped.startswith("- ") and current_list_key:
            current[current_list_key].append(_parse_yaml_scalar(stripped[2:].strip()))

    return data


def _parse_yaml_scalar(value: str) -> Any:
    if value == "[]":
        return []
    if value in {"null", "Null", "NULL", "~"}:
        return None
    if (value.startswith('"') and value.endswith('"')) or (
        value.startswith("'") and value.endswith("'")
    ):
        return value[1:-1]
    return value


def _same_or_parent(parent: Path, child: Path) -> bool:
    parent = parent.resolve()
    return child == parent or parent in child.parents


def _git_origin_url(repo_path: Path) -> str | None:
    try:
        completed = subprocess.run(
            ["git", "-C", str(repo_path), "remote", "get-url", "origin"],
            check=False,
            capture_output=True,
            text=True,
            timeout=5,
        )
        if completed.returncode == 0 and completed.stdout.strip():
            return completed.stdout.strip()
    except (OSError, subprocess.TimeoutExpired):
        pass
    # Fallback: GITHUB_REPOSITORY is set in all GitHub Actions environments.
    # Use it when git fails (e.g. safe.directory mismatch on self-hosted runners).
    github_repo = os.environ.get("GITHUB_REPOSITORY")
    if github_repo:
        return f"https://github.com/{github_repo}"
    return None


def _normalize_remote(remote: str) -> str:
    normalized = remote.strip()
    normalized = re.sub(r"^git@github\.com:", "https://github.com/", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"^ssh://git@github\.com/", "https://github.com/", normalized, flags=re.IGNORECASE)
    normalized = re.sub(
        r"^https?://(?:[^/@]+@)?github\.com/",
        "https://github.com/",
        normalized,
        flags=re.IGNORECASE,
    )
    normalized = normalized.removesuffix(".git").rstrip("/")
    return normalized.lower()


def _duplicates_primary_context(shim_text: str, primary_text: str) -> bool:
    shim_normalized = "\n".join(line.strip() for line in shim_text.splitlines() if line.strip())
    primary_normalized = "\n".join(line.strip() for line in primary_text.splitlines() if line.strip())
    if shim_normalized == primary_normalized:
        return True

    shim_lines = [line.strip() for line in shim_text.splitlines() if line.strip()]
    primary_lines = {line.strip() for line in primary_text.splitlines() if line.strip()}
    if len(shim_lines) < 6:
        return False
    overlap = sum(1 for line in shim_lines if line in primary_lines)
    return overlap / len(shim_lines) >= 0.65


def _fill_alias(
    normalized: dict[str, str],
    target: str,
    fields: Mapping[str, str],
    legacy_fields: Mapping[str, str],
    aliases: Sequence[str],
) -> None:
    if normalized.get(target):
        return
    for alias in aliases:
        if fields.get(alias):
            normalized[target] = fields[alias]
            return
        if legacy_fields.get(alias):
            normalized[target] = legacy_fields[alias]
            return


def _fill_linear_team_alias(normalized: dict[str, str], fields: Mapping[str, str]) -> None:
    if normalized.get("Linear team"):
        return
    for alias in ("Tracker/project", "Tracker", "Project"):
        if fields.get(alias):
            normalized["Linear team"] = fields[alias]
            return


def _looks_like_legacy_snapshot(
    fields: Mapping[str, str],
    legacy_fields: Mapping[str, str],
) -> bool:
    return bool(
        fields.get("Canonical repo path")
        or fields.get("Tracker/project")
        or legacy_fields.get("Primary stack")
        or legacy_fields.get("Install/build command")
    )


def _path_tokens_from_map_line(line: str) -> Iterable[str]:
    for token in re.findall(r"`([^`]+)`", line):
        yield token

    link_targets = re.findall(r"\[[^\]]+\]\(([^)]+)\)", line)
    for token in link_targets:
        yield token

    bullet = re.match(r"^\s*[-*]\s+([^:\s]+)", line)
    if bullet:
        yield bullet.group(1)


_FILE_SUFFIXES = (
    ".md", ".markdown", ".txt", ".json", ".yml", ".yaml", ".toml", ".swift",
    ".py", ".js", ".mjs", ".ts", ".tsx", ".sh", ".lock", ".cfg", ".ini",
    ".xml", ".html", ".css", ".rb", ".go", ".rs",
)


def _normalize_directory_candidate(raw: str) -> str | None:
    # Strip code/quote wrappers and trailing prose punctuation, but never leading
    # dots (a leading dot is significant: `.github/` is a real directory).
    token = raw.strip().strip("`").strip("'\"").strip()
    token = token.rstrip(",.;:")
    if not token or token in {".", ".."}:
        return None
    if " " in token or "://" in token:
        return None
    if token.startswith(("#", "$", "~", "-")):
        return None
    if any(char in token for char in "<>*?|"):  # template placeholders / globs
        return None
    if _looks_like_file(token):
        return None
    # A bare single token (no path separator, no trailing slash) is too ambiguous
    # to treat as a directory — prose words and binary names (e.g. `symphonyd`)
    # would false-fail. Require a clear path shape and favor false-negatives.
    has_separator = "/" in token.rstrip("/")
    if not (has_separator or token.endswith("/")):
        return None
    normalized = token.removeprefix("./").rstrip("/")
    return normalized or None


def _looks_like_file(token: str) -> bool:
    return token.rstrip("/").endswith(_FILE_SUFFIXES)


def _candidate_to_path(base: Path, candidate: str) -> Path:
    path = Path(candidate)
    if path.is_absolute():
        return path
    return base / path


def _command_segments(command: str) -> list[str]:
    return [
        segment.strip()
        for segment in re.split(r"\s*(?:&&|;)\s*", command)
        if segment.strip()
    ]


def _shlex(segment: str) -> list[str]:
    try:
        tokens = shlex.split(segment)
    except ValueError:
        return []
    while tokens and _looks_like_env_assignment(tokens[0]):
        tokens = tokens[1:]
    return tokens


def _looks_like_env_assignment(token: str) -> bool:
    return bool(re.match(r"^[A-Za-z_][A-Za-z0-9_]*=", token))


def _single_command_resolves(cwd: Path, tokens: Sequence[str]) -> tuple[bool, str]:
    executable = Path(tokens[0]).name
    if tokens[0].startswith(("./", "../", "/")):
        target = _candidate_to_path(cwd, tokens[0])
        return (True, "local executable exists") if target.exists() else (False, f"'{tokens[0]}' is absent")

    if executable in {"make", "gmake"}:
        return _make_command_resolves(cwd, tokens)
    if executable in {"npm", "pnpm", "yarn", "bun"}:
        return _js_command_resolves(cwd, executable, tokens)
    if executable == "swift":
        return _marker_resolves(cwd, "Package.swift", "Package.swift is absent")
    if executable in {"python", "python3"}:
        markers = ("pyproject.toml", "pytest.ini", "setup.cfg", "requirements.txt", "requirements-dev.txt")
        if any((cwd / marker).exists() for marker in markers) or (cwd / "tests").is_dir():
            return True, "Python project marker exists"
        return False, "Python project marker is absent"
    if executable == "bundle":
        return _marker_resolves(cwd, "Gemfile", "Gemfile is absent")
    if executable == "xcodebuild":
        if list(cwd.glob("*.xcodeproj")) or list(cwd.glob("*.xcworkspace")):
            return True, "Xcode project exists"
        return False, "Xcode project/workspace is absent"
    if executable == "cargo":
        return _marker_resolves(cwd, "Cargo.toml", "Cargo.toml is absent")
    if executable == "go":
        return _marker_resolves(cwd, "go.mod", "go.mod is absent")

    return True, "unrecognized command treated as plausible"


def _marker_resolves(cwd: Path, marker: str, failure: str) -> tuple[bool, str]:
    return (True, f"{marker} exists") if (cwd / marker).exists() else (False, failure)


def _make_command_resolves(cwd: Path, tokens: Sequence[str]) -> tuple[bool, str]:
    makefile = next((cwd / name for name in ("Makefile", "makefile", "GNUmakefile") if (cwd / name).exists()), None)
    if makefile is None:
        return False, "Makefile is absent"
    targets = _make_targets(makefile)
    requested = next((token for token in tokens[1:] if not token.startswith("-") and "=" not in token), None)
    if requested is None:
        return True, "Makefile exists"
    if requested in targets:
        return True, f"make target '{requested}' exists"
    return False, f"make target '{requested}' is absent"


def _make_targets(makefile: Path) -> set[str]:
    targets: set[str] = set()
    for line in makefile.read_text(encoding="utf-8", errors="ignore").splitlines():
        match = re.match(r"^([A-Za-z0-9_.-]+)\s*:(?![=])", line)
        if match:
            targets.add(match.group(1))
    return targets


def _js_command_resolves(cwd: Path, executable: str, tokens: Sequence[str]) -> tuple[bool, str]:
    package_json = cwd / "package.json"
    if not package_json.exists():
        return False, "package.json is absent"

    try:
        scripts = json.loads(package_json.read_text(encoding="utf-8")).get("scripts", {})
    except json.JSONDecodeError:
        return False, "package.json is not valid JSON"

    script = _js_script_name(executable, tokens)
    if script is None:
        return True, "package.json exists"
    if script in scripts:
        return True, f"npm script '{script}' exists"
    return False, f"npm script '{script}' is absent"


def _js_script_name(executable: str, tokens: Sequence[str]) -> str | None:
    if executable in {"npm", "pnpm", "bun"}:
        if len(tokens) >= 3 and tokens[1] == "run":
            return tokens[2]
        if len(tokens) >= 2 and tokens[1] in {"test", "start", "build", "lint"}:
            return tokens[1]
    if executable == "yarn":
        if len(tokens) >= 3 and tokens[1] == "run":
            return tokens[2]
        if len(tokens) >= 2 and tokens[1] not in {"install", "add", "remove"}:
            return tokens[1]
    return None


def _status_counts(results: Sequence[CheckResult]) -> dict[str, int]:
    return {status: sum(1 for result in results if result.status == status) for status in ("pass", "warn", "fail", "skip")}
