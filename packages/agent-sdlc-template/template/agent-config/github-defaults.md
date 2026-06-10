## GitHub Defaults

- When using GitHub, the GitHub API, or the `gh` CLI, default to the `YourGithubOrg` organization when the user has not explicitly specified an owner.
- Do not assume the user's personal GitHub account for repository lookups, issue/PR operations, repository creation, or settings changes unless the user explicitly names it.
- If a command needs a repository argument and the repo name is otherwise clear, prefer `YourGithubOrg/<repo>` over `<user>/<repo>`.
