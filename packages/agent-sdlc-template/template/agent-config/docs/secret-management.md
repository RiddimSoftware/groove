# Secret Management

Org-wide policy for where credentials live, what's mirrored, and how to rotate.
Read this when adding a new shared credential, rotating an existing one, or
auditing where a credential is stored.

## Canonical source

**AWS Systems Manager Parameter Store (SecureString) is canonical** for
credentials shared between AWS-runtime consumers (Lambdas, Symphony
orchestrator, agent-config `bin/` scripts) and GitHub Actions workflows.

**GitHub org and repo secrets are a manually-synced mirror** of selected
Parameter Store entries. They exist to give workflows zero-fetch access to
credentials they use frequently; the Parameter Store entry remains the source
of truth.

Why not pick one store? GitHub-side consumers can't fetch from AWS
without per-job OIDC setup that adds latency to every job. AWS-side
consumers can't fetch from GitHub secrets without an inverted, awkward
dependency. Mirroring is the pragmatic choice at current scale.

## Single-surface credentials (no mirror)

Many credentials only need to exist in one store and should stay that way:

- **App Store distribution certificate** (`DISTRIBUTION_CERT_P12`,
  `DISTRIBUTION_CERT_PASSWORD`) — consumed by iOS release workflows in `epac`
  and `bubble-bop`. Lives in GitHub repo secrets. No AWS mirror. (The App
  Store Connect **API key** — `ASC_KEY_ID` / `ASC_ISSUER_ID` /
  `ASC_PRIVATE_KEY` — is a separate, now-**mirrored** credential; see the
  table below. `epac` and `bubble-bop` keep legacy repo-level copies of it
  pending consolidation onto the org mirror.)
- **Sonnio Spotify refresh token** — only consumed by the Sonnio Lambda and
  its scheduled rotation workflow. Lives in AWS Parameter Store. No GitHub
  mirror.
- **Backend deploy credentials** (Sentry DSN, RDS bootstrap) — fetched by
  deploy workflows via OIDC role assumption; live in AWS Parameter Store.
  Workflows do not embed them in `${{ secrets.* }}`.

A credential becomes a candidate for mirroring only when both AWS-runtime
and GitHub-side consumers need it.

## Currently mirrored credentials

| Canonical (AWS Parameter Store) | GitHub mirror | Consumers |
|---|---|---|
| `agent-loop/dev-bot-app-id` | org secret `DEV_BOT_APP_ID` (scope=ALL) | AWS: Symphony orchestrator, `agent-config/bin/gh-app-token`. GitHub: ~25 repos' `set-automerge.yml`, `intake-enrich.yml`, `sync-generated-workflow-shims.yml`, `automate-auto-merge.yml`. |
| `agent-loop/dev-bot-private-key` | org secret `DEV_BOT_PRIVATE_KEY` (scope=ALL) | Same as above |
| `linear/api-token` | org secret `LINEAR_API_TOKEN` (scope=ALL) | AWS: agent skills' Linear fallback path. GitHub: `ci-failure-handler.yml`, `intake-enrich.yml`. |
| `/appstore/connect-api` (`key_id`, `issuer_id`, `private_key`) | org secrets `ASC_KEY_ID` / `ASC_ISSUER_ID` / `ASC_PRIVATE_KEY` (scope=SELECTED: `aso`, `epac`, `bubble-bop`, `portal-door`, `sonnio`, `PleasePlay`, `blindfold`, `riddim-release`) | AWS: centralized delivery (`riddim-release/deliver-metadata.yml`) when `credential_source=aws-parameter-store`. GitHub: same path when `credential_source=caller-supplied-secrets` (e.g. `aso/deliver-from-aso.yml`). AWS copy retained as canonical until all consumers migrate off the Parameter Store path. |

Update this table when adding or retiring a mirrored credential.

## Rotation procedure

**Order matters: AWS first, then GitHub.** A failed rotation that lands in
AWS but not GitHub leaves GitHub consumers on the old credential — still
working, just stale, which is recoverable. The reverse ordering leaves
AWS-runtime consumers (Symphony, Lambdas) on the old credential while
GitHub consumers see the new one — Symphony's outbound API calls auth-fail
and the dev bot stops opening PRs.

### Headless rotation — credentials with no GitHub mirror

```bash
AWS_PROFILE=your-aws-profile aws ssm put-parameter \
  --region us-east-1 \
  --name <parameter-path> \
  --type SecureString \
  --value '<new-value>' \
  --overwrite
```

### Mirrored rotation — credentials in the table above

```bash
# 1. Update AWS Parameter Store first
AWS_PROFILE=your-aws-profile aws ssm put-parameter \
  --region us-east-1 \
  --name agent-loop/dev-bot-private-key \
  --type SecureString \
  --value "$(cat /path/to/new-key.pem)" \
  --overwrite

# 2. Read back and push to GitHub
AWS_PROFILE=your-aws-profile aws ssm get-parameter \
  --region us-east-1 \
  --name agent-loop/dev-bot-private-key \
  --with-decryption \
  --query 'Parameter.Value' \
  --output text \
  | gh secret set --org YourGithubOrg DEV_BOT_PRIVATE_KEY --visibility all --body -
```

`gh secret set` runs as the local human (not as a bot). Org-secret writes
are intentionally a human-gated step — they affect every repo.

## GitHub secret scope rules

- **Org-level, scope=ALL** auto-inherits into every repo in the
  `YourGithubOrg` org (existing and future). Use for credentials every repo
  needs (dev-bot identity, Linear API token).
- **Org-level, scope=SELECTED** lists specific repos. Use for credentials
  only some repos need (e.g. `AWS_RELEASE_ROLE_ARN`).
- **Repo-level** lives on a single repo. Use for repo-specific values
  (`ASC_PRIVATE_KEY` for epac's App Store signing).

When adding a new repo to the org, org-ALL secrets carry over automatically;
org-SELECTED and repo-level secrets must be added explicitly.

## What does not belong in this doc

- Specific secret values — never embed.
- One-off integration credentials only consumed in a single place — those
  live in their natural store (GitHub repo secret or AWS Parameter Store
  path); no mirroring needed.
- IAM policy or OIDC role-assumption mechanics — see workflow files for
  `aws-actions/configure-aws-credentials` usage; those are workflow-local
  concerns, not org policy.
