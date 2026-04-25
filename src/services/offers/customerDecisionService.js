import {
  appendQuoteDecision,
  patchQuote,
  patchQuoteVersion,
} from '../../domains/quotations/mutations.js'
import {
  selectQuoteById,
  selectQuoteVersionByToken,
  selectQuoteVersionById,
} from '../../domains/quotations/selectors.js'
import { appendAuditEntry } from '../../domains/audit/mutations.js'
import { attemptPhaseTransition } from '../lifecycle/phaseTransitionService.js'

/**
 * Resolve a public acceptance token to the associated quote context, without
 * exposing internal ids. Used by the public acceptance page to render the
 * offer for the customer.
 *
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} token
 */
export function resolveAcceptanceToken(db, token) {
  const version = selectQuoteVersionByToken(db, token)
  if (!version) return null
  const quote = selectQuoteById(db, version.quoteId)
  if (!quote) return null
  return { quote, version, token }
}

/**
 * Record a customer decision captured on the public acceptance page. When the
 * customer accepts, the phase transition service is attempted so the product
 * moves from `concept` (Запитване) to `design` (Внедряване).
 *
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {{ token: string; decision: import('../../domains/quotations/model.js').QuoteDecisionOutcome; customerContactName?: string; customerContactEmail?: string; comment?: string }} input
 */
export function submitCustomerDecision(db, input) {
  const resolved = resolveAcceptanceToken(db, input.token)
  if (!resolved) return { ok: /** @type {const} */ (false), code: 'invalid_token' }
  const { quote, version } = resolved
  if (version.status === 'decided' || version.status === 'superseded') {
    return { ok: /** @type {const} */ (false), code: 'already_decided' }
  }
  if (version.status !== 'sent') {
    return { ok: /** @type {const} */ (false), code: 'not_sent' }
  }

  const decision = appendQuoteDecision(db, {
    quoteVersionId: version.id,
    decision: input.decision,
    customerContactName: input.customerContactName,
    customerContactEmail: input.customerContactEmail,
    comment: input.comment,
    token: input.token,
  })
  patchQuoteVersion(db, version.id, { status: 'decided' })

  let quoteStatus = quote.status
  let phaseResult = null
  if (input.decision === 'accepted') {
    quoteStatus = 'accepted'
    phaseResult = attemptPhaseTransition(db, quote.productId, 'design')
  } else if (input.decision === 'revision_requested') {
    quoteStatus = 'revision_requested'
  } else if (input.decision === 'rejected') {
    quoteStatus = 'rejected'
  }
  patchQuote(db, quote.id, { status: quoteStatus })

  appendAuditEntry(db, {
    productId: quote.productId,
    entityType: 'quoteDecision',
    entityId: decision.id,
    action: `quote.customer.${input.decision}`,
    actorLabel: input.customerContactName ?? input.customerContactEmail ?? 'customer',
    meta: {
      comment: input.comment,
      phaseTransition: phaseResult ? { ok: phaseResult.ok, code: phaseResult.code } : undefined,
    },
  })

  return {
    ok: /** @type {const} */ (true),
    decision,
    version,
    quote,
    phaseResult,
  }
}

export { selectQuoteVersionById }
