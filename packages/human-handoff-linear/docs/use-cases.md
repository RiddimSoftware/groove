# human-handoff-linear Use Cases

### EnsureHumanHandoffLabels
Actor: Operator
Goal: Ensure each selected Linear team has exactly one issue label named
`human-handoff`, without duplicating existing labels whose names only differ by
case.
Inputs: Team refs as keys or UUIDs, or all accessible teams; IssueLabelSpec;
dry-run mode.
Outputs: LabelEnsureResult per team: already present, would create, or created.
Entities / values: LinearTeamRef, IssueLabelSpec, LabelEnsureResult.
Ports: LinearWorkspace.
Primary adapters: Linear GraphQL workspace adapter, CLI team selector parser.
Current implementation: `packages/human-handoff-linear/src/use-cases/ensure-human-handoff-labels.mjs`

Boundary rule: the use case imports no CLI, process, fetch, HTTP, or GraphQL
code. Linear API access is confined to
`src/adapters/linear-graphql-workspace.mjs`; CLI flag names are confined to
`src/cli/run-cli.mjs`.
