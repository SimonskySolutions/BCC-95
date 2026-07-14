import { evaluateFormula } from '../../lib/formula.js'

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
  const qty = toNum(line.confirmedQty ?? line.requestedQty)
  const gross = qty * toNum(line.unitPrice)
  const disc = toNum(line.discountPercent)
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

/** Shared row builder for offer-history rows (per product or per client). */
function offerHistoryRows(db, quotes) {
  const byId = new Map(quotes.map((q) => [q.id, q]))
  return (db.quoteVersions ?? [])
    .filter((v) => byId.has(v.quoteId))
    .map((v) => {
      const quote = byId.get(v.quoteId)
      const client = (db.clients ?? []).find((c) => c.id === quote.clientId)
      const product = (db.products ?? []).find((p) => p.id === quote.productId)
      return {
        versionId: v.id,
        quoteId: v.quoteId,
        versionNo: v.versionNo,
        offerNo: quote.offerNo ?? quote.id,
        kind: quote.kind ?? 'goods',
        status: v.status,
        clientId: quote.clientId,
        clientName: client?.companyName ?? client?.name ?? '—',
        productId: quote.productId,
        productName: product?.name ?? quote.productId ?? '—',
        currency: v.currency ?? quote.currency ?? 'EUR',
        date: v.orderDate ?? v.createdAt?.slice(0, 10) ?? '',
        total: selectOfferLinesTotal(db, v.id),
      }
    })
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.versionNo - a.versionNo)
}

/**
 * Every offer (quote version) ever raised for a product, across all of its
 * quotes/clients — the per-product offer history. Newest first.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} productId
 */
export function selectOffersByProduct(db, productId) {
  return offerHistoryRows(db, (db.quoteDrafts ?? []).filter((q) => q.productId === productId))
}

/**
 * Every offer raised for a client, across all their products — the per-customer
 * offer history shown on the CRM profile. Newest first.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} clientId
 */
export function selectOffersByClient(db, clientId) {
  return offerHistoryRows(db, (db.quoteDrafts ?? []).filter((q) => q.clientId === clientId))
}

/**
 * Every offer raised across the whole company — newest first. Used by the
 * dashboard "recent offers" / "expiring offers" widgets.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 */
