import { selectQuoteById, selectQuoteVersionById, selectQuoteOfferLines, selectQuoteLineItems } from '../../domains/quotations/selectors.js'
import { appendClientOrder, appendOrderLine } from '../../domains/crm/mutations.js'
import { appendAuditEntry } from '../../domains/audit/mutations.js'

/**
 * Convert an accepted offer into a real client order — the equivalent of the
 * legacy GS `ConfirmCustomerOrder` step. Idempotent per quote: if an order
 * already references the quote, that order is returned instead of duplicating.
 *
 * Order lines are built from the customer-facing offer lines; if none exist
 * (older quotes), it falls back to the internal cost line items so an order is
 * still produced.
 *
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} quoteId
 * @returns {{ ok: false; code: string } | { ok: true; order: import('../../domains/crm/model.js').ClientOrder; created: boolean }}
 */
export function convertAcceptedOfferToOrder(db, quoteId) {
  const quote = selectQuoteById(db, quoteId)
  if (!quote) return { ok: false, code: 'quote_not_found' }
  if (quote.status !== 'accepted') return { ok: false, code: 'not_accepted' }

  const existing = (db.clientOrders ?? []).find((o) => o.quoteId === quoteId)
  if (existing) return { ok: true, order: existing, created: false }

  const version = quote.currentVersionId ? selectQuoteVersionById(db, quote.currentVersionId) : undefined

  const order = appendClientOrder(db, {
    clientId: quote.clientId,
    productId: quote.productId,
    status: 'open',
    quoteId,
  })

  const offerLines = version ? selectQuoteOfferLines(db, version.id) : []
  if (offerLines.length > 0) {
    for (const l of offerLines) {
      appendOrderLine(db, {
        orderId: order.id,
        description: l.description,
        qty: Number(l.confirmedQty ?? l.requestedQty) || 0,
        unitPrice: Number(l.unitPrice) || 0,
      })
    }
  } else if (version) {
    for (const li of selectQuoteLineItems(db, version.id)) {
      appendOrderLine(db, {
        orderId: order.id,
        description: li.description,
        qty: Number(li.quantity) || 0,
        unitPrice: Number(li.unitPrice) || 0,
      })
    }
  }

  appendAuditEntry(db, {
    productId: quote.productId,
    entityType: 'clientOrder',
    entityId: order.id,
    action: 'order.created_from_offer',
    actorLabel: 'system',
    meta: { quoteId, versionId: version?.id },
  })

  return { ok: true, order, created: true }
}
