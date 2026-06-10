import {
  appendQuoteApproval,
  patchQuote,
  patchQuoteVersion,
} from '../../domains/quotations/mutations.js'
import {
  selectQuoteById,
  selectQuoteVersionById,
  selectQuoteLineItems,
} from '../../domains/quotations/selectors.js'
import { appendAuditEntry } from '../../domains/audit/mutations.js'

/**
 * Manager approval gate (VSM 1.4) before sending the offer. Only a `draft`
 * version may be approved; approvals transition the version to `approved`,
 * which is the prerequisite for `quoteSendService.sendOffer`.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {{ quoteVersionId: string; approverEmployeeId: string; decision: 'approved' | 'rejected'; note?: string }} input
 */
export function submitApproval(db, input) {
  const version = selectQuoteVersionById(db, input.quoteVersionId)
  if (!version) return { ok: /** @type {const} */ (false), code: 'not_found' }
  if (version.status !== 'draft') {
    return { ok: /** @type {const} */ (false), code: 'invalid_state', message: 'Only a draft version can be approved' }
  }

  // Soft role gate until real auth: only designated approvers, and never the
  // employee who drafted the version (GS stamped a distinct ConfirmUser).
  const approver = db.employees.find((e) => e.id === input.approverEmployeeId)
  if (!approver?.canApproveQuotes) {
    return {
      ok: /** @type {const} */ (false),
      code: 'not_approver',
      message: 'Selected employee is not authorised to approve offers',
    }
  }
  if (version.createdBy && version.createdBy === input.approverEmployeeId) {
    return {
      ok: /** @type {const} */ (false),
      code: 'self_approval',
      message: 'The author of the offer cannot approve it',
    }
  }

  if (input.decision === 'approved') {
    const lines = selectQuoteLineItems(db, version.id)
    if (lines.length === 0 || version.subtotal <= 0) {
      return {
        ok: /** @type {const} */ (false),
        code: 'missing_fields',
        message: 'Add line items and subtotal before approval',
      }
    }
    if (!version.leadTimeDays || !version.validUntil) {
      return {
        ok: /** @type {const} */ (false),
        code: 'missing_fields',
        message: 'Lead time and validity are required',
      }
    }
  }

  const approval = appendQuoteApproval(db, {
    quoteVersionId: version.id,
    approverEmployeeId: input.approverEmployeeId,
    decision: input.decision,
    note: input.note,
  })

  const quote = selectQuoteById(db, version.quoteId)
  if (input.decision === 'approved') {
    patchQuoteVersion(db, version.id, { status: 'approved' })
    if (quote) patchQuote(db, quote.id, { status: 'pending_approval' })
    appendAuditEntry(db, {
      productId: quote?.productId ?? '',
      entityType: 'quoteApproval',
      entityId: approval.id,
      action: 'quote.approved',
      actorId: input.approverEmployeeId,
    })
  } else {
    if (quote) patchQuote(db, quote.id, { status: 'draft' })
    appendAuditEntry(db, {
      productId: quote?.productId ?? '',
      entityType: 'quoteApproval',
      entityId: approval.id,
      action: 'quote.approvalRejected',
      actorId: input.approverEmployeeId,
      meta: { note: input.note },
    })
  }

  return { ok: /** @type {const} */ (true), approval, version }
}
