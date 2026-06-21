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

/**
 * A message in an inquiry's discussion thread. The thread is an immutable,
 * timestamped log so the team can revisit the conversation over time. Messages
 * carry free-form tags (labels) for filtering and @mentions of teammates.
 * @typedef {Object} InquiryMessage
 * @property {string} id
 * @property {string} threadKey             — owning quotation (quote id); falls back to `product:<id>` before a quote exists
 * @property {string} [authorId]            — employee id of the author
 * @property {string} authorLabel           — snapshot of the author's name
 * @property {string} body
 * @property {string[]} [tags]              — topic labels, e.g. "pricing", "blocker"
 * @property {{ id: string; name: string; size?: number }[]} [attachments]  — file references
 * @property {string[]} [mentions]          — employee ids referenced via @mention
 * @property {string} createdAt             — ISO datetime
 * @property {string} [editedAt]            — ISO datetime if edited
 */

export {}
