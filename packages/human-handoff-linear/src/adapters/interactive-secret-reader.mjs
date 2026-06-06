/**
 * InteractiveSecretReader — SecretReader adapter that resolves a secret from
 * the environment first, then falls back to a hidden interactive TTY prompt.
 *
 * Conforms to the SecretReader port: `read(name)` returns the secret value or
 * `null`. The hidden prompt is opt-in per call via the `interactive` option
 * passed to `readLinearApiKey` so non-interactive use (CI / scripts) never
 * blocks on stdin.
 *
 * The API key is never logged, written to disk, or echoed to the terminal.
 */

import { createEnvironmentSecretReader } from './environment-secret-reader.mjs';

/**
 * @typedef {object} InteractiveSecretReaderOptions
 * @property {Record<string, string|undefined>} [env]
 * @property {NodeJS.ReadStream} [stdin]
 * @property {NodeJS.WriteStream} [stdout]
 * @property {(opts: { stdin: NodeJS.ReadStream, stdout: NodeJS.WriteStream, prompt: string }) => Promise<string>} [hiddenPrompt]
 */

/**
 * @param {InteractiveSecretReaderOptions} [opts]
 * @returns {import('../ports.mjs').SecretReader & {
 *   readLinearApiKey: (opts?: { interactive?: boolean, prompt?: string }) => Promise<string | null>,
 * }}
 */
export function createInteractiveSecretReader({
  env = {},
  stdin,
  stdout,
  hiddenPrompt = defaultHiddenPrompt,
} = {}) {
  const baseReader = createEnvironmentSecretReader(env);

  return Object.freeze({
    read(name) {
      return baseReader.read(name);
    },

    async readLinearApiKey({ interactive = false, prompt = 'Linear API key: ' } = {}) {
      const fromEnv = baseReader.read('LINEAR_API_KEY');
      if (typeof fromEnv === 'string' && fromEnv.trim() !== '') return fromEnv.trim();
      if (!interactive) return null;
      if (!stdin?.isTTY) return null;
      const entered = (await hiddenPrompt({ stdin, stdout, prompt }))?.trim() ?? '';
      return entered === '' ? null : entered;
    },
  });
}

/**
 * Read one line from `stdin` without echoing to `stdout`. Restores raw mode
 * and listeners on exit so the process is left in a clean state.
 */
function defaultHiddenPrompt({ stdin, stdout, prompt }) {
  return new Promise((resolve, reject) => {
    if (typeof stdin.setRawMode !== 'function') {
      reject(new Error('hidden prompt requires a TTY stdin with setRawMode'));
      return;
    }

    stdout.write(prompt);
    const previousRaw = stdin.isRaw === true;
    try { stdin.setRawMode(true); } catch (e) { reject(e); return; }
    stdin.resume();
    stdin.setEncoding('utf8');

    let buffer = '';
    const cleanup = () => {
      stdin.removeListener('data', onData);
      try { stdin.setRawMode(previousRaw); } catch { /* best-effort */ }
      stdin.pause();
      stdout.write('\n');
    };

    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '') { // Ctrl-C
          cleanup();
          reject(new Error('Interactive prompt cancelled.'));
          return;
        }
        if (ch === '\r' || ch === '\n') {
          cleanup();
          resolve(buffer);
          return;
        }
        if (ch === '' || ch === '\b') { // DEL or BS
          buffer = buffer.slice(0, -1);
          continue;
        }
        buffer += ch;
      }
    };

    stdin.on('data', onData);
  });
}
