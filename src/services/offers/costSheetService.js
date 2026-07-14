import {
  appendCostSheet,
  appendCostSheetLine,
  appendQuoteOfferLine,
  clearQuoteOfferLines,
  patchQuote,
  patchQuoteVersion,
} from '../../domains/quotations/mutations.js'
import {
  selectCostSheetByQuote,
  selectCostSheetByVersion,
  selectCostSheetsByVersion,
  selectCostSheetLines,
  selectCostCatalog,
  computeCostRollup,
  computeLineAmount,
  sheetNetKg,
  priceBreakRows,
  selectQuoteById,
  selectQuoteVersionById,
} from '../../domains/quotations/selectors.js'
import { selectProductById } from '../../domains/products/selectors.js'
import { appendAuditEntry } from '../../domains/audit/mutations.js'
import { draftQuoteVersion } from './quoteVersioningService.js'
import { ensureToolingOffer } from './toolingOfferService.js'

/**
 * The starter rows a fresh cost sheet is seeded with — one representative line
 * per group, mirroring the «бланка» template so the engineer starts from a
 * recognisable structure instead of a blank form. Each references a catalog
 * entry so its driver columns and default rate are pre-filled.
 */
const STARTER_CATALOG_REFS = [
  'cc-mat-01', // Метали тръби
  'cc-mat-09', // Покритие - прахова боя
  'cc-mat-20', // Опаковки - кашон, кутия
  'cc-mat-25', // Енергия, горива (linked to net weight)
  'cc-op-03',  // Пресоване
  'cc-op-09',  // Заваряване ръчно
  'cc-bur-03', // режийни и подръжка
  'cc-bur-07', // финансови
  'cc-tool-03', // формоващи за преси
  'cc-log-03', // Транспорт до клиента с пълен камион
]

/**
 * Build a cost-sheet line from a catalog entry, copying its driver + defaults.
 * @param {string} costSheetId
 * @param {import('../../domains/quotations/model.js').CostCatalogEntry} entry
 */
export function lineFromCatalog(costSheetId, entry) {
  return {
    costSheetId,
    group: entry.group,
    driver: entry.driver,
    description: entry.label,
    catalogRefId: entry.id,
    ...entry.defaults,
  }
}

/**
 * Find the working cost sheet for a quote, creating and seeding one if needed.
 * The sheet is *always editable* regardless of the quote/version status — it is
 * the live calculation, decoupled from the immutable version snapshots.
 *
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {{
 *   quoteId: string
 *   productId: string
 *   currency?: import('../../domains/quotations/model.js').QuoteCurrency
 *   marginPercent?: number
 *   annualQty?: number
 *   quantities?: number[]
 *   seed?: boolean
 *   actorId?: string
 * }} input
 */
function seedStarterLines(db, sheetId) {
  const catalog = selectCostCatalog(db)
  for (const ref of STARTER_CATALOG_REFS) {
    const entry = catalog.find((c) => c.id === ref)
    if (entry) appendCostSheetLine(db, lineFromCatalog(sheetId, entry))
  }
}

function seedPriceBreaks(quantities, marginPercent) {
  const qtys = [...new Set((quantities ?? []).filter((q) => Number(q) > 0))].sort((a, b) => a - b)
  return qtys.length >= 2 ? qtys.map((q, i) => ({ id: `qb-seed-${i}`, qty: q, marginPercent: marginPercent ?? 10 })) : []
}

/**
 * Create a new cost sheet for a product under a quote (a quote can have several
 * — one per product in a multi-product offer).
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {{ quoteId: string; productId?: string; productLabel?: string; currency?: any; marginPercent?: number; annualQty?: number; quantities?: number[]; seed?: boolean }} input
 */
export function addProductCostSheet(db, input) {
  const product = input.productId ? selectProductById(db, input.productId) : undefined
  const sheet = appendCostSheet(db, {
    quoteId: input.quoteId,
    quoteVersionId: input.quoteVersionId,
    productId: input.productId,
    productLabel: input.productLabel ?? product?.name,
    productDescription: input.productDescription ?? product?.description,
    currency: input.currency ?? 'EUR',
    marginPercent: input.marginPercent ?? 10,
    annualQty: input.annualQty,
    toolingMode: 'amortise',
    amortisationUnits: input.annualQty || 10000,
    priceBreaks: seedPriceBreaks(input.quantities, input.marginPercent),
  })
  if (input.seed !== false) seedStarterLines(db, sheet.id)
  return sheet
}

