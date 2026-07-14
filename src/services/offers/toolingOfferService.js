import {
  appendQuote,
  appendQuoteVersion,
  buildQuoteVersion,
  appendQuoteOfferLine,
  clearQuoteOfferLines,
  patchQuote,
  patchQuoteVersion,
} from '../../domains/quotations/mutations.js'
import {
  selectQuoteById,
  selectQuoteVersions,
  selectQuoteVersionById,
  selectCostSheetsByVersion,
  selectCostSheetLines,
  computeCostRollup,
} from '../../domains/quotations/selectors.js'
import { selectProductById } from '../../domains/products/selectors.js'
import { appendAuditEntry } from '../../domains/audit/mutations.js'

/** Assign an offer number to a tooling quote (mirrors ensureOfferNo; inlined to avoid a cycle). */
function ensureToolingOfferNo(db, quote) {
  if (quote.offerNo) return quote.offerNo
  const year = new Date().getFullYear()
  const seq = (db.quoteDrafts ?? []).filter((q) => q.offerNo).length + 1
  const offerNo = `OF-${year}-${String(seq).padStart(4, '0')}`
  patchQuote(db, quote.id, { offerNo })
  return offerNo
}

/**
 * Ensure a linked, separately-billed **tooling offer** exists and reflects the
 * separate-mode tooling totals of the goods version. One offer line per
 * separate-mode product sheet. No-op (and nothing created) when there is no
 * separately-billed tooling.
 *
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} goodsQuoteId
 * @param {string} [actorId]
 */
export function ensureToolingOffer(db, goodsQuoteId, actorId) {
  const goods = selectQuoteById(db, goodsQuoteId)
  if (!goods) return { ok: /** @type {const} */ (false), code: 'not_found' }
  const goodsVersion = goods.currentVersionId ? selectQuoteVersionById(db, goods.currentVersionId) : undefined
  if (!goodsVersion) return { ok: /** @type {const} */ (false), code: 'no_version' }

  // Separate-mode tooling per product sheet.
  const sheets = selectCostSheetsByVersion(db, goodsVersion)
    .filter((s) => s.toolingMode === 'separate')
    .map((s) => ({ sheet: s, total: computeCostRollup(s, selectCostSheetLines(db, s.id)).toolingTotal }))
    .filter((x) => x.total > 0)

  let tooling = (db.quoteDrafts ?? []).find((q) => q.parentQuoteId === goods.id && q.kind === 'tooling')

  if (sheets.length === 0) {
    return { ok: /** @type {const} */ (true), tooling: tooling ?? null, total: 0 }
  }

  // Create the tooling quote + a draft version on first need.
  if (!tooling) {
    tooling = appendQuote(db, {
      productId: goods.productId,
      clientId: goods.clientId,
      status: 'draft',
      currency: goods.currency,
      language: goods.language,
      kind: 'tooling',
      parentQuoteId: goods.id,
    })
    const v = appendQuoteVersion(db, buildQuoteVersion(tooling.id, 1, { status: 'draft', currency: goods.currency, language: goods.language }))
    patchQuote(db, tooling.id, { currentVersionId: v.id, currentVersionNo: 1 })
    appendAuditEntry(db, { productId: goods.productId, entityType: 'quote', entityId: tooling.id, action: 'quote.toolingCreated', actorId, meta: { parentQuoteId: goods.id } })
  }
  ensureToolingOfferNo(db, tooling)

  const tv = selectQuoteVersions(db, tooling.id).slice(-1)[0]
  if (!tv) return { ok: /** @type {const} */ (false), code: 'no_version' }

  // Refresh the tooling offer's lines from the separate-mode sheets.
  clearQuoteOfferLines(db, tv.id)
  let sort = 0
  let total = 0
  for (const { sheet, total: t } of sheets) {
    const product = sheet.productId ? selectProductById(db, sheet.productId) : undefined
    const label = sheet.productLabel || product?.name || ''
    const amount = Math.round(t * 100) / 100
    total += amount
    appendQuoteOfferLine(db, {
      quoteVersionId: tv.id,
      productId: sheet.productId,
      description: `${label} — ${tv.language === 'bg' ? 'Оснастка' : 'Tooling'}`,
      requestedQty: 1,
      unitPrice: amount,
      exwUnitPrice: amount,
      isOneOff: true,
      sortOrder: sort++,
    })
  }
  patchQuoteVersion(db, tv.id, { subtotal: total })
  patchQuote(db, tooling.id, { subtotal: total })
  return { ok: /** @type {const} */ (true), tooling, total }
}
