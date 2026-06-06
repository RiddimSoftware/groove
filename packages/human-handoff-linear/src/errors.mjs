/**
 * Typed errors for Linear API failures.
 *
 * Each error carries a stable `kind` discriminator the CLI uses to map a
 * failure to an exit code without sniffing message strings. Use case code
 * surfaces a structured DoctorFinding instead of throwing, so callers can
 * render output and choose exit codes without try/catch.
 */

export class LinearError extends Error {
  constructor(message, { kind = 'unknown', cause } = {}) {
    super(message);
    this.name = 'LinearError';
    this.kind = kind;
    if (cause !== undefined) this.cause = cause;
  }
}

export class LinearAuthError extends LinearError {
  constructor(message = 'Linear authentication failed: invalid or missing API key.', opts = {}) {
    super(message, { ...opts, kind: 'auth' });
    this.name = 'LinearAuthError';
  }
}

export class LinearPermissionError extends LinearError {
  constructor(message = 'Linear API permission denied: token is missing a required scope.', opts = {}) {
    super(message, { ...opts, kind: 'permission' });
    this.name = 'LinearPermissionError';
  }
}

export class LinearRateLimitError extends LinearError {
  constructor(message = 'Linear API rate limit hit. Wait and retry.', opts = {}) {
    super(message, { ...opts, kind: 'rate_limit' });
    this.name = 'LinearRateLimitError';
  }
}

export class LinearNetworkError extends LinearError {
  constructor(message = 'Could not reach the Linear API.', opts = {}) {
    super(message, { ...opts, kind: 'network' });
    this.name = 'LinearNetworkError';
  }
}

export class LinearApiError extends LinearError {
  constructor(message = 'Linear API returned an error.', opts = {}) {
    super(message, { ...opts, kind: opts.kind ?? 'api' });
    this.name = 'LinearApiError';
  }
}

export class MissingTokenError extends LinearError {
  constructor(message = 'LINEAR_API_KEY is not set. Export it or rerun without --no-prompt to be prompted.', opts = {}) {
    super(message, { ...opts, kind: 'missing_token' });
    this.name = 'MissingTokenError';
  }
}

/**
 * Map a LinearError kind to a CLI exit code. Stable for scripting:
 *   0 ok
 *   1 unknown
 *   2 missing token
 *   3 auth
 *   4 permission
 *   5 rate limit
 *   6 network
 *   7 api / graphql
 */
export function exitCodeFor(errorOrKind) {
  if (!errorOrKind) return 0;
  const kind = typeof errorOrKind === 'string' ? errorOrKind : errorOrKind.kind;
  switch (kind) {
    case 'missing_token': return 2;
    case 'auth': return 3;
    case 'permission': return 4;
    case 'rate_limit': return 5;
    case 'network': return 6;
    case 'api': return 7;
    default: return 1;
  }
}
