#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd -P "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

HOME_DIR="$TMP_DIR/home"
mkdir -p "$HOME_DIR/.claude" "$HOME_DIR/.codex" "$HOME_DIR/.gemini"

cat > "$HOME_DIR/.claude/.mcp.json" <<'JSON'
{
  "mcpServers": {
    "existing": {
      "command": "example"
    }
  }
}
JSON

cat > "$HOME_DIR/.codex/config.toml" <<'TOML'
[mcp_servers.existing]
command = "example"
TOML

cat > "$HOME_DIR/.gemini/settings.json" <<'JSON'
{
  "security": {
    "auth": {
      "selectedType": "oauth-personal"
    }
  },
  "mcpServers": {
    "existing": {
      "command": "example"
    }
  }
}
JSON

HOME="$HOME_DIR" "$ROOT/bin/install-mcp-clients" >/dev/null
HOME="$HOME_DIR" "$ROOT/bin/install-mcp-clients" >/dev/null

python3 - "$HOME_DIR" <<'PY'
import json
import sys
from pathlib import Path

home = Path(sys.argv[1])
for path in [home / ".claude/.mcp.json", home / ".gemini/settings.json"]:
    data = json.loads(path.read_text())
    servers = data["mcpServers"]
    assert "existing" in servers, path
    assert servers["riddim-mcp"]["command"] == "mcpd", path
    assert servers["riddim-mcp"]["args"] == ["stdio"], path

gemini = json.loads((home / ".gemini/settings.json").read_text())
assert gemini["security"]["auth"]["selectedType"] == "oauth-personal"

codex = (home / ".codex/config.toml").read_text()
assert '[mcp_servers.existing]' in codex
assert codex.count('[mcp_servers.riddim-mcp]') == 1
assert 'command = "mcpd"' in codex

overlay = home / ".codex/config.toml.d/riddim-mcp.toml"
assert overlay.is_symlink()
PY

EMPTY_HOME="$TMP_DIR/empty-home"
mkdir -p "$EMPTY_HOME"
HOME="$EMPTY_HOME" "$ROOT/bin/install-mcp-clients" >/dev/null

[[ -L "$EMPTY_HOME/.claude/.mcp.json" ]] || { echo "expected Claude symlink" >&2; exit 1; }
[[ -L "$EMPTY_HOME/.codex/config.toml.d/riddim-mcp.toml" ]] || { echo "expected Codex overlay symlink" >&2; exit 1; }
[[ -L "$EMPTY_HOME/.gemini/settings.json" ]] || { echo "expected Gemini settings symlink" >&2; exit 1; }

echo "install-mcp-clients tests passed"
