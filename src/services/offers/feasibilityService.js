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

/** All product ids covered by an inquiry (primary + extras). */
export function inquiryProductIds(inquiry) {
  return [inquiry.productId, ...((inquiry.extraProducts ?? []).map((e) => e.productId).filter(Boolean))]
}

/**
 * Record feasibility for one product within a (possibly multi-product) inquiry,
 * then derive the inquiry-level summary so the offer progress gate still works:
 * feasible if any product is feasible, blocked if all are blocked.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} inquiryId
 * @param {string} productId
 * @param {import('../../domains/inquiries/model.js').FeasibilityResult} result
 * @param {string} [actorId]
 */
export function recordProductFeasibility(db, inquiryId, productId, result, actorId) {
  const inquiry = db.inquiries.find((i) => i.id === inquiryId)
  if (!inquiry) return { ok: /** @type {const} */ (false), code: 'not_found' }
  const pf = { ...(inquiry.productFeasibility ?? {}), [productId]: result }
  const vals = inquiryProductIds(inquiry).map((id) => pf[id] ?? 'not_assessed')
  // The step is only "done" once every product has been assessed.
  const anyNotAssessed = vals.some((v) => v === 'not_assessed')
  const anyFeasible = vals.some((v) => v === 'feasible' || v === 'feasible_with_conditions')
  const summary = anyNotAssessed ? 'not_assessed' : anyFeasible ? 'feasible' : 'blocked'
  patchInquiry(db, inquiryId, {
    productFeasibility: pf,
    feasibilityResult: summary,
    status: summary === 'blocked' ? 'closed_rejected' : summary === 'not_assessed' ? inquiry.status : 'feasibility_done',
  })
  appendAuditEntry(db, {
    productId,
    entityType: 'inquiry',
    entityId: inquiryId,
    action: 'inquiry.feasibilityRecorded',
    actorId,
    meta: { productId, result },
  })
  return { ok: /** @type {const} */ (true) }
}