export function ensureCostSheet(db, input) {
  const existing = selectCostSheetByQuote(db, input.quoteId)
  if (existing) return existing
  const sheet = addProductCostSheet(db, input)
  appendAuditEntry(db, {
    productId: input.productId,
    entityType: 'costSheet',
    entityId: sheet.id,
    action: 'costSheet.created',
    actorId: input.actorId,
  })
  return sheet
}

/**
 * Snapshot the current cost sheet into a new immutable quote version. Each
 * group line becomes a per-unit QuoteLineItem (qty 1 × computed amount) so the
 * existing offer document / preview keep working; the version's subtotal is the
 * product cost price (себестойност) and its unit price is the delivered (DAP)
 * sell price. Editing the sheet afterwards never mutates this snapshot —
 * the next draft creates the next version.
 *
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {{ quoteId: string; inquiryId?: string; clientId?: string; productId?: string; actorId?: string }} input
 */
export function draftVersionFromCostSheet(db, input) {
  // Snapshot the current version's sheet when one exists; otherwise the
  // (legacy) quote-level sheet for the very first version.
  const quote0 = selectQuoteById(db, input.quoteId)
  const currentVersion = quote0?.currentVersionId
    ? selectQuoteVersionById(db, quote0.currentVersionId)
    : undefined
  const sheet =
    (currentVersion && selectCostSheetByVersion(db, currentVersion)) ||
    selectCostSheetByQuote(db, input.quoteId)
  if (!sheet) return { ok: /** @type {const} */ (false), code: 'no_cost_sheet' }

  const lines = selectCostSheetLines(db, sheet.id)
  const rollup = computeCostRollup(sheet, lines)
  const netKg = sheetNetKg(lines)
  const costBase = rollup.groups.material + rollup.groups.operation

  /** Cost-price + logistics lines, snapshotted as per-unit QuoteLineItems. */
  const snapshotLines = lines
    .filter((l) => l.group !== 'tooling')
    .map((l) => ({
      kind: l.group,
      description: l.note ? `${l.description || l.group} — ${l.note}` : (l.description || l.group),
      quantity: 1,
      unitPrice: computeLineAmount(l, { netKg, costBase }),
    }))
    .filter((li) => li.unitPrice !== 0)

  // Amortised tooling contributes a per-unit burden line; separately-billed
  // tooling is carried as the version's one-off toolingCost instead.
  if (sheet.toolingMode === 'amortise' && rollup.toolingPerUnit > 0) {
    snapshotLines.push({
      kind: 'tooling',
      description: sheet.amortisationMode === 'cost'
        ? `Tooling amortised (${rollup.toolingTotal} over cost base ${sheet.amortisationCost || 0})`
        : `Tooling amortised (${rollup.toolingTotal} ÷ ${sheet.amortisationUnits || 0})`,
      quantity: 1,
      unitPrice: rollup.toolingPerUnit,
    })
  }

  const res = draftQuoteVersion(db, {
    quoteId: input.quoteId,
    lineItems: snapshotLines,
    marginPercent: sheet.marginPercent,
    unitPrice: Math.round(rollup.dap * 100) / 100,
    toolingCost: rollup.toolingTotal,
    currency: sheet.currency,
    notes: sheet.notes,
    actorId: input.actorId,
  })
  if (!res.ok) return res

  // Pin the version's subtotal to the true cost price (excl. logistics), then
  // mirror onto the quote header so list views read consistently.
  patchQuoteVersion(db, res.version.id, { subtotal: rollup.costPrice })
  patchQuote(db, input.quoteId, { subtotal: rollup.costPrice })

  appendAuditEntry(db, {
    productId: sheet.productId,
    entityType: 'quoteVersion',
    entityId: res.version.id,
    action: 'quote.drafted',
    actorId: input.actorId,
    meta: { source: 'costSheet', costPrice: rollup.costPrice, dap: rollup.dap },
  })
  return res
}

/**
 * Assign a customer-facing offer number (OF-YYYY-####) to a quote the first
 * time it's needed; reused across all its versions/revisions.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} quoteId
 */
export function ensureOfferNo(db, quoteId) {
  const quote = selectQuoteById(db, quoteId)
  if (!quote) return undefined
  if (quote.offerNo) return quote.offerNo
  const year = new Date().getFullYear()
  const seq = (db.quoteDrafts ?? []).filter((q) => q.offerNo).length + 1
  const offerNo = `OF-${year}-${String(seq).padStart(4, '0')}`
  patchQuote(db, quoteId, { offerNo })
  return offerNo
}

