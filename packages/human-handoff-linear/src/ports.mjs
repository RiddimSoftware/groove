/**
 * @typedef {Object} ConsoleReporter
 * @property {(message: string) => void} info
 * @property {(message: string) => void} error
 * @property {(message: string) => void=} verbose
 */

/**
 * @typedef {Object} SecretReader
 * @property {(name: string) => string | null | undefined | Promise<string | null | undefined>} read
 */

/**
 * @typedef {Object} LinearWorkspace
 * @property {() => Promise<unknown> | unknown=} describe
 * @property {(input: { body: string }) => Promise<unknown> | unknown=} syncHumanHandoffTemplate
 * @property {(input: { teamKey?: string | null }) => Promise<unknown> | unknown=} bootstrapHumanHandoffProject
 */

export {};
