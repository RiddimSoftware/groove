import { createSetupCommand } from '../values.mjs';

/**
 * ValidateLinearSetupAuth — the `doctor` use case.
 *
 * Resolves a Linear API token through the SecretReader port and, when a token
 * is available, validates it by calling `getViewer()` on the LinearWorkspace
 * port. Doctor never mutates: it does not create or update templates, labels,
 * issues, or relations.
 *
 * Dependency rule: only the SecretReader and LinearWorkspace ports cross
 * inward. No fetch, env, or stdin/stdout is touched here — adapters at the
 * edge supply those capabilities.
 *
 * Per-check `ok` reflects the intrinsic pass/fail of that check; the
 * top-level `result.ok` factors in the `required` flag — an optional check
 * that fails does not block overall success.
 *
 * @param {object} deps
 * @param {import('../ports.mjs').ConsoleReporter} deps.reporter
 * @param {import('../ports.mjs').SecretReader} deps.secretReader
 * @param {import('../ports.mjs').LinearWorkspace} [deps.workspace]
 * @param {(input: { apiKey: string }) => import('../ports.mjs').LinearWorkspace} [deps.workspaceFactory]
 *   Builds a fresh workspace from the resolved API key. `workspaceFactory`
 *   wins over `workspace` when both are supplied.
 */
export function createDoctorUseCase({ reporter, secretReader, workspace, workspaceFactory }) {
  return async function doctor(input = {}) {
    const command = createSetupCommand('doctor', input);
    const tokenRequired = input.tokenRequired !== false;
    const token = await secretReader.read('LINEAR_API_KEY');
    const tokenPresent = typeof token === 'string' && token !== '';

    reporter.info('human-handoff-linear doctor - validating Linear auth (read-only).');
    reporter.info(tokenPresent
      ? 'Linear token: present.'
      : tokenRequired
        ? 'Linear token: not set. Export LINEAR_API_KEY or rerun without --no-prompt.'
        : 'Linear token: not set (non-blocking for this command).');

    const checks = [{ name: 'command-router', ok: true, required: true }];

    const tokenCheck = { name: 'linear-token', ok: tokenPresent, required: tokenRequired };
    if (!tokenPresent && tokenRequired) {
      tokenCheck.error = { kind: 'missing_token', message: 'LINEAR_API_KEY is not set.' };
    }
    checks.push(tokenCheck);

    let viewerDetails = null;
    if (tokenPresent) {
      const liveWorkspace = workspaceFactory
        ? workspaceFactory({ apiKey: token })
        : workspace;

      if (!liveWorkspace?.getViewer) {
        const viewerCheck = {
          name: 'linear-viewer',
          ok: false,
          required: true,
          error: {
            kind: 'api',
            message: 'LinearWorkspace adapter does not implement getViewer; cannot validate auth.',
          },
        };
        reporter.error(`Linear viewer check failed: ${viewerCheck.error.message}`);
        checks.push(viewerCheck);
      } else {
        try {
          const result = await liveWorkspace.getViewer();
          viewerDetails = result;
          reporter.info(`Authenticated as ${result.viewer.name} in workspace ${result.organization.name} (${result.organization.urlKey}).`);
          checks.push({
            name: 'linear-viewer',
            ok: true,
            required: true,
            details: {
              viewer: { id: result.viewer.id, name: result.viewer.name, email: result.viewer.email },
              organization: { id: result.organization.id, name: result.organization.name, urlKey: result.organization.urlKey },
            },
          });
        } catch (err) {
          const kind = err?.kind ?? 'unknown';
          const message = err?.message ?? String(err);
          reporter.error(`Linear viewer check failed [${kind}]: ${message}`);
          checks.push({ name: 'linear-viewer', ok: false, required: true, error: { kind, message } });
        }
      }
    }

    const frozenChecks = checks.map((c) => Object.freeze({ ...c }));
    const ok = frozenChecks.every((c) => c.ok || c.required === false);

    return Object.freeze({
      command,
      tokenPresent,
      ok,
      viewer: viewerDetails,
      checks: Object.freeze(frozenChecks),
    });
  };
}
