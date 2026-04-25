import {
  appendQuote,
  appendQuoteVersion,
  appendQuoteLineItem,
  buildQuoteVersion,
  clearQuoteLineItems,
  patchQuote,
  patchQuoteVersion,
} from '../../domains/quotations/mutations.js'
import {
  selectQuoteById,
  selectQuoteVersionById,
  selectQuoteVersions,
  selectQuoteLineItems,
} from '../../domains/quotations/selectors.js'
import { appendAuditEntry } from '../../domains/audit/mutations.js'
import { evaluateQuotationTaskReadiness } from '../quotations/quotationAutomationService.js'

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {{ productId: string; clientId: string; inquiryId?: string; language?: string; currency?: import('../../domains/quotations/model.js').QuoteCurrency; actorId?: string }} input
 */
export function ensureQuoteForProduct(db, input) {
  const existing = db.quoteDrafts.find(
    (q) => q.productId === input.productId && q.clientId === input.clientId && q.status !== 'rejected',
  )
  if (existing) return existing
  const quote = appendQuote(db, {
    productId: input.productId,
    clientId: input.clientId,
    inquiryId: input.inquiryId,
    status: 'draft',
    language: input.language ?? 'en',
    currency: input.currency ?? 'EUR',
  })
  appendAuditEntry(db, {
    productId: input.productId,
    entityType: 'quote',
    entityId: quote.id,
    action: 'quote.created',
    actorId: input.actorId,
  })
  return quote
}

/**
 * Draft a new quote version. If the quote already has a sent version that the
 * customer asked to revise, the new version records `supersedesVersionId` so
 * history stays immutable.
 *
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {{
 *   quoteId: string
 *   lineItems: Array<Omit<import('../../domains/quotations/model.js').QuoteLineItem, 'id' | 'totalPrice' | 'quoteVersionId'>>
 *   marginPercent?: number
 *   unitPrice?: number
 *   toolingCost?: number
 *   leadTimeDays?: number
 *   validUntil?: string
 *   deliveryTerms?: string
 *   paymentTerms?: string
 *   moq?: number
 *   currency?: import('../../domains/quotations/model.js').QuoteCurrency
 *   language?: string
 *   notes?: string
 *   actorId?: string
 * }} input
 */
export function draftQuoteVersion(db, input) {
  const quote = selectQuoteById(db, input.quoteId)
  if (!quote) return { ok: /** @type {const} */ (false), code: 'not_found' }

  const readiness = evaluateQuotationTaskReadiness(db, {
    quoteId: input.quoteId,
    productId: quote.productId,
  })
  if (!readiness.ready) {
    return { ok: /** @type {const} */ (false), code: 'tasks_incomplete', pendingKeys: readiness.pendingKeys }
  }

  const existingVersions = selectQuoteVersions(db, input.quoteId)
  const lastSent = [...existingVersions].reverse().find((v) => v.status === 'sent')
  const nextVersionNo = existingVersions.reduce((max, v) => Math.max(max, v.versionNo), 0) + 1

  const subtotal = input.lineItems.reduce(
    (sum, li) => sum + Math.round(li.quantity * li.unitPrice * 100) / 100,
    0,
  )

  const version = buildQuoteVersion(quote.id, nextVersionNo, {
    status: 'draft',
    subtotal,
    marginPercent: input.marginPercent ?? quote.marginPercent,
    unitPrice: input.unitPrice,
    toolingCost: input.toolingCost,
    leadTimeDays: input.leadTimeDays,
    validUntil: input.validUntil,
    deliveryTerms: input.deliveryTerms,
    paymentTerms: input.paymentTerms,
    moq: input.moq,
    currency: input.currency ?? quote.currency ?? 'EUR',
    language: input.language ?? quote.language ?? 'en',
    supersedesVersionId: lastSent?.id,
    notes: input.notes,
  })
  appendQuoteVersion(db, version)
  input.lineItems.forEach((li) =>
    appendQuoteLineItem(db, {
      quoteVersionId: version.id,
      kind: li.kind,
      description: li.description,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
    }),
  )
  if (lastSent) {
    patchQuoteVersion(db, lastSent.id, { status: 'superseded' })
  }
  patchQuote(db, quote.id, {
    status: 'draft',
    subtotal,
    currentVersionId: version.id,
    currentVersionNo: nextVersionNo,
    unitPrice: input.unitPrice,
    leadTimeDays: input.leadTimeDays,
    validUntil: input.validUntil,
    deliveryTerms: input.deliveryTerms,
    paymentTerms: input.paymentTerms,
    moq: input.moq,
    marginPercent: input.marginPercent ?? quote.marginPercent,
  })
  appendAuditEntry(db, {
    productId: quote.productId,
    entityType: 'quoteVersion',
    entityId: version.id,
    action: 'quote.drafted',
    actorId: input.actorId,
    meta: { versionNo: nextVersionNo, subtotal },
  })
  return { ok: /** @type {const} */ (true), quote, version }
}

/**
 * Replace the line items for a still-draft version. Sent versions are
 * immutable and this call will fail with `version_locked`.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} versionId
 * @param {Array<Omit<import('../../domains/quotations/model.js').QuoteLineItem, 'id' | 'totalPrice' | 'quoteVersionId'>>} lineItems
 * @param {string} [actorId]
 */
export function replaceLineItems(db, versionId, lineItems, actorId) {
  const version = selectQuoteVersionById(db, versionId)
  if (!version) return { ok: /** @type {const} */ (false), code: 'not_found' }
  if (version.status !== 'draft') return { ok: /** @type {const} */ (false), code: 'version_locked' }
  clearQuoteLineItems(db, versionId)
  lineItems.forEach((li) =>
    appendQuoteLineItem(db, {
      quoteVersionId: versionId,
      kind: li.kind,
      description: li.description,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
    }),
  )
  const subtotal = (db.quoteLineItems ?? [])
    .filter((li) => li.quoteVersionId === versionId)
    .reduce((sum, li) => sum + li.totalPrice, 0)
  patchQuoteVersion(db, versionId, { subtotal })
  const quote = selectQuoteById(db, version.quoteId)
  if (quote) patchQuote(db, quote.id, { subtotal })
  appendAuditEntry(db, {
    productId: quote?.productId ?? '',
    entityType: 'quoteVersion',
    entityId: versionId,
    action: 'quote.lineItemsUpdated',
    actorId,
    meta: { subtotal },
  })
  return { ok: /** @type {const} */ (true) }
}

export { selectQuoteLineItems }
