/**
 * High-level quote header status.
 * Back-compat with earlier scaffold: `draft | sent | revision_requested | accepted | rejected`.
 * @typedef {'draft' | 'pending_approval' | 'approved' | 'sent' | 'revision_requested' | 'accepted' | 'rejected'} QuoteStatus
 */

/**
 * @typedef {'BGN' | 'EUR' | 'USD'} QuoteCurrency
 */

/**
 * @typedef {Object} QuoteDraft
 * @property {string} id
 * @property {string} clientId
 * @property {string} productId
 * @property {string} [inquiryId]                       — link back to the source inquiry
 * @property {QuoteStatus} status
 * @property {number} subtotal
 * @property {number} marginPercent
 * @property {string} [revisionNote]
 * @property {string} updatedAt                         — ISO date
 * @property {QuoteCurrency} [currency]
 * @property {string} [language]                        — `en` | `bg`
 * @property {number} [unitPrice]
 * @property {number} [toolingCost]
 * @property {number} [leadTimeDays]
 * @property {string} [validUntil]                      — ISO date
 * @property {string} [deliveryTerms]
 * @property {string} [paymentTerms]
 * @property {number} [moq]
 * @property {number} [currentVersionNo]
 * @property {string} [currentVersionId]
 */

/**
 * An immutable snapshot of a quote. A new version is created whenever the user
 * revises, so sent versions can never be edited.
 * @typedef {'draft' | 'approved' | 'sent' | 'superseded' | 'decided'} QuoteVersionStatus
 */

/**
 * @typedef {Object} QuoteVersion
 * @property {string} id
 * @property {string} quoteId
 * @property {number} versionNo
 * @property {QuoteVersionStatus} status
 * @property {string} createdAt                        — ISO datetime
 * @property {string} [sentAt]
 * @property {string} [lockedAt]
 * @property {string} [supersedesVersionId]
 * @property {number} subtotal
 * @property {number} marginPercent
 * @property {number} [unitPrice]
 * @property {number} [toolingCost]
 * @property {number} [leadTimeDays]
 * @property {string} [validUntil]
 * @property {string} [deliveryTerms]
 * @property {string} [paymentTerms]
 * @property {number} [moq]
 * @property {QuoteCurrency} [currency]
 * @property {string} [language]
 * @property {string} [notes]
 */

/**
 * @typedef {'material' | 'tooling' | 'labor' | 'operation' | 'logistics' | 'other'} QuoteLineItemKind
 */

/**
 * @typedef {Object} QuoteLineItem
 * @property {string} id
 * @property {string} quoteVersionId
 * @property {QuoteLineItemKind} kind
 * @property {string} description
 * @property {number} quantity
 * @property {number} unitPrice
 * @property {number} totalPrice
 */

/**
 * Manager approval gate before sending.
 * @typedef {'approved' | 'rejected'} QuoteApprovalDecision
 */

/**
 * @typedef {Object} QuoteApproval
 * @property {string} id
 * @property {string} quoteVersionId
 * @property {string} approverEmployeeId
 * @property {QuoteApprovalDecision} decision
 * @property {string} decidedAt
 * @property {string} [note]
 */

/**
 * @typedef {'drawing' | 'spec' | 'generated_offer_pdf' | 'customer_email' | 'acceptance_receipt' | 'other'} QuoteDocumentKind
 */

/**
 * @typedef {Object} QuoteDocument
 * @property {string} id
 * @property {string} quoteVersionId
 * @property {QuoteDocumentKind} kind
 * @property {string} name
 * @property {string} [storageRef]
 * @property {string} createdAt
 */

/**
 * Customer decision captured via the public acceptance form.
 * @typedef {'accepted' | 'revision_requested' | 'rejected'} QuoteDecisionOutcome
 */

/**
 * @typedef {Object} QuoteDecision
 * @property {string} id
 * @property {string} quoteVersionId
 * @property {QuoteDecisionOutcome} decision
 * @property {string} decidedAt
 * @property {string} [customerContactName]
 * @property {string} [customerContactEmail]
 * @property {string} [comment]
 * @property {string} token
 */

/** @type {QuoteStatus[]} */
export const QUOTE_STATUSES = [
  'draft',
  'pending_approval',
  'approved',
  'sent',
  'revision_requested',
  'accepted',
  'rejected',
]

/** @type {QuoteVersionStatus[]} */
export const QUOTE_VERSION_STATUSES = ['draft', 'approved', 'sent', 'superseded', 'decided']

/** @type {QuoteLineItemKind[]} */
export const QUOTE_LINE_ITEM_KINDS = [
  'material',
  'tooling',
  'labor',
  'operation',
  'logistics',
  'other',
]

export {}
