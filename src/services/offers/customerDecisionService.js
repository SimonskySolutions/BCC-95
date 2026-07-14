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
import { appendNotification } from '../../domains/notifications/mutations.js'
import { attemptPhaseTransition } from '../lifecycle/phaseTransitionService.js'
import { reviseOffer } from './quoteCloneService.js'

/** Permissions that mark a user as a manager or sales rep (offer owners). */
const OFFER_OWNER_PERMS = ['*', 'offer.approve', 'offer.create', 'offer.send']

/**
 * Find the managers + sales reps who should be alerted about an offer event.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 */
function offerOwners(db) {
  return (db.employees ?? []).filter(
    (e) => e.active !== false && (e.permissions ?? []).some((p) => OFFER_OWNER_PERMS.includes(p)),
  )
}

/**
 * True when the offer's validity window has passed and the customer can no
 * longer act on it. A missing `validUntil` never expires.
 * @param {{ validUntil?: string | null }} version
 * @param {string} [today] ISO date (yyyy-mm-dd), defaults to now
 */
export function isOfferExpired(version, today = new Date().toISOString().slice(0, 10)) {
  return Boolean(version?.validUntil) && String(version.validUntil) < today
}

/**
 * Customer asks for a fresh offer after the current one expired (or otherwise).
 * Records the request against the quote, flags it for revision, and notifies
 * every manager and sales rep so it lands in the quotations workflow.
 *
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {{ token: string; customerContactName?: string; customerContactEmail?: string; comment?: string }} input
 */
export function requestNewOffer(db, input) {
  const resolved = resolveAcceptanceToken(db, input.token)
  if (!resolved) return { ok: /** @type {const} */ (false), code: 'invalid_token' }
  const { quote, version } = resolved

  const who = input.customerContactName || input.customerContactEmail || 'customer'
  patchQuote(db, quote.id, { status: 'revision_requested' })

  const decision = appendQuoteDecision(db, {
    quoteVersionId: version.id,
    decision: 'revision_requested',
    customerContactName: input.customerContactName,
    customerContactEmail: input.customerContactEmail,
    comment: input.comment,
    token: input.token,
    reason: 'expired_request_new',
  })

  appendAuditEntry(db, {
    productId: quote.productId,
    entityType: 'quoteDecision',
    entityId: decision.id,
    action: 'quote.customer.requestedNew',
    actorLabel: who,
    meta: { comment: input.comment, expiredVersionNo: version.versionNo, validUntil: version.validUntil },
  })

  const product = db.products.find((p) => p.id === quote.productId)
  const client = db.clients.find((c) => c.id === quote.clientId)
  const title = 'Customer requested a new offer'
  const body = `${client?.name ?? who} — ${product?.name ?? ''} (${quote.id} v${version.versionNo}, expired ${version.validUntil ?? ''})`
  const link = { page: 'offer-workspace', productId: quote.productId, quoteId: quote.id }
  const recipients = offerOwners(db)
  for (const u of recipients) {
    appendNotification(db, { userId: u.id, type: 'approval', title, body, link })
  }

  return { ok: /** @type {const} */ (true), decision, quote, version, notified: recipients.length }
}

/**
 * Resolve a public acceptance token to the associated quote context, without
 * exposing internal ids. Used by the public acceptance page to render the
 * offer for the customer.
 *
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} token
 */
export function resolveAcceptanceToken(db, token) {
  const tokenVersion = selectQuoteVersionByToken(db, token)
  if (!tokenVersion) return null
  const quote = selectQuoteById(db, tokenVersion.quoteId)
  if (!quote) return null
  // Always present the newest version actually sent to the customer, so an old
  // acceptance link reflects the latest re-sent offer (not the one the link was
  // originally minted for). Falls back to the token's own version.
  const sent = (db.quoteVersions ?? [])
    .filter((v) => v.quoteId === quote.id && v.sentAt)
    .sort((a, b) => String(a.sentAt).localeCompare(String(b.sentAt)))
  const version = sent[sent.length - 1] ?? tokenVersion
  return { quote, version, token, tokenVersion }
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

  // On a revision request, auto-open an editable draft revision (calc copied)
  // so staff land in a working offer rather than a locked, decided one.
  let revision = null
  if (input.decision === 'revision_requested') {
    const r = reviseOffer(db, { quoteId: quote.id })
    if (r.ok) {
      revision = r.version
      patchQuote(db, quote.id, { status: 'revision_requested' }) // reviseOffer set it to draft
    }
  }

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
    revision,
  }
}

export { selectQuoteVersionById }
