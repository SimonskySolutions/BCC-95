/**
 * Phase 1 sub-state machine that guards the offer process and keeps users on
 * the documented flow: Запитване -> Оценка за изпълнимост -> Технически преглед
 * -> Калкулация -> Оферта (версия) -> Одобрение -> Изпращане -> Решение на клиент.
 *
 * All state is derived from the current db snapshot — the machine never keeps
 * its own store — so every module reads consistent progress.
 */

import { selectInquiriesByProduct } from '../../domains/inquiries/selectors.js'
import {
  selectQuotesByProduct,
  selectQuoteVersions,
  selectQuoteApprovals,
  selectQuoteDecision,
} from '../../domains/quotations/selectors.js'
import { mandatoryQuotationTaskKeysForProduct } from '../quotations/quotationAutomationService.js'

/**
 * @typedef {(
 *   'inquiry_received' |
 *   'intake_complete' |
 *   'feasibility_done' |
 *   'tech_review_done' |
 *   'costing_done' |
 *   'quote_drafted' |
 *   'approved' |
 *   'sent' |
 *   'decided_accepted' |
 *   'decided_revision' |
 *   'decided_rejected'
 * )} OfferStepId
 */

/** @type {OfferStepId[]} */
export const OFFER_STEP_ORDER = [
  'inquiry_received',
  'intake_complete',
  'feasibility_done',
  'tech_review_done',
  'costing_done',
  'quote_drafted',
  'approved',
  'sent',
  'decided_accepted',
]

/**
 * Compute where the product currently is in the Phase 1 offer sub-state.
 * Returns structured per-step completion plus next-allowed step and blockers.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} productId
 */
export function computeOfferProgress(db, productId) {
  const inquiries = selectInquiriesByProduct(db, productId)
  const inquiry = inquiries[inquiries.length - 1]
  const quotes = selectQuotesByProduct(db, productId)
  const activeQuote = quotes.find((q) => q.status !== 'accepted' && q.status !== 'rejected') ?? quotes[0]
  const versions = activeQuote ? selectQuoteVersions(db, activeQuote.id) : []
  const currentVersion = activeQuote?.currentVersionId
    ? versions.find((v) => v.id === activeQuote.currentVersionId)
    : versions[versions.length - 1]

  const requiredTaskKeys = mandatoryQuotationTaskKeysForProduct(productId)
  const quotationTasks = db.tasks.filter(
    (t) => t.productId === productId && t.workstream === 'quotation',
  )
  const resolvedSet = new Set(
    quotationTasks.filter((t) => t.status === 'resolved').map((t) => t.taskKey),
  )

  const approvals = currentVersion ? selectQuoteApprovals(db, currentVersion.id) : []
  const approval = approvals.find((a) => a.decision === 'approved')
  const decision = currentVersion ? selectQuoteDecision(db, currentVersion.id) : undefined

  const status = {
    inquiry_received: Boolean(inquiry),
    intake_complete: Boolean(inquiry && (inquiry.status === 'intake_complete' || inquiry.status === 'feasibility_done')),
    feasibility_done: Boolean(inquiry?.feasibilityResult && inquiry.feasibilityResult !== 'not_assessed'),
    tech_review_done: resolvedSet.has(requiredTaskKeys[0] ?? ''),
    costing_done: resolvedSet.has(requiredTaskKeys[1] ?? ''),
    quote_drafted: Boolean(currentVersion),
    approved: Boolean(approval),
    sent: Boolean(currentVersion?.sentAt),
    decided_accepted: decision?.decision === 'accepted',
    decided_revision: decision?.decision === 'revision_requested',
    decided_rejected: decision?.decision === 'rejected',
  }

  const completedSteps = OFFER_STEP_ORDER.filter((id) => status[id])
  const nextStep = OFFER_STEP_ORDER.find((id) => !status[id])

  /** @type {string[]} */
  const blockers = []
  if (nextStep === 'intake_complete' && (inquiry?.missingFields?.length ?? 0) > 0) {
    blockers.push(`intake:${(inquiry?.missingFields ?? []).join(',')}`)
  }
  if (nextStep === 'feasibility_done') blockers.push('feasibility:not_recorded')
  if (nextStep === 'tech_review_done') blockers.push(`task:${requiredTaskKeys[0]}`)
  if (nextStep === 'costing_done') blockers.push(`task:${requiredTaskKeys[1]}`)
  if (nextStep === 'quote_drafted') blockers.push('quote:no_version')
  if (nextStep === 'approved') blockers.push('quote:not_approved')
  if (nextStep === 'sent') blockers.push('quote:not_sent')
  if (nextStep === 'decided_accepted') blockers.push('customer:pending')

  return {
    productId,
    inquiry,
    activeQuote,
    currentVersion,
    decision,
    approval,
    status,
    completedSteps,
    nextStep,
    blockers,
  }
}

/**
 * Guard used by services to allow or block an offer action.
 * @param {ReturnType<typeof computeOfferProgress>} progress
 * @param {OfferStepId} target
 * @returns {{ ok: boolean; reason?: string }}
 */
export function canAdvanceTo(progress, target) {
  const idx = OFFER_STEP_ORDER.indexOf(target)
  for (let i = 0; i < idx; i += 1) {
    const prev = OFFER_STEP_ORDER[i]
    if (!progress.status[prev]) {
      return { ok: false, reason: `step_missing:${prev}` }
    }
  }
  return { ok: true }
}
