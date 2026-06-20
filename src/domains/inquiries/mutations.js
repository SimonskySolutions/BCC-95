import { INTAKE_REQUIREMENTS } from './model.js'

let idCounter = 20000

/**
 * @typedef {Object} InquiryCreateInput
 * @property {string} productId
 * @property {string} customerId
 * @property {import('./model.js').InquiryChannel} channel
 * @property {string} [summary]
 * @property {number} [requestedQuantity]
 * @property {string} [requestedDeadline]
 * @property {string} [specificationNote]
 * @property {string} [customerContactName]
 * @property {string} [customerContactEmail]
 * @property {import('./model.js').InquiryAttachment[]} [attachments]
 * @property {boolean} [noAttachments]
 */

/**
 * Compute missing intake fields based on the documented Phase 1.1 requirements:
 * drawings, quantity, deadline, specifications, customer requirements.
 * An inquiry explicitly marked "no files provided" satisfies the drawings check.
 * @param {import('./model.js').Inquiry} inquiry
 * @returns {import('./model.js').IntakeRequirement[]}
 */
export function computeMissingIntakeFields(inquiry) {
  const missing = /** @type {import('./model.js').IntakeRequirement[]} */ ([])
  const hasDrawing = (inquiry.attachments ?? []).some((att) => att.kind === 'drawing')
  if (!hasDrawing && !inquiry.noAttachments) missing.push('drawings')
  if (!inquiry.requestedQuantity || inquiry.requestedQuantity <= 0) missing.push('quantity')
  if (!inquiry.requestedDeadline) missing.push('deadline')
  if (!inquiry.specificationNote?.trim()) missing.push('specifications')
  if (!inquiry.customerContactName?.trim()) missing.push('customerRequirements')
  return missing
}

/**
 * @param {InquiryCreateInput} input
 * @param {string} [id]
 * @returns {import('./model.js').Inquiry}
 */
export function createInquiryDraft(input, id) {
  const inquiryId = id ?? `inq-${++idCounter}`
  const inquiry = /** @type {import('./model.js').Inquiry} */ ({
    id: inquiryId,
    productId: input.productId,
    customerId: input.customerId,
    receivedAt: new Date().toISOString(),
    channel: input.channel,
    status: 'received',
    summary: input.summary,
    requestedQuantity: input.requestedQuantity,
    requestedDeadline: input.requestedDeadline,
    specificationNote: input.specificationNote,
    customerContactName: input.customerContactName,
    customerContactEmail: input.customerContactEmail,
    attachments: input.attachments ?? [],
    noAttachments: input.noAttachments ?? false,
  })
  inquiry.missingFields = computeMissingIntakeFields(inquiry)
  inquiry.status = inquiry.missingFields.length === 0 ? 'intake_complete' : 'intake_pending'
  return inquiry
}

/**
 * @param {{ inquiries: import('./model.js').Inquiry[] }} db
 * @param {import('./model.js').Inquiry} inquiry
 */
export function appendInquiry(db, inquiry) {
  db.inquiries.push(inquiry)
}

/**
 * @param {{ inquiries: import('./model.js').Inquiry[] }} db
 * @param {string} inquiryId
 * @param {Partial<import('./model.js').Inquiry>} patch
 * @returns {import('./model.js').Inquiry | null}
 */
export function patchInquiry(db, inquiryId, patch) {
  const idx = db.inquiries.findIndex((i) => i.id === inquiryId)
  if (idx < 0) return null
  db.inquiries[idx] = { ...db.inquiries[idx], ...patch }
  db.inquiries[idx].missingFields = computeMissingIntakeFields(db.inquiries[idx])
  return db.inquiries[idx]
}

/** @readonly */
export { INTAKE_REQUIREMENTS }
