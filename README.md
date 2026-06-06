# Groove

Workflow primitives for autonomous software development.

Groove is a collection of small, independently installable tools that help you run LLM coding agents reliably — with better issues going in, and a clear audit trail coming out.

## Packages

### [`issue-standards`](packages/issue-standards)

A Claude Code skill that teaches agents (and humans) how to write issues that autonomous developers can actually finish. Covers required sections, acceptance criteria discipline, the human-handoff pattern, and complexity estimation.

```bash
npx issue-standards setup
```

### [`linear-agent-hooks`](packages/linear-agent-hooks)

Claude Code and Codex hooks that automatically post a provenance comment back to every Linear issue your agent creates — capturing which session created it, what you asked for, and when.

```bash
npx linear-agent-hooks setup
```

### [`human-handoff-linear`](packages/human-handoff-linear)

Linear-backed workflow primitives for the human-handoff pattern — one project-level Human Handoff issue that aggregates every step a human still has to do in an otherwise autonomous flow.

Validate your Linear API key without touching any of your data:

```bash
LINEAR_API_KEY=lin_api_… npx human-handoff-linear doctor
```

Or provision the workspace-level `Human Handoff` issue template from the versioned, public-safe markdown body. Idempotent: creates the template the first time, updates it when the bundled body drifts, reports no-change when already in sync.

```bash
LINEAR_API_KEY=lin_api_… npx human-handoff-linear sync-template
```

Ensure selected Linear teams have the `human-handoff` issue label:

```bash
npx human-handoff-linear setup --team GRV
```

### [`llm-cost-attribution`](packages/llm-cost-attribution)

Per-issue token, turn, and quota analytics for Claude Code and Codex CLI sessions. Reads the CLIs' own session JSONLs — no custom telemetry pipeline required.

Attribute cost to a Linear issue (works out of the box with any orchestrator following [OpenAI Symphony's](https://github.com/openai/symphony/blob/main/SPEC.md) per-issue workspace convention):

```bash
npx llm-cost-attribution EPAC-1940
```

Or point directly at the directory an agent ran in — no issue ID or Symphony convention needed:

```bash
npx llm-cost-attribution --worktree /path/to/worktree
```

Optionally bake transcripts into a compact `usage.jsonl` (40× smaller) so you can delete `~/.claude/projects` and `~/.codex/sessions` without losing cost history. The bake file follows the [Symphony Coding-Agent Cost Telemetry Extension spec](specs/symphony-cost-telemetry-extension) so other tools can read it too — but that interop is purely optional.

---

These tools are independent — install any, there's no coupling between them.
