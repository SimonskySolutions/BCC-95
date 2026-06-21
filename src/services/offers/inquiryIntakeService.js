import {
  appendInquiry,
  computeMissingIntakeFields,
  createInquiryDraft,
  patchInquiry,
} from '../../domains/inquiries/mutations.js'
import { appendAuditEntry } from '../../domains/audit/mutations.js'
import { appendTask } from '../../domains/tasks/mutations.js'
import { mandatoryQuotationTaskKeysForProduct } from '../quotations/quotationAutomationService.js'

/**
 * Register a new inquiry, auto-create mandatory Phase 1 tasks (technical review
 * and costing) so the quote cannot be generated until the gates are resolved,
 * and write a process audit entry.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {import('../../domains/inquiries/mutations.js').InquiryCreateInput & { actorId?: string }} input
 */
/**
 * Create the two mandatory VSM gate tasks (technical review + costing) for a
 * product, if they don't already exist. Used per product so each product in a
 * multi-product inquiry gets its own gate tasks.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} productId
 * @param {string} [actorId]
 * @param {string} [productName]   — appended to the task titles so each product's tasks are identifiable
 */
export function ensureQuotationGateTasks(db, productId, actorId, productName) {
  const [techKey, costKey] = mandatoryQuotationTaskKeysForProduct(productId)
  const name = productName ?? db.products?.find((p) => p.id === productId)?.name ?? ''
  const suffix = name ? ` — ${name}` : ''
  const today = new Date().toISOString().slice(0, 10)
  const addIfMissing = (taskKey, title, assigneeId) => {
    const exists = db.tasks.some(
      (t) => t.productId === productId && t.taskKey === taskKey && t.workstream === 'quotation',
    )
    if (exists) return
    appendTask(db, {
      id: `auto-${taskKey}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      taskKey,
      title,
      assigneeId,
      productId,
      dueDate: today,
      status: 'draft',
      plannedYear: new Date().getFullYear(),
      plannedQuarter: /** @type {import('../../domains/tasks/model.js').PlannedQuarter} */ (
        `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`
      ),
      phaseId: 'concept',
      workstream: 'quotation',
      priority: 'high',
    })
  }
  const engineer = db.employees.find((e) => /engineer|engineering|технолог/i.test(e.role))
  const planner = db.employees.find((e) => /plan|планов/i.test(e.role))
  addIfMissing(techKey, `Technical review (VSM 1.3)${suffix}`, engineer?.id ?? db.employees[0]?.id)
  addIfMissing(costKey, `Costing rollup (VSM 1.4)${suffix}`, planner?.id ?? db.employees[0]?.id)
}

export function registerInquiry(db, input) {
  const inquiry = createInquiryDraft(input)
  appendInquiry(db, inquiry)

  ensureQuotationGateTasks(db, input.productId, input.actorId)

  appendAuditEntry(db, {
    productId: input.productId,
    entityType: 'inquiry',
    entityId: inquiry.id,
    action: 'inquiry.received',
    actorId: input.actorId,
    meta: { channel: input.channel },
  })
  if (inquiry.status === 'intake_complete') {
    appendAuditEntry(db, {
      productId: input.productId,
      entityType: 'inquiry',
      entityId: inquiry.id,
      action: 'inquiry.intakeComplete',
      actorId: input.actorId,
    })
  }
  return { ok: /** @type {const} */ (true), inquiry }
}

/**
 * Update an existing inquiry with additional intake info (drawings, quantities,
 * etc.) and re-evaluate the missing-fields checklist. Writes an audit entry
 * when intake becomes complete so the timeline reflects the transition.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} inquiryId
 * @param {Partial<import('../../domains/inquiries/model.js').Inquiry> & { actorId?: string }} patch
 */
export function updateInquiry(db, inquiryId, patch) {
  const before = db.inquiries.find((i) => i.id === inquiryId)
  if (!before) return { ok: /** @type {const} */ (false), code: 'not_found' }
  const { actorId, ...rest } = patch
  const updated = patchInquiry(db, inquiryId, rest)
  if (!updated) return { ok: /** @type {const} */ (false), code: 'not_found' }
  const wasIncomplete = before.status !== 'intake_complete' && before.status !== 'feasibility_done'
  if (wasIncomplete && updated.status === 'intake_complete') {
    appendAuditEntry(db, {
      productId: updated.productId,
      entityType: 'inquiry',
      entityId: updated.id,
      action: 'inquiry.intakeComplete',
      actorId,
    })
  }
  return { ok: /** @type {const} */ (true), inquiry: updated }
}

/**
 * Close an inquiry without advancing to offer.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} inquiryId
 * @param {string} reason
 * @param {string} [actorId]
 */
export function closeInquiryRejected(db, inquiryId, reason, actorId) {
  const inquiry = patchInquiry(db, inquiryId, {
    status: 'closed_rejected',
    closedReason: reason,
  })
  if (!inquiry) return { ok: /** @type {const} */ (false), code: 'not_found' }
  appendAuditEntry(db, {
    productId: inquiry.productId,
    entityType: 'inquiry',
    entityId: inquiry.id,
    action: 'inquiry.closedRejected',
    actorId,
    meta: { reason },
  })
  return { ok: /** @type {const} */ (true), inquiry }
}

export { computeMissingIntakeFields }
