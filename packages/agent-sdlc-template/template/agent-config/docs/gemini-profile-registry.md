# Gemini Profile Registry Contract

This contract defines the local profile registry used by Gemini Code Assist
wrappers when more than one licensed seat is available. It supports today's
two-seat setup and can grow to any number of accounts without changing wrapper
logic.

The machine-readable schema lives at
[`schemas/gemini-profile-registry.schema.json`](../schemas/gemini-profile-registry.schema.json).
Registry files should be JSON and should validate against that schema.

## Contract

The registry has four top-level fields:

- `version`: contract version. The current value is `1`.
- `profileRootEnv`: always `GEMINI_PROFILE_ROOT`.
- `profileRootDefault`: always
  `${XDG_STATE_HOME:-$HOME/.local/state}/gemini/profiles`.
- `profiles`: object map from stable profile key to profile definition.

Each `profiles` entry requires:

- `key`: stable alias for the profile. It must match the enclosing map key and
  must not encode the licensed email address.
- `displayName`: human-readable label for logs, prompts, and diagnostics.
- `emailHint`: non-secret hint for the licensed account, such as a domain,
  seat label, or masked address.
- `licenseActive`: `true` only when the corresponding Gemini Code Assist seat is
  currently licensed and usable.
- `status`: one of `active`, `idle`, or `revoked`.
- `rotationOrder`: positive integer ordering hint. Wrappers sort eligible
  profiles by `rotationOrder`, then by `key`.
- `localProfileDirectory`: directory name or relative path under
  `GEMINI_PROFILE_ROOT`.
- `notes`: non-secret operational notes.

Optional field:

- `maxSessionsPerDay`: positive integer soft cap for local wrapper rotation.

Wrappers should treat a profile as eligible only when `licenseActive` is `true`
and `status` is `active`. `idle` keeps a profile configured but out of normal
rotation. `revoked` means the profile must not be selected.

## Secure Defaults

The only parent directory environment variable is `GEMINI_PROFILE_ROOT`. When it
is unset, wrappers should use:

```text
${XDG_STATE_HOME:-$HOME/.local/state}/gemini/profiles
```

This keeps local auth state outside the repository by default. Registry files may
name profile directories, aliases, and account hints, but must not contain
tokens, cookies, refresh tokens, full credential files, or other secrets.

`localProfileDirectory` is intentionally relative. Wrappers resolve it under
`GEMINI_PROFILE_ROOT`, which keeps path policy centralized and avoids checking
machine-specific absolute paths into the repo.

If no registry file exists, wrappers should preserve the current single-profile
behavior and use Gemini's normal default profile location. To opt a single user
into the registry without changing wrapper behavior, define one `default`
profile with `rotationOrder: 1`.

## Scalable rotation and handoff checklist

Before scaling a seat rollout beyond two active profiles, complete these manual
human-gated checks in the issue tracker:

1. Confirm license expansion and mapping
   - Verify all intended Gmail identities are provisioned as active Gemini
     licenses in Google Admin / Workspace billing before opening profile registry
     entries.
   - Keep profile keys stable (`seat-01`, `seat-02`, ...), and set
     `licenseActive: true`, `status: "active"` only for seats currently licensed.
2. Confirm local credential layout policy
   - Keep all profile state under `GEMINI_PROFILE_ROOT`, not under the
     repository and not committed to source control.
   - Use non-sensitive directory names in the registry (for example,
     `seat-01`) and store only local paths and aliases.
   - Confirm every profile path remains under
     `${XDG_STATE_HOME:-$HOME/.local/state}/gemini/profiles` unless an approved
     host policy explicitly changes it.
3. Fresh-machine cutover validation (minimum two profiles)
   - On a clean dev machine, run registration for each profile and verify
     interactive OAuth only happens during first-auth for that profile.
   - Confirm switching between two licensed profiles with `run-gemini --profile ...`
     does not show cross-profile token contamination.
4. Runtime safety checks
   - Verify non-profile launches still preserve default `~/.gemini` behavior.
   - Verify unknown profile keys fail fast and do not fall back to default profile
     behavior.
   - Verify profile migration (`--migrate-from`) creates directories under the
     configured `GEMINI_PROFILE_ROOT` and does not target repository paths.
