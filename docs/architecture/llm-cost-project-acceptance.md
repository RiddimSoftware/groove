# llm-cost Project Acceptance Gate

Linear project: llm-cost architecture contracts.

This repository has a temporary, non-required ATDD completeness gate for the
llm-cost architecture contract work.

Run it locally with:

```bash
npm run project-acceptance
```

Acceptance and deterministic check files live under:

```text
test/project-acceptance/llm-cost-architecture-contracts/
```

The runner discovers files ending in `.test.mjs` or `.check.mjs`, then executes
them with `node --test`. Later test tickets can add red acceptance/check files in
that directory without changing package scripts or GitHub workflow wiring.

CI runs the same command in `.github/workflows/project-acceptance.yml`. That
workflow is intentionally not a required branch-protection check. The required
`.github/workflows/pr-build.yml` gate must continue to exclude this directory
and command while the Project is active so red acceptance tickets can merge in
blocker order.

Remove this temporary gate at Project closeout, after the Human Handoff issue is
ready to close and the durable composition-root checks have been promoted into
the normal package test surface. Delete the workflow, this note, and the root
`project-acceptance` script if nothing else uses it. Keep durable boundary rules.
