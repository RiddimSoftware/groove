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
 * @typedef {Object} LinearViewer
 * @property {string} id
 * @property {string} name
 * @property {string=} email
 *
 * @typedef {Object} LinearOrganization
 * @property {string} id
 * @property {string} name
 * @property {string} urlKey
 *
 * @typedef {Object} LinearViewerEnvelope
 * @property {LinearViewer} viewer
 * @property {LinearOrganization} organization
 *
 * @typedef {Object} LinearTeam
 * @property {string} id
 * @property {string} key
 * @property {string} name
 *
 * @typedef {Object} LinearLabel
 * @property {string} id
 * @property {string} name
 * @property {string=} color
 * @property {string} teamId
 * @property {string | null=} description
 *
 * @typedef {Object} LinearTemplate
 * @property {string} id
 * @property {string} name
 * @property {string | null} description
 * @property {string} type
 * @property {string} teamId
 *
 * @typedef {Object} LinearIssue
 * @property {string} id
 * @property {string} identifier
 * @property {string} title
 * @property {string} url
 *
 * @typedef {Object} LinearRelation
 * @property {string} id
 * @property {string} type
 * @property {string} issueId
 * @property {string} relatedIssueId
 */

/**
 * @typedef {Object} LinearWorkspace
 * @property {() => Promise<unknown> | unknown=} describe
 * @property {() => Promise<LinearViewerEnvelope>=} getViewer
 * @property {() => Promise<LinearTeam[]>=} listTeams
 * @property {(input?: { teamId?: string }) => Promise<LinearLabel[]>=} listLabels
 * @property {(input: { teamId: string, name: string, color?: string, description?: string }) => Promise<LinearLabel>=} createLabel
 * @property {(input: { id?: string, teamId?: string, name?: string }) => Promise<LinearTemplate | null>=} getTemplate
 * @property {(input: { teamId?: string, name: string, description?: string, type?: string }) => Promise<LinearTemplate>=} createTemplate
 * @property {(input: { id: string, name?: string, description?: string }) => Promise<LinearTemplate>=} updateTemplate
 * @property {(input: { teamId: string, title: string, description?: string, labelIds?: string[], templateId?: string, projectId?: string }) => Promise<LinearIssue>=} createIssue
 * @property {(input: { issueId: string, relatedIssueId: string, type?: string }) => Promise<LinearRelation>=} createRelation
 * @property {(input: { body: string }) => Promise<unknown> | unknown=} syncHumanHandoffTemplate
 * @property {(input: { teamKey?: string | null }) => Promise<unknown> | unknown=} bootstrapHumanHandoffProject
 */

export {};
