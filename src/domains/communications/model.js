/**
 * Captured outbound email. Release 1 uses a mock transport that records each
 * send so the UI can show a "Sent items" list and the audit trail stays intact.
 * @typedef {Object} OutboundEmail
 * @property {string} id
 * @property {string} productId
 * @property {string} [quoteVersionId]
 * @property {string} from
 * @property {string[]} to
 * @property {string[]} [cc]
 * @property {string} subject
 * @property {string} body
 * @property {string} [language]
 * @property {string} [acceptanceLink]
 * @property {string[]} [attachmentIds]
 * @property {string} sentAt
 * @property {'mock' | 'smtp' | 'sendgrid'} transport
 * @property {'queued' | 'sent' | 'failed'} status
 */

export {}
