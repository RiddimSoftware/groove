export function createStreamConsoleReporter({ stdout, stderr, quiet = false, verbose = false }) {
  return Object.freeze({
    info(message) {
      if (!quiet) stdout.write(`${message}\n`);
    },
    error(message) {
      stderr.write(`${message}\n`);
    },
    verbose(message) {
      if (verbose && !quiet) stdout.write(`${message}\n`);
    },
  });
}