export function selectAllOffers(db) {
  return offerHistoryRows(db, db.quoteDrafts ?? [])
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

/** All cost sheets for a quote (one per product when costing a multi-product offer). */
export function selectCostSheetsByQuote(db, quoteId) {
  return (db.costSheets ?? []).filter((s) => s.quoteId === quoteId)
}

/**
 * Cost sheets that belong to a specific offer version. Each version owns its own
 * calculation. Falls back to legacy quote-level sheets (no `quoteVersionId`) so
 * older offers keep working until they are stamped/copied.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {{ id: string; quoteId: string } | undefined} version
 */
export function selectCostSheetsByVersion(db, version) {
  if (!version) return []
  const all = db.costSheets ?? []
  const owned = all.filter((s) => s.quoteVersionId === version.id)
  if (owned.length) return owned
  // Legacy: quote-level sheets not yet bound to any version.
  return all.filter((s) => s.quoteId === version.quoteId && !s.quoteVersionId)
}

/** The first cost sheet owned by a version (single-product convenience). */
export function selectCostSheetByVersion(db, version) {
  return selectCostSheetsByVersion(db, version)[0]
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

/**
 * Coerce a stored value to a number, tolerating locale/UI formats: a decimal
 * comma ("12,3"), thousands spaces ("1 234.5") or a plain number. Invalid → 0.
 * `Number("12,3")` is NaN, so reading cost fields with bare `Number()` silently
 * produced 0 for comma decimals — this is the fix.
 */
export const toNum = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  const n = Number(String(v ?? '').replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

const round2 = (n) => Math.round(toNum(n) * 100) / 100
const round4 = (n) => Math.round(toNum(n) * 10000) / 10000

/**
 * Per-unit EUR amount contributed by a single cost line, given a context that
 * carries the cross-group inputs (net weight for energy, cost base for
 * percentages). Pure — no DB access.
 *
 * @param {import('./model.js').CostSheetLine} line
 * @param {{ netKg?: number; costBase?: number }} [ctx]
 */
export function computeLineAmount(line, ctx = {}) {
  // Custom method: evaluate its snapshotted formula over the line's values + context.
  if (line.formula) {
    const vars = { ...(line.values ?? {}), netKg: ctx.netKg ?? 0, costBase: ctx.costBase ?? 0 }
    return round4(evaluateFormula(line.formula, vars))
  }
  switch (line.driver) {
    case 'weight': {
      const netKg = line.linkNetKg ? (ctx.netKg ?? 0) : toNum(line.netKg)
      const gross = netKg * (1 + toNum(line.scrapPct) / 100)
      return round4(gross * toNum(line.costPerKg))
    }
    case 'surface': {
      const kg = (toNum(line.areaDm2) * toNum(line.gPerDm2)) / 1000
      return round4(kg * toNum(line.costPerKg))
    }
    case 'percent':
      return round4(((ctx.costBase ?? 0) * toNum(line.percent)) / 100)
    case 'allocation': {
      const units = toNum(line.allocationUnits)
      return units > 0 ? round4(toNum(line.fixedTotal) / units) : 0
    }
    case 'pack': {
      const per = toNum(line.unitsPerPack)
      return per > 0 ? round4(toNum(line.costPerPack) / per) : 0
    }
    case 'count':
    default:
      return round4(toNum(line.qty) * toNum(line.unitCost))
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
    .reduce((sum, l) => sum + toNum(l.netKg), 0)
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
  const operations = sumGroup('operation', { netKg })
  const costBase = materials + operations
  const burden = sumGroup('other', { netKg, costBase })

  const toolingTotal = lines
    .filter((l) => l.group === 'tooling')
    .reduce((sum, l) => sum + toNum(l.qty) * toNum(l.unitCost), 0)
  const amortUnits = Number(sheet?.amortisationUnits) || 0
  let toolingPerUnit = 0
  if (sheet?.toolingMode === 'amortise') {
    if (sheet?.amortisationMode === 'cost') {
      // Amortise tooling proportionally to each unit's own cost: spread the
      // total tooling over a cost/value base (e.g. expected production cost).
      const costExclTooling = materials + operations + burden
      const base = Number(sheet?.amortisationCost) || 0
      toolingPerUnit = base > 0 ? (toolingTotal * costExclTooling) / base : 0
    } else {
      toolingPerUnit = amortUnits > 0 ? toolingTotal / amortUnits : 0
    }
  }

  const costPriceExclTooling = materials + operations + burden
  const costPrice = costPriceExclTooling + toolingPerUnit
  const margin = Number(sheet?.marginPercent) || 0
  const profit = costPrice * (margin / 100)
  const exw = costPrice + profit
  const logistics = sumGroup('logistics', { netKg })
  const dap = exw + logistics

  return {
    netKg: round4(netKg),
    groups: {
      material: round4(materials),
      operation: round4(operations),
      other: round4(burden),
    },
    toolingTotal: round2(toolingTotal),
    toolingPerUnit: round4(toolingPerUnit),
    costPrice: round4(costPrice),
    costPriceExclTooling: round4(costPriceExclTooling),
    profit: round4(profit),
    exw: round4(exw),
    logistics: round4(logistics),
    dap: round4(dap),
  }
}

/**
 * Resolve each quantity break into EXW / DAP unit prices. Cost price is fixed;
 * only the margin varies per tier (logistics is added after margin for DAP).
 * @param {{ costPrice: number; logistics: number }} rollup
 * @param {import('./model.js').QuantityBreak[]} [breaks]
 */
export function priceBreakRows(rollup, breaks = [], baseCostPrice) {
  const base = baseCostPrice != null ? baseCostPrice : rollup.costPrice
  return [...breaks]
    .sort((a, b) => (Number(a.qty) || 0) - (Number(b.qty) || 0))
    .map((b) => {
      const exw = base * (1 + (Number(b.marginPercent) || 0) / 100)
      return {
        id: b.id,
        qty: Number(b.qty) || 0,
        marginPercent: Number(b.marginPercent) || 0,
        exw: round4(exw),
        dap: round4(exw + rollup.logistics),
      }
    })
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
