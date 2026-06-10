# GitHub Mutations

This directory contains templates and documentation for performing auditable GitHub mutations via `workflow_dispatch`.

## Lifecycle

All mutations must follow this lifecycle to ensure they are auditable, reversible, and safe:

1.  **PR**: Create a pull request containing:
    -   An idempotent mutation script in `mutations/DEL-NNN-slug.sh`.
    -   A temporary GitHub Actions workflow in `.github/workflows/mutate-DEL-NNN.yml` that triggers the script.
2.  **Merge**: Once the PR is reviewed and approved, merge it into `main`.
3.  **Trigger**: Manually trigger the `mutate-DEL-NNN` workflow from the GitHub Actions tab on the `main` branch.
4.  **Verify**: Confirm the mutation was successful by checking the workflow logs and verifying the target state (e.g., check repo settings, environment existence, etc.).
5.  **Disable**: Immediately after successful verification, create a follow-up PR to **disable** (not delete) the workflow. This keeps the audit trail visible in the Actions tab.

## File Naming Conventions

-   **Mutation Script**: `mutations/DEL-NNN-slug.sh`
-   **Workflow File**: `.github/workflows/mutate-DEL-NNN.yml`

## Design Decisions

### Why `workflow_dispatch` over `push`?

-   **Control**: Mutations should not happen automatically on merge. Using `workflow_dispatch` requires an explicit, manual trigger after the code has been merged and reviewed.
-   **Targeting**: `workflow_dispatch` allows running the mutation against specific branches (usually `main`) without triggering on every push during the development of the mutation script itself.

### Why `disable` over `delete` or accumulate?

-   **Audit Trail**: Deleting a workflow file removes its history from the "Actions" tab. Disabling the workflow keeps the history and logs accessible for future audits while preventing accidental re-runs.
-   **Clutter**: We do not "accumulate" active mutation workflows in the `.github/workflows/` directory. Disabling them signals that the mutation is complete and no longer active.

### How to Disable a Workflow

1.  Navigate to the **Actions** tab in the GitHub repository.
2.  Select the mutation workflow (e.g., `mutate-DEL-NNN`) from the left-hand sidebar.
3.  Click the **...** (three dots) menu button in the top right of the workflow run list.
4.  Select **Disable workflow**.

## Templates

To implement a new mutation, copy these templates and fill in the placeholders:

1.  **Mutation Script**:
    -   Copy [`template-mutation.sh`](template-mutation.sh) to `mutations/DEL-NNN-slug.sh`.
    -   Update the logic to perform your specific mutation while maintaining the idempotency pattern.
    -   Ensure the script is executable (`chmod +x`).

2.  **Workflow File**:
    -   Copy [`.template-mutate-DEL-NNN.yml`](.template-mutate-DEL-NNN.yml) to `.github/workflows/mutate-DEL-NNN.yml`.
    -   Update the `name` and any specific `permissions` your script requires.
    -   Ensure the `Run mutation script` step points to your new script.

Note: The workflow template is stored here in `mutations/` with a leading dot to avoid being picked up by `actionlint` globbing in `.github/workflows/` before it is properly configured.

## Recommended PR Body

When opening a PR for a mutation, use this template:

```markdown
## Summary
Implementing auditable GitHub mutation for [DEL-NNN].

## Mutation Plan
1. Merge this PR to \`main\`.
2. Trigger the \`mutate-DEL-NNN\` workflow manually via \`workflow_dispatch\`.
3. Verify the result in the workflow logs and target state.
4. Open a follow-up PR to **disable** the workflow.

## Files
- \`mutations/DEL-NNN-slug.sh\`: The idempotent mutation script.
- \`.github/workflows/mutate-DEL-NNN.yml\`: The temporary workflow trigger.

## Verification
- [ ] \`bash -n mutations/DEL-NNN-slug.sh\` passed locally.
- [ ] \`actionlint .github/workflows/mutate-DEL-NNN.yml\` passed locally.
```

## Best Practices

### Secret Management
- **GITHUB_TOKEN**: Use the default `${{ secrets.GITHUB_TOKEN }}` for mutations that only require repository-level access.
- **Custom Secrets**: If the mutation requires higher privileges (e.g., organization-level administration, personal access tokens for cross-repo work), use a custom secret (e.g., `${{ secrets.ORG_ADMIN_TOKEN }}`). **Never** hardcode tokens.

### Permission Scoping
- Declare the minimum necessary permissions in the workflow's `permissions:` block.
- For most mutations, `contents: read` is sufficient for the job, as the `GH_TOKEN` can be elevated for specific steps if needed, but keeping the job-level permissions low is a safety measure.

### Verification Strategies
- **Logs**: Print clear success/failure messages in your script.
- **API Checks**: Use `gh api` or `curl` to verify the state of the resource after the mutation.
- **Dry Run**: Always implement and test with `DRY_RUN=true` first.

## Troubleshooting

### "Resource not accessible by integration"
This usually means the `GITHUB_TOKEN` does not have sufficient permissions for the requested API call. You may need to:
1.  Add specific `permissions:` to the workflow YAML (e.g., `environments: write`, `administration: write`).
2.  Use a Personal Access Token (PAT) if the action is not supported by the GitHub Actions installation.

### Idempotency Failures
If your script fails on the second run, ensure your "Check" phase correctly identifies the existing state. Use `-w "%{http_code}"` with `gh api` to reliably distinguish between 200 (exists) and 404 (missing).

## Tips for Success

- **Be Surgical**: Only mutate what is necessary. Avoid broad configuration changes unless they are the primary goal.
- **Test Twice**: Run with `dry_run: true` multiple times to ensure your idempotency check works as expected.
- **Audit the Audit**: Review your own workflow logs after a mutation. They are the permanent record of what happened.
- **Clean Up**: Don't forget the final PR to **disable** the workflow. A clean `.github/workflows/` directory is a happy one.
