import {
  appendQuote,
  appendQuoteVersion,
  buildQuoteVersion,
  cloneCostSheetsToVersion,
  patchQuote,
  patchQuoteVersion,
} from '../../domains/quotations/mutations.js'
import {
  selectQuoteById,
  selectQuoteVersionById,
  selectQuoteVersions,
  selectCostSheetsByVersion,
} from '../../domains/quotations/selectors.js'
import { selectClientById } from '../../domains/crm/selectors.js'
import { appendAuditEntry } from '../../domains/audit/mutations.js'
import { generateOfferMatrix } from './costSheetService.js'

/** The version a quote is currently working on (current → newest). */
function currentVersionOf(db, quote) {
  if (quote.currentVersionId) {
    const v = selectQuoteVersionById(db, quote.currentVersionId)
    if (v) return v
  }
  const versions = selectQuoteVersions(db, quote.id)
  return versions[versions.length - 1]
}

/** Customer-facing header derived from a client (delivery address + contact). */
function headerFromClient(client) {
  if (!client) return {}
  const addr = client.addresses?.[0]
  const deliveryAddress = addr
    ? [addr.address, [addr.postCode, addr.city].filter(Boolean).join(' '), addr.country].filter(Boolean).join(', ')
    : [client.address, [client.postCode, client.city].filter(Boolean).join(' '), client.country].filter(Boolean).join(', ') || undefined
  const contact = client.contacts?.[0]
  return { deliveryAddress, contactPersonId: contact?.id, contactName: contact?.name, contactTitle: contact?.title }
}

/**
 * Reuse an offer as a template for another client (same product): a fresh draft
 * quote whose calculation is deep-copied from the source offer's current
 * version. The source is untouched.
 *
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {{ sourceQuoteId: string; targetClientId: string; actorId?: string }} input
 */
export function cloneQuoteToClient(db, input) {
  const source = selectQuoteById(db, input.sourceQuoteId)
  if (!source) return { ok: /** @type {const} */ (false), code: 'not_found' }
  const sourceVersion = currentVersionOf(db, source)

  const quote = appendQuote(db, {
    productId: source.productId,
    clientId: input.targetClientId,
    status: 'draft',
    currency: source.currency,
    language: source.language,
    marginPercent: source.marginPercent,
  })
  const version = appendQuoteVersion(
    db,
    buildQuoteVersion(quote.id, 1, {
      status: 'draft',
      currency: source.currency,
      language: source.language,
      ...headerFromClient(selectClientById(db, input.targetClientId)),
      orderDate: new Date().toISOString().slice(0, 10),
    }),
  )
  patchQuote(db, quote.id, { currentVersionId: version.id, currentVersionNo: 1 })

  if (sourceVersion) {
    cloneCostSheetsToVersion(db, selectCostSheetsByVersion(db, sourceVersion), {
      quoteId: quote.id,
      quoteVersionId: version.id,
    })
    generateOfferMatrix(db, version.id)
  }

  appendAuditEntry(db, {
    productId: source.productId,
    entityType: 'quote',
    entityId: quote.id,
    action: 'quote.clonedFrom',
    actorId: input.actorId,
    meta: { sourceQuoteId: source.id, targetClientId: input.targetClientId },
  })
  return { ok: /** @type {const} */ (true), quote, version }
}

/**
 * Open a new editable revision of an offer: a fresh draft version on the same
 * quote, with the calculation copied from the current version so the prior
 * (sent) offer stays immutable in history. The previous sent version is marked
 * superseded.
 *
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {{ quoteId: string; actorId?: string }} input
 */
export function reviseOffer(db, input) {
  const quote = selectQuoteById(db, input.quoteId)
  if (!quote) return { ok: /** @type {const} */ (false), code: 'not_found' }
  const versions = selectQuoteVersions(db, quote.id)
  const prev = versions[versions.length - 1]
  if (!prev) return { ok: /** @type {const} */ (false), code: 'no_version' }

  const nextNo = prev.versionNo + 1
  const version = appendQuoteVersion(
    db,
    buildQuoteVersion(quote.id, nextNo, {
      status: 'draft',
      currency: prev.currency,
      language: prev.language,
      supersedesVersionId: prev.status === 'sent' ? prev.id : prev.supersedesVersionId,
      contactPersonId: prev.contactPersonId,
      contactName: prev.contactName,
      contactTitle: prev.contactTitle,
      deliveryAddress: prev.deliveryAddress,
      orderDate: new Date().toISOString().slice(0, 10),
    }),
  )
  cloneCostSheetsToVersion(db, selectCostSheetsByVersion(db, prev), {
    quoteId: quote.id,
    quoteVersionId: version.id,
  })
  generateOfferMatrix(db, version.id)
  if (prev.status === 'sent') patchQuoteVersion(db, prev.id, { status: 'superseded' })
  patchQuote(db, quote.id, { status: 'draft', currentVersionId: version.id, currentVersionNo: nextNo })

  appendAuditEntry(db, {
    productId: quote.productId,
    entityType: 'quoteVersion',
    entityId: version.id,
    action: 'quote.revised',
    actorId: input.actorId,
    meta: { fromVersionNo: prev.versionNo, versionNo: nextNo },
  })
  return { ok: /** @type {const} */ (true), quote, version }
}
