import { patchInquiry } from '../../domains/inquiries/mutations.js'
import { appendAuditEntry } from '../../domains/audit/mutations.js'

/**
 * Record VSM 1.3 feasibility outcome on an inquiry. Feasibility must be saved
 * before the offer can advance to technical review / costing tasks.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} inquiryId
 * @param {{ result: import('../../domains/inquiries/model.js').FeasibilityResult; note?: string; actorId?: string }} input
 */
export function recordFeasibility(db, inquiryId, input) {
  const inquiry = patchInquiry(db, inquiryId, {
    feasibilityResult: input.result,
    feasibilityNote: input.note,
    status: input.result === 'blocked' ? 'closed_rejected' : 'feasibility_done',
  })
  if (!inquiry) return { ok: /** @type {const} */ (false), code: 'not_found' }
  appendAuditEntry(db, {
    productId: inquiry.productId,
    entityType: 'inquiry',
    entityId: inquiry.id,
    action: 'inquiry.feasibilityRecorded',
    actorId: input.actorId,
    meta: { result: input.result, note: input.note },
  })
  return { ok: /** @type {const} */ (true), inquiry }
}