5. Transition handoff
   - Leave this checklist documented in the Human Handoff issue and pass
     it to the next engineer before they perform profile registry expansion.

## Two-Account Example

```json
{
  "version": 1,
  "profileRootEnv": "GEMINI_PROFILE_ROOT",
  "profileRootDefault": "${XDG_STATE_HOME:-$HOME/.local/state}/gemini/profiles",
  "profiles": {
    "primary": {
      "key": "primary",
      "displayName": "Primary Gemini seat",
      "emailHint": "seat-1@example.com",
      "licenseActive": true,
      "status": "active",
      "maxSessionsPerDay": 12,
      "rotationOrder": 1,
      "localProfileDirectory": "primary",
      "notes": "Default interactive profile."
    },
    "secondary": {
      "key": "secondary",
      "displayName": "Secondary Gemini seat",
      "emailHint": "seat-2@example.com",
      "licenseActive": true,
      "status": "active",
      "maxSessionsPerDay": 12,
      "rotationOrder": 2,
      "localProfileDirectory": "secondary",
      "notes": "Second licensed profile for parallel sessions."
    }
  }
}
```

## Ten-Account Example

Add seats by adding profile entries only; wrapper code should not change for
profiles 3..N.

```json
{
  "version": 1,
  "profileRootEnv": "GEMINI_PROFILE_ROOT",
  "profileRootDefault": "${XDG_STATE_HOME:-$HOME/.local/state}/gemini/profiles",
  "profiles": {
    "seat-01": {
      "key": "seat-01",
      "displayName": "Gemini seat 01",
      "emailHint": "seat-01@example.com",
      "licenseActive": true,
      "status": "active",
      "maxSessionsPerDay": 10,
      "rotationOrder": 1,
      "localProfileDirectory": "seat-01",
      "notes": "Licensed seat."
    },
    "seat-02": {
      "key": "seat-02",
      "displayName": "Gemini seat 02",
      "emailHint": "seat-02@example.com",
      "licenseActive": true,
      "status": "active",
      "maxSessionsPerDay": 10,
      "rotationOrder": 2,
      "localProfileDirectory": "seat-02",
      "notes": "Licensed seat."
    },
    "seat-03": {
      "key": "seat-03",
      "displayName": "Gemini seat 03",
      "emailHint": "seat-03@example.com",
      "licenseActive": true,
      "status": "active",
      "maxSessionsPerDay": 10,
      "rotationOrder": 3,
      "localProfileDirectory": "seat-03",
      "notes": "Licensed seat."
    },
    "seat-04": {
      "key": "seat-04",
      "displayName": "Gemini seat 04",
      "emailHint": "seat-04@example.com",
      "licenseActive": true,
      "status": "active",
      "maxSessionsPerDay": 10,
      "rotationOrder": 4,
      "localProfileDirectory": "seat-04",
      "notes": "Licensed seat."
    },
    "seat-05": {
      "key": "seat-05",
      "displayName": "Gemini seat 05",
      "emailHint": "seat-05@example.com",
      "licenseActive": true,
      "status": "active",
      "maxSessionsPerDay": 10,
      "rotationOrder": 5,
      "localProfileDirectory": "seat-05",
      "notes": "Licensed seat."
    },
    "seat-06": {
      "key": "seat-06",
      "displayName": "Gemini seat 06",
      "emailHint": "seat-06@example.com",
      "licenseActive": true,
      "status": "active",
      "maxSessionsPerDay": 10,
      "rotationOrder": 6,
      "localProfileDirectory": "seat-06",
      "notes": "Licensed seat."
    },
    "seat-07": {
      "key": "seat-07",
      "displayName": "Gemini seat 07",
      "emailHint": "seat-07@example.com",
      "licenseActive": true,
      "status": "active",
      "maxSessionsPerDay": 10,
      "rotationOrder": 7,
      "localProfileDirectory": "seat-07",
      "notes": "Licensed seat."
    },
    "seat-08": {
      "key": "seat-08",
      "displayName": "Gemini seat 08",
      "emailHint": "seat-08@example.com",
      "licenseActive": true,
      "status": "active",
      "maxSessionsPerDay": 10,
      "rotationOrder": 8,
      "localProfileDirectory": "seat-08",
      "notes": "Licensed seat."
    },
    "seat-09": {
      "key": "seat-09",
      "displayName": "Gemini seat 09",
      "emailHint": "seat-09@example.com",
      "licenseActive": true,
      "status": "idle",
      "maxSessionsPerDay": 10,
      "rotationOrder": 9,
      "localProfileDirectory": "seat-09",
      "notes": "Provisioned locally; keep idle until license is assigned."
    },
    "seat-10": {
      "key": "seat-10",
      "displayName": "Gemini seat 10",
      "emailHint": "seat-10@example.com",
      "licenseActive": false,
      "status": "idle",
      "rotationOrder": 10,
      "localProfileDirectory": "seat-10",
      "notes": "Reserved alias for planned growth."
    }
  }
}
```

