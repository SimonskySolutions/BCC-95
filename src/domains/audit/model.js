/**
 * Generic audit trail entry attached to a product (Запитване → Внедряване and beyond).
 * @typedef {'inquiry' | 'quote' | 'quoteVersion' | 'quoteApproval' | 'quoteSend' | 'quoteDecision' | 'phase' | 'task' | 'document' | 'report'} AuditEntityType
 */

/**
 * @typedef {Object} AuditEntry
 * @property {string} id
 * @property {string} productId                                — anchor to the central Product entity
 * @property {AuditEntityType} entityType
 * @property {string} entityId
 * @property {string} action                                   — machine-readable code, e.g. `quote.sent`
 * @property {string} [actorId]                                — employee id if internal, undefined for customer actions
 * @property {string} [actorLabel]                             — free-form label, used for customer or system actors
 * @property {string} at                                       — ISO datetime
 * @property {Record<string, unknown>} [meta]
 */

export {}
