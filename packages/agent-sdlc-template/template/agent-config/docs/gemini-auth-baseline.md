# Gemini CLI Auth Baseline Memo

**Issue:** AGENT-23  
**Date:** 2026-05-16  
**Scope:** macOS, single-machine, personal OAuth path  
**Status:** Discovery complete — baseline captured for implementation handoff

---

## 1. Current `~/.gemini` file inventory

Observed on the primary developer machine (macOS, Gemini CLI 0.42.0):

| File | Perms | Purpose |
|------|-------|---------|
| `oauth_creds.json` | `600` | Active OAuth token (`access_token`, `refresh_token`, `id_token`, `scope`, `expiry_date`, `token_type`) |
| `google_accounts.json` | `644` | Account roster — `active` field (current email) + `old` array (previously authenticated emails) |
| `settings.json` | `644` | Auth method selection; `security.auth.selectedType = "oauth-personal"` |
| `state.json` | `644` | UI state (tips count, banner counts, screen-reader nudge, startup warnings) |
| `mcp-oauth-tokens.json` | `600` | Per-MCP-server OAuth tokens (separate from Gemini auth) |
| `trustedFolders.json` | `600` | Per-directory tool trust grants |
| `projects.json` | `644` | Session metadata index per project root hash |
| `.env` | `644` | `GOOGLE_CLOUD_PROJECT="riddim-495600"` (Cloud project binding) |
| `installation_id` | `644` | Persistent anonymous install ID |
| `antigravity/` | dir | Project-specific memory state (brain, context_state, knowledge, mcp_config.json, …) |
| `history/` | dir | Per-session conversation history |
| `tmp/` | dir | Ephemeral per-project working files |
| `skills/` | dir | Installed Gemini skills |

**No `api_key.json` observed.** Auth path is pure OAuth, not API key.

---

## 2. Auth path in current developer environment

The CLI uses **personal OAuth** (`oauth-personal`). On first run the CLI opens a
browser OAuth flow, writes tokens to `oauth_creds.json`, and registers the
account in `google_accounts.json`. Subsequent runs refresh silently via the
stored `refresh_token`.

Source confirmation (bundle `chunk-ECNYAST2.js`):

```
function homedir() {
  const envHome = process.env["GEMINI_CLI_HOME"];
  if (envHome) { return envHome; }
  return os.homedir();
}
```

All credential file paths are resolved as `path.join(homedir(), ".gemini", …)`.
There is no secondary lookup mechanism — the single `homedir()` call is the
complete path-resolution chain.

---

## 3. `GEMINI_CLI_HOME` isolation: confirmed sufficient

`GEMINI_CLI_HOME` overrides `homedir()` globally across every file-path
resolution in the CLI. Setting it redirects **all** of the following to
`$GEMINI_CLI_HOME/.gemini/`:

- `oauth_creds.json` / `google_accounts.json` (identity)
- `settings.json` (auth type, model prefs)
- `trustedFolders.json` (tool trust)
- `mcp-oauth-tokens.json` (MCP tokens)
- `history/` / `tmp/` / `projects.json` (sessions)
- `antigravity/` / `skills/` (memory, skills)

**Single-profile validation (current state):** `GEMINI_CLI_HOME` is not set;
the CLI resolves to `~/.gemini`. Works correctly for a single developer with one
Google account.

**Multi-profile validation (simulated):** Setting
`GEMINI_CLI_HOME=/path/to/profile-N` redirects the entire `.gemini` subtree to
`/path/to/profile-N/.gemini`. Each profile directory would hold an
independently authenticated `oauth_creds.json` and `google_accounts.json`.
Session history, trusted folders, and MCP tokens are also isolated per profile
— no cross-contamination.

**Constraint:** `GEMINI_CLI_HOME` must be set **before** the `gemini` process
starts. Spawning two concurrent `gemini` sessions with different values of
`GEMINI_CLI_HOME` in the same shell session requires two separate shell
environments (e.g., separate terminal windows with the variable exported, or
wrapper scripts).

---

## 4. License growth constraints

| Constraint | Detail |
|---|---|
| Current seat count | 2 (confirmed by `google_accounts.json` — one active + one historical) |
| Target seat count | 8+ |
| Per-seat isolation mechanism | One `GEMINI_CLI_HOME` root per seat (e.g., `~/.gemini-profiles/seat-N/`) |
| Onboarding a new seat | Create profile dir + run `gemini` once with that `GEMINI_CLI_HOME` to trigger browser OAuth for that Google account |
| Offboarding a seat | Remove the profile directory; no system-wide state is touched |
| Concurrent use | Independent shell environments with distinct `GEMINI_CLI_HOME` values; no conflict |
| Shared machine vs. shared account | Each licensed Google account must complete its own OAuth flow; accounts cannot share a token directory without sharing OAuth state |
| `google_accounts.json` `old` field | Accumulates previously authenticated emails; does not affect current auth but can be pruned on rotation |
| No hidden flags observed | No undocumented `--profile` or `--account` flags in CLI 0.42.0; `GEMINI_CLI_HOME` is the only supported isolation mechanism |

---

## 5. Decision memo: recommended implementation approach

**Recommended approach: per-seat profile directories activated via `GEMINI_CLI_HOME`.**

Rationale:

1. **Zero breaking change for current single-account use.** When `GEMINI_CLI_HOME`
   is not set, the CLI behaves identically to today. The default profile at
   `~/.gemini` is untouched.

2. **Complete isolation.** Every credential, session, trust grant, and MCP token
   lives under one directory root. Profiles cannot bleed into each other.

3. **Supported by stable CLI behaviour.** `GEMINI_CLI_HOME` is a first-class env
   var in CLI 0.42.0 source — not a hidden flag.

4. **Scriptable onboarding/offboarding.** A seat is created by `mkdir` and
   removed by `rm -rf`. OAuth is triggered automatically on first launch.

5. **No secrets in repo.** Profile directories live on local machines. The
   implementation issue needs only to write a shell wrapper/alias; no credential
   material enters git.

**Proposed naming convention for next issue:**

```
~/.gemini-profiles/
  seat-1/   ← GEMINI_CLI_HOME for seat 1 (currently active account)
  seat-2/   ← GEMINI_CLI_HOME for seat 2
  …
  seat-N/
```

A shell helper (e.g., `gemini-seat N`) exports `GEMINI_CLI_HOME` and execs
`gemini`. The existing `~/.gemini` default profile may be migrated to `seat-1`
or left as-is for the current developer.

---

## 6. Out-of-scope (confirmed not blocking)

- Enterprise SSO / Google Workspace domain enforcement — not needed at current scale.
- API-key auth path — not in use; OAuth-personal is the active path.
- Multi-machine synchronisation of profile directories — out of scope for this baseline.
