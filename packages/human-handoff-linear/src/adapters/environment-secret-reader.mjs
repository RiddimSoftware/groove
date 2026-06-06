export function createEnvironmentSecretReader(env) {
  return Object.freeze({
    read(name) {
      const value = env?.[name];
      return value === '' ? null : value;
    },
  });
}
