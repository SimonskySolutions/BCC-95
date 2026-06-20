/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} quoteId
 */
export function selectQuoteById(db, quoteId) {
  return db.quoteDrafts.find((q) => q.id === quoteId)
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} productId
 */
export function selectQuotesByProduct(db, productId) {
  return db.quoteDrafts.filter((q) => q.productId === productId)
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} clientId
 */
export function selectQuotesByClient(db, clientId) {
  return db.quoteDrafts.filter((q) => q.clientId === clientId)
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} quoteId
 */
export function selectQuoteVersions(db, quoteId) {
  return (db.quoteVersions ?? [])
    .filter((v) => v.quoteId === quoteId)
    .sort((a, b) => a.versionNo - b.versionNo)
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} versionId
 */
export function selectQuoteVersionById(db, versionId) {
  return (db.quoteVersions ?? []).find((v) => v.id === versionId)
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} versionId
 */
export function selectQuoteLineItems(db, versionId) {
  return (db.quoteLineItems ?? []).filter((li) => li.quoteVersionId === versionId)
}

/**
 * Customer-facing offer lines for a version, in display order.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} versionId
 */
export function selectQuoteOfferLines(db, versionId) {
  return (db.quoteOfferLines ?? [])
    .filter((l) => l.quoteVersionId === versionId)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
}

/**
 * Net total of one offer line: confirmed (or requested) qty × unit price,
 * minus the per-line discount.
 * @param {import('./model.js').QuoteOfferLine} line
 */
export function offerLineNetTotal(line) {
  const qty = Number(line.confirmedQty ?? line.requestedQty) || 0
  const gross = qty * (Number(line.unitPrice) || 0)
  const disc = Number(line.discountPercent) || 0
  return gross * (1 - disc / 100)
}

/**
 * Total of the customer-facing offer lines (discount-aware).
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} versionId
 */
export function selectOfferLinesTotal(db, versionId) {
  return selectQuoteOfferLines(db, versionId).reduce((sum, l) => sum + offerLineNetTotal(l), 0)
}

/** @param {import('../../data/mockDatabase.js').MockDatabase} db */
export function selectTermsOfDelivery(db) {
  return db.termsOfDelivery ?? []
}

/** @param {import('../../data/mockDatabase.js').MockDatabase} db */
export function selectTermsOfPayment(db) {
  return db.termsOfPayment ?? []
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} versionId
 */
export function selectQuoteApprovals(db, versionId) {
  return (db.quoteApprovals ?? []).filter((a) => a.quoteVersionId === versionId)
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} versionId
 */
export function selectQuoteDocuments(db, versionId) {
  return (db.quoteDocuments ?? []).filter((d) => d.quoteVersionId === versionId)
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} token
 */
export function selectQuoteVersionByToken(db, token) {
  const decision = (db.quoteDecisions ?? []).find((d) => d.token === token)
  if (decision) return selectQuoteVersionById(db, decision.quoteVersionId)
  const doc = (db.quoteDocuments ?? []).find(
    (d) => d.kind === 'acceptance_receipt' && d.storageRef === token,
  )
  if (doc) return selectQuoteVersionById(db, doc.quoteVersionId)
  return undefined
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} versionId
 */
export function selectQuoteDecision(db, versionId) {
  return (db.quoteDecisions ?? []).find((d) => d.quoteVersionId === versionId)
}

/* ── Working cost sheet ──────────────────────────────────────────────────── */

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} quoteId
 */
export function selectCostSheetByQuote(db, quoteId) {
  return (db.costSheets ?? []).find((s) => s.quoteId === quoteId)
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} costSheetId
 */
export function selectCostSheetLines(db, costSheetId) {
  return (db.costSheetLines ?? [])
    .filter((l) => l.costSheetId === costSheetId)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
}

/**
 * Catalog entries for a group (or all if omitted).
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {import('./model.js').CostGroup} [group]
 */
export function selectCostCatalog(db, group) {
  const all = db.costCatalog ?? []
  return group ? all.filter((c) => c.group === group) : all
}

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100
const round4 = (n) => Math.round((Number(n) || 0) * 10000) / 10000

