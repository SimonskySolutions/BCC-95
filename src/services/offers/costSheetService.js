import {
  appendCostSheet,
  appendCostSheetLine,
  patchQuote,
  patchQuoteVersion,
} from '../../domains/quotations/mutations.js'
import {
  selectCostSheetByQuote,
  selectCostSheetLines,
  selectCostCatalog,
  computeCostRollup,
  computeLineAmount,
  sheetNetKg,
} from '../../domains/quotations/selectors.js'
import { appendAuditEntry } from '../../domains/audit/mutations.js'
import { draftQuoteVersion } from './quoteVersioningService.js'

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
 *   seed?: boolean
 *   actorId?: string
 * }} input
 */
export function ensureCostSheet(db, input) {
  const existing = selectCostSheetByQuote(db, input.quoteId)
  if (existing) return existing

  const sheet = appendCostSheet(db, {
    quoteId: input.quoteId,
    productId: input.productId,
    currency: input.currency ?? 'EUR',
    marginPercent: input.marginPercent ?? 10,
    annualQty: input.annualQty,
    toolingMode: 'amortise',
    amortisationUnits: input.annualQty || 10000,
  })

  if (input.seed !== false) {
    const catalog = selectCostCatalog(db)
    for (const ref of STARTER_CATALOG_REFS) {
      const entry = catalog.find((c) => c.id === ref)
      if (entry) appendCostSheetLine(db, lineFromCatalog(sheet.id, entry))
    }
  }

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
  const sheet = selectCostSheetByQuote(db, input.quoteId)
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
      description: `Tooling amortised (${rollup.toolingTotal} ÷ ${sheet.amortisationUnits || 0})`,
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

export { computeCostRollup, selectCostSheetByQuote, selectCostSheetLines }