To add profile 3..N, choose the next stable `key`, create a matching
`localProfileDirectory` under `GEMINI_PROFILE_ROOT`, set `rotationOrder`, and
mark the profile `licenseActive: true` with `status: "active"` only after the
seat is actually licensed.

## Local migration and validation

Use `bin/run-gemini` to launch Gemini with an isolated profile home. The helper
sets `GEMINI_CLI_HOME` to the selected profile directory and preserves default
Gemini behavior when no profile is selected.

Before using an existing `~/.gemini` session as a named profile, run a dry-run:

```bash
GEMINI_PROFILE_ROOT="$HOME/.local/state/gemini/profiles" \
  bin/run-gemini --profile primary --migrate-from "$HOME/.gemini" --dry-run
```

If the plan is correct, migrate it explicitly:

```bash
GEMINI_PROFILE_ROOT="$HOME/.local/state/gemini/profiles" \
  bin/run-gemini --profile primary --migrate-from "$HOME/.gemini"
```

The migration refuses to overwrite existing profile state unless `--force` is
supplied, and it refuses to place credential state under this repository. The
helper reports only paths and required file names; it does not print token file
contents.

Use `--check` to require the profile's `oauth_creds.json`,
`google_accounts.json`, and `settings.json` before launching Gemini:

```bash
bin/run-gemini --profile primary --check
```

## Quota-aware fallback

`bin/run-gemini` can retry a Gemini invocation with another active profile when
the first profile exits with a quota or profile-specific auth failure. Enable it
per invocation:

```bash
bin/run-gemini --profile primary --auto-rotate -p "hello"
```

Fallback only considers registry entries where `licenseActive` is `true` and
`status` is `active`. The selected profile is tried first. Additional profiles
are ordered by `rotationOrder`, then by key, and are capped by
`--max-fallback-attempts` (default: `GEMINI_MAX_FALLBACK_ATTEMPTS` or `2`).

The retry detector is intentionally conservative. It falls back on Gemini output
that contains quota or limit signatures such as `429`, `RATE_LIMIT`,
`RESOURCE_EXHAUSTED`, `QUOTA_EXCEEDED`, `rateLimitExceeded`, or
`too many requests`; it also treats profile-local auth failures such as `401`,
`403`, `UNAUTHENTICATED`, `PERMISSION_DENIED`, `invalid_grant`, expired
credentials, or re-auth prompts as retryable. Non-matching failures stop on the
current profile and return the original exit code.

Each auto-rotation run writes parseable diagnostics to stderr:

```text
run-gemini: rotation_chain=primary,secondary max_fallback_attempts=2 backoff_seconds=1
run-gemini: attempt=1 profile=primary status=failed reason=quota exit_code=42 fallback=true
run-gemini: attempt=2 profile=secondary status=succeeded reason=none exit_code=0
```

If every attempted active profile fails with retryable signatures, the runner
exits non-zero and prints the full chain plus the last failure reason. Disable
fallback for one command with `--no-auto-rotate`, even if
`GEMINI_AUTO_ROTATE=true` is set in the environment.