/**
 * Generate the offer's quantity → price matrix from the cost sheet: one offer
 * line per quantity tier, each carrying EXW and DAP unit prices. Replaces the
 * version's existing offer lines. This is the "requested quantities → priced
 * offer" automation.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} versionId
 */
export function generateOfferMatrix(db, versionId) {
  const version = selectQuoteVersionById(db, versionId)
  if (!version) return { ok: /** @type {const} */ (false), code: 'not_found' }
  const quote0 = selectQuoteById(db, version.quoteId)
  const inquiry = (db.inquiries ?? []).find((i) => i.id === quote0?.inquiryId)
  const pf = inquiry?.productFeasibility ?? {}
  // Only feasible products are offered — exclude any marked "blocked".
  // Use the version's own sheets so each offer prices from its own calculation.
  const sheets = selectCostSheetsByVersion(db, version).filter((s) => pf[s.productId] !== 'blocked')
  if (!sheets.length) return { ok: /** @type {const} */ (false), code: 'no_cost_sheet' }

  ensureOfferNo(db, version.quoteId)

  // Default the offer validity to 30 days out if not set yet.
  if (!version.validUntil) {
    const base = new Date(version.orderDate || version.createdAt || Date.now())
    base.setDate(base.getDate() + 30)
    patchQuoteVersion(db, versionId, { validUntil: base.toISOString().slice(0, 10) })
  }

  // "First batch": no earlier version of this quote has been sent yet. Used by
  // the "first batch separate, then in price" tooling option.
  const isFirstBatch = !(db.quoteVersions ?? []).some(
    (v) => v.quoteId === version.quoteId && v.id !== version.id && v.sentAt,
  )

  // One offer line per (product × quantity tier), across every product sheet.
  clearQuoteOfferLines(db, versionId)
  let sort = 0
  let count = 0
  for (const sheet of sheets) {
    const rollup = computeCostRollup(sheet, selectCostSheetLines(db, sheet.id))
    // Resolve the effective display. 'first_batch' = a separate one-off line on
    // the first batch, then blended into the unit price on later batches.
    const display = sheet.amortiseDisplay ?? 'blended'
    const effectiveDisplay = display === 'first_batch' ? (isFirstBatch ? 'line' : 'blended') : display
    // Tooling handling: blended keeps it in the unit price; 'line' and 'separate'
    // exclude it from the unit price (shown as a line / its own offer).
    const blended = sheet.toolingMode === 'amortise' && effectiveDisplay !== 'line'
    const baseCostPrice = blended ? rollup.costPrice : rollup.costPriceExclTooling
    let rows = priceBreakRows(rollup, sheet.priceBreaks, baseCostPrice)
    if (!rows.length) {
      const exw = baseCostPrice * (1 + (Number(sheet.marginPercent) || 0) / 100)
      rows = [{ qty: sheet.amortisationUnits || 1, exw, dap: exw + rollup.logistics }]
    }
    const product = sheet.productId ? selectProductById(db, sheet.productId) : undefined
    const label = sheet.productLabel || product?.name || ''
    for (const r of rows) {
      appendQuoteOfferLine(db, {
        quoteVersionId: versionId,
        productId: sheet.productId,
        description: label,
        requirements: sheet.productDescription || product?.description || undefined,
        uom: product?.uom,
        requestedQty: r.qty,
        unitPrice: Math.round(r.dap * 10000) / 10000,
        exwUnitPrice: Math.round(r.exw * 10000) / 10000,
        sortOrder: sort++,
      })
      count++
    }
    // Amortise + "separate line" (or first batch): one-off tooling line here.
    if (sheet.toolingMode === 'amortise' && effectiveDisplay === 'line' && rollup.toolingTotal > 0) {
      const oneOff = Math.round(rollup.toolingTotal * 100) / 100
      appendQuoteOfferLine(db, {
        quoteVersionId: versionId,
        productId: sheet.productId,
        description: version.language === 'bg' ? 'Инструменти' : 'Tooling',
        uom: version.language === 'bg' ? 'еднократно' : 'one-off',
        requestedQty: 1,
        unitPrice: oneOff,
        exwUnitPrice: oneOff,
        isOneOff: true,
        sortOrder: sort++,
      })
      count++
    }
  }
  // Billed-separately tooling → its own linked offer (not a line here).
  ensureToolingOffer(db, version.quoteId)
  return { ok: /** @type {const} */ (true), count }
}

export { computeCostRollup, selectCostSheetByQuote, selectCostSheetLines }