/**
 * Per-unit EUR amount contributed by a single cost line, given a context that
 * carries the cross-group inputs (net weight for energy, cost base for
 * percentages). Pure — no DB access.
 *
 * @param {import('./model.js').CostSheetLine} line
 * @param {{ netKg?: number; costBase?: number }} [ctx]
 */
export function computeLineAmount(line, ctx = {}) {
  switch (line.driver) {
    case 'weight': {
      const netKg = line.linkNetKg ? (ctx.netKg ?? 0) : (Number(line.netKg) || 0)
      const gross = netKg * (1 + (Number(line.scrapPct) || 0) / 100)
      return round4(gross * (Number(line.costPerKg) || 0))
    }
    case 'surface': {
      const kg = ((Number(line.areaDm2) || 0) * (Number(line.gPerDm2) || 0)) / 1000
      return round4(kg * (Number(line.costPerKg) || 0))
    }
    case 'percent':
      return round4(((ctx.costBase ?? 0) * (Number(line.percent) || 0)) / 100)
    case 'allocation': {
      const units = Number(line.allocationUnits) || 0
      return units > 0 ? round4((Number(line.fixedTotal) || 0) / units) : 0
    }
    case 'pack': {
      const per = Number(line.unitsPerPack) || 0
      return per > 0 ? round4((Number(line.costPerPack) || 0) / per) : 0
    }
    case 'count':
    default:
      return round4((Number(line.qty) || 0) * (Number(line.unitCost) || 0))
  }
}

/**
 * The gross net-weight of the sheet — sum of `netKg` on material weight lines.
 * Drives weight-linked lines such as energy.
 * @param {import('./model.js').CostSheetLine[]} lines
 */
export function sheetNetKg(lines) {
  return lines
    .filter((l) => l.group === 'material' && l.driver === 'weight' && !l.linkNetKg)
    .reduce((sum, l) => sum + (Number(l.netKg) || 0), 0)
}

/**
 * Roll the whole cost sheet up into per-group subtotals and the combined
 * cost price → EXW → DAP chain. Each group is summed independently; the only
 * cross-links are net weight (energy) and the cost base (burden %).
 *
 * @param {import('./model.js').CostSheet} sheet
 * @param {import('./model.js').CostSheetLine[]} lines
 */
export function computeCostRollup(sheet, lines) {
  const netKg = sheetNetKg(lines)
  const sumGroup = (group, ctx) =>
    lines.filter((l) => l.group === group).reduce((sum, l) => sum + computeLineAmount(l, ctx), 0)

  const materials = sumGroup('material', { netKg })
  const labour = sumGroup('labor', { netKg })
  const machine = sumGroup('operation', { netKg })
  const costBase = materials + labour + machine
  const burden = sumGroup('other', { netKg, costBase })

  const toolingTotal = lines
    .filter((l) => l.group === 'tooling')
    .reduce((sum, l) => sum + (Number(l.qty) || 0) * (Number(l.unitCost) || 0), 0)
  const amortUnits = Number(sheet?.amortisationUnits) || 0
  const toolingPerUnit =
    sheet?.toolingMode === 'amortise' && amortUnits > 0 ? toolingTotal / amortUnits : 0

  const costPrice = materials + labour + machine + burden + toolingPerUnit
  const margin = Number(sheet?.marginPercent) || 0
  const profit = costPrice * (margin / 100)
  const exw = costPrice + profit
  const logistics = sumGroup('logistics', { netKg })
  const dap = exw + logistics

  return {
    netKg: round4(netKg),
    groups: {
      material: round4(materials),
      labor: round4(labour),
      operation: round4(machine),
      other: round4(burden),
    },
    toolingTotal: round2(toolingTotal),
    toolingPerUnit: round4(toolingPerUnit),
    costPrice: round4(costPrice),
    profit: round4(profit),
    exw: round4(exw),
    logistics: round4(logistics),
    dap: round4(dap),
  }
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} quoteId
 */
export function selectQuoteBundle(db, quoteId) {
  const quote = selectQuoteById(db, quoteId)
  if (!quote) return null
  const versions = selectQuoteVersions(db, quoteId)
  const currentVersion = quote.currentVersionId
    ? selectQuoteVersionById(db, quote.currentVersionId)
    : versions[versions.length - 1]
  return { quote, versions, currentVersion }
}
