# Refactoring Scorecard

Use this rubric to evaluate the quality and safety of a refactoring Pull Request or changeset.

| Category | Excellent (Pass) | Needs Improvement (Fail) |
| :--- | :--- | :--- |
| **Behavior Preservation** | Observable external behavior is identical. No features were added or removed during the refactoring commits. | External behavior changed. A bug was introduced, or a feature was stealthily added/modified. |
| **Test Coverage** | Existing tests pass without modification (unless the test itself was overly coupled to implementation details). New tests added if coverage was lacking prior to refactoring. | Tests are broken, disabled, or removed. Refactoring was performed on critical paths without adequate test coverage. |
| **Step Size** | Commits are atomic and represent single logical refactoring steps. It is easy to follow the history and revert a specific step if needed. | Large, monolithic commits combining multiple unrelated refactorings or mixing refactoring with new feature development. |
| **Smell Resolution** | Clearly addresses specific, identifiable code smells (e.g., Duplicated Code, Long Method, Feature Envy). | Changes seem arbitrary ("thrashing") or subjective without addressing a tangible design flaw. |
| **Readability** | Intention is clearer. Names are more descriptive. Methods and classes are smaller and more focused on a single responsibility. | Code is harder to understand. Indirection was introduced without a corresponding benefit in clarity or flexibility. |
| **Duplication** | Identical or nearly identical code blocks have been consolidated into single, reusable components. | Duplication remains or was masked rather than eliminated. |
| **Two Hats** | Clear separation between refactoring commits and feature commits. | Refactoring and feature additions are mixed in the same commit, making it impossible to verify behavior preservation. |
