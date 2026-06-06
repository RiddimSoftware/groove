export function createNoopLinearWorkspace() {
  return Object.freeze({
    describe() {
      return Object.freeze({ connected: false, mutationsPerformed: 0 });
    },
  });
}
