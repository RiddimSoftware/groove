# Provider Webhook Relay Runbook (AGENT-3)

This runbook documents the `agent-config`-owned configuration for provider webhook ingestion and
provider-specific polling defaults used by Symphony workflows.

## Polling defaults (shared)

- Global daemon polling remains unchanged:

```yaml
polling:
  interval_ms: 30000
```

- Provider-specific polling defaults in shared config:

```yaml
polling:
  linear:
    candidate_interval_ms: 30000
    issue_read_interval_ms: 30000
  github:
    candidate_interval_ms: 30000
    issue_read_interval_ms: 30000
```

These values are intentionally conservative and do not override
`polling.interval_ms`. `AUTO-708` is responsible for consuming these values and applying provider-specific cadence rules.

## Linear webhook relay

- Relay endpoint: `/webhook/linear` (resolved from `provider_webhook_relay.path_prefix` + `/linear`).
- Signature header: `Linear-Signature`.
- Delivery id header: `Linear-Delivery`.
- Signing secret location:
  - AWS Parameter Store name: `/symphony/linear-webhook-signing-secret`
  - Profile: `your-aws-profile`
  - Region: `us-east-1`
- Accepted events:
  - `Issue`
  - `Comment`
  - `Project`
  - `Cycle`
  - `Label`
- Relay behavior:
  - Rejects unsigned or invalidly signed requests.
  - Deduplicates by `Linear-Delivery` before writing to the durable provider inbox.
  - Normalizes payloads to the shared provider-event envelope expected by `AUTO-708`.

## GitHub webhook relay

- Relay endpoint: `/webhook/github` (resolved from `provider_webhook_relay.path_prefix` + `/github`).
- Signature header: `X-Hub-Signature-256`.
- Delivery id header: `X-Hub-Delivery`.
- Signing secret location:
  - AWS Parameter Store name: `/symphony/github-webhook-signing-secret`
  - Profile: `your-aws-profile`
  - Region: `us-east-1`
- Accepted events:
  - `pull_request`
  - `pull_request_review`
  - `pull_request_review_comment`
  - `pull_request_review_thread`
  - `check_run`
  - `status`
  - `workflow_run`
  - `push`
- Relay behavior:
  - Rejects unsigned or invalidly signed requests.
  - Deduplicates by `X-Hub-Delivery` before writing to the durable provider inbox.
  - Normalizes payloads to the shared provider-event envelope expected by `AUTO-708`.

## Durable inbox behavior

- Inbox path: `.symphony/provider-events.db` (`provider_event_inbox.sqlite_path`).
- Delivery dedupe TTL: `604800000` ms (7 days).
- Offline retention target: `72` hours.
- Capacity cap: `5000` events per provider.

## Operations and troubleshooting

- Configure event subscriptions using the accepted event lists above.
- Validate secrets against the configured AWS secret IDs in `your-aws-profile`.
- Confirm webhook requests are signed and include delivery ids before ingestion.
- Verify dedupe and replay behavior by re-posting an identical webhook payload with the same delivery id.
- When dispatch is triggered by polling vs relay:
  - Polling runs continue on `polling.interval_ms`.
  - Relay-triggered runs are driven by new inbound normalized events from the provider inbox.

For deeper operator notes, update this runbook alongside parser and inbox schema changes in `AUTO-708`.
