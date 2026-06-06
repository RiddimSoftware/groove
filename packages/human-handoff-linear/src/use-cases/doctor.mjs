import { createSetupCommand } from '../values.mjs';

export function createDoctorUseCase({ reporter, secretReader }) {
  return async function doctor(input = {}) {
    const command = createSetupCommand('doctor', input);
    const token = await secretReader.read('LINEAR_API_KEY');

    reporter.info('human-handoff-linear doctor - checking local readiness');
    reporter.info('Node runtime: provided by CLI adapter');
    reporter.info(token ? 'Linear token: present' : 'Linear token: not set; ok for scaffold commands.');

    return Object.freeze({
      command,
      tokenPresent: Boolean(token),
      checks: Object.freeze([
        Object.freeze({ name: 'command-router', ok: true }),
        Object.freeze({ name: 'linear-token', ok: Boolean(token), required: false }),
      ]),
    });
  };
}
