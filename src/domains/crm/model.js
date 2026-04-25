/**
 * @typedef {Object} Client
 * @property {string} id
 * @property {string} name
 * @property {string} segment
 * @property {string} region
 * @property {string} [notes]
 * @property {string} [contactName]
 * @property {string} [contactEmail]
 */

/**
 * @typedef {Object} ClientOrder
 * @property {string} id
 * @property {string} clientId
 * @property {string} productId
 * @property {string} orderedAt — ISO date
 * @property {'open'|'in_production'|'shipped'|'closed'} status
 * @property {string} [quoteId]
 */

/**
 * @typedef {Object} OrderLine
 * @property {string} id
 * @property {string} orderId
 * @property {string} description
 * @property {number} qty
 * @property {number} unitPrice
 */

/**
 * @typedef {Object} OrderExecutionRecord
 * @property {string} id
 * @property {string} orderId
 * @property {string} milestone
 * @property {string} completedAt — ISO datetime
 * @property {string} [notes]
 */

/**
 * @typedef {Object} OrderMachineUsage
 * @property {string} id
 * @property {string} orderId
 * @property {string} machineId
 * @property {number} hours
 */

/**
 * @typedef {Object} OrderTimeLog
 * @property {string} id
 * @property {string} orderId
 * @property {string} phase
 * @property {number} plannedHours
 * @property {number} actualHours
 */

/**
 * @typedef {Object} OrderIssue
 * @property {string} id
 * @property {string} orderId
 * @property {string} severity
 * @property {string} description
 * @property {string} reportedAt
 * @property {'open'|'resolved'} status
 */

/**
 * @typedef {Object} Invoice
 * @property {string} id
 * @property {string} orderId
 * @property {string} clientId
 * @property {number} amount
 * @property {string} issuedAt
 * @property {string} dueAt
 */

/**
 * @typedef {Object} PaymentRecord
 * @property {string} id
 * @property {string} invoiceId
 * @property {string} clientId
 * @property {number} amount
 * @property {string} paidAt
 * @property {number} daysLate — 0 if on time
 */

/**
 * @typedef {Object} SchematicDocument
 * @property {string} id
 * @property {string} orderId
 * @property {string} clientId
 * @property {string} title
 * @property {string} revision
 * @property {string} url
 */

export {}
