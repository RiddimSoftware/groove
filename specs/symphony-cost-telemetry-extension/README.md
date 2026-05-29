# Symphony Coding-Agent Cost Telemetry Extension

An extension to the [OpenAI Symphony Service Specification](https://github.com/openai/symphony/blob/main/SPEC.md) that defines a vendor-neutral, on-disk format for attributing coding-agent token cost to issue-tracker work.

## What it defines

A single append-only file — `usage.jsonl` — written by Symphony-conformant orchestrators. One record per agent turn, capturing token counts, model, provider, issue identifier, and timing. No prompt or response content; only the numbers that bear on cost.

The format is deliberately narrow: it standardises just enough to let a single cost reader work across any conformant implementation, regardless of which coding agent (Claude, Codex, Gemini, …) produced the turns.

See [SPEC.md](SPEC.md) for the full normative specification.

## Relationship to the parent spec

This is an extension, not a replacement. It takes the per-turn token data that Symphony's §13.5 already tells implementations to extract, and prescribes a durable on-disk projection of it. All other Symphony behaviour is unchanged.

A Symphony implementation may conform to the parent spec without conforming to this extension. An implementation claiming conformance with this extension must also conform to the parent spec.

## Reference implementation

[`llm-cost-attribution`](../../packages/llm-cost-attribution) in this repo implements a reader for the `usage.jsonl` format defined here, alongside direct transcript parsing for Claude Code and Codex sessions. The `backfill` command converts existing transcripts into spec-compliant `usage.jsonl` records.
