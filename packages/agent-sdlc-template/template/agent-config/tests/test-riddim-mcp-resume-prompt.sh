#!/usr/bin/env bash
set -euo pipefail

MCP_REPO="${RIDDIM_MCP_REPO:-/YOUR/WORKSPACE/DIR/mcp}"
MCPD="${RIDDIM_MCPD:-}"

if [[ -z "$MCPD" ]]; then
  if command -v mcpd >/dev/null 2>&1; then
    MCPD="$(command -v mcpd)"
  elif [[ -f "$MCP_REPO/dist/cli/mcpd.js" ]]; then
    MCPD="$MCP_REPO/dist/cli/mcpd.js"
  else
    echo "Skipping riddim-mcp smoke: mcpd not found. Build/link YourGithubOrg/mcp or set RIDDIM_MCPD." >&2
    exit 0
  fi
fi

SDK_ROOT="$MCP_REPO/node_modules/@modelcontextprotocol/sdk/dist/esm"
if [[ ! -d "$SDK_ROOT" ]]; then
  echo "Skipping riddim-mcp smoke: MCP SDK node_modules missing at $SDK_ROOT." >&2
  exit 0
fi

node --input-type=module - "$SDK_ROOT" "$MCPD" <<'JS'
const sdkRoot = process.argv[2];
const mcpd = process.argv[3];
const { Client } = await import(`file://${sdkRoot}/client/index.js`);
const { StdioClientTransport } = await import(`file://${sdkRoot}/client/stdio.js`);
const command = mcpd.endsWith('.js') ? process.execPath : mcpd;
const args = mcpd.endsWith('.js') ? [mcpd, 'stdio'] : ['stdio'];

const transport = new StdioClientTransport({
  command,
  args,
  env: {
    ...process.env,
    RIDDIM_MCP_LOG_DIR: process.env.RIDDIM_MCP_LOG_DIR || `${process.env.HOME}/Library/Logs/riddim-mcp`,
    RIDDIM_MCP_STATE_DIR: process.env.RIDDIM_MCP_STATE_DIR || `${process.env.HOME}/.riddim-mcp`,
  },
});

const client = new Client({ name: 'agent-config-smoke', version: '1.0.0' });
await client.connect(transport);
try {
  const result = await client.getPrompt({ name: 'resume_in_flight_work' });
  const text = (result.messages || [])
    .map((message) => message.content?.type === 'text' ? message.content.text : '')
    .join('\n');
  for (const key of ['active_sessions', 'recent_events', 'active_leases']) {
    if (!text.includes(key)) {
      throw new Error(`resume_in_flight_work prompt missing ${key}`);
    }
  }
  console.log('riddim-mcp resume_in_flight_work smoke passed');
} finally {
  await client.close();
}
JS
