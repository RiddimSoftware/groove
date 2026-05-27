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

### [`llm-cost-attribution`](packages/llm-cost-attribution)

Per-issue token, turn, and quota analytics for Claude Code and Codex CLI sessions. Reads the CLIs' own session JSONLs — no custom telemetry pipeline required. Works out of the box with any orchestrator that follows the [Symphony Telemetry Extension Spec](specs/symphony-telemetry-extension)'s worktree convention.

```bash
npx llm-cost-attribution EPAC-1940
```

---

These tools are independent. Install one, both, or neither — there's no coupling between them.
