/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} vendorId
 */
export function selectVendorById(db, vendorId) {
  return db.vendors.find((v) => v.id === vendorId)
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} poId
 */
export function selectPurchaseOrderById(db, poId) {
  return db.purchaseOrders.find((p) => p.id === poId)
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} purchaseOrderId
 */
export function selectLinesByPurchaseOrder(db, purchaseOrderId) {
  return db.purchaseOrderLines.filter((l) => l.purchaseOrderId === purchaseOrderId)
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} purchaseOrderId
 */
export function selectReceiptsByPurchaseOrder(db, purchaseOrderId) {
  return db.goodsReceipts.filter((g) => g.purchaseOrderId === purchaseOrderId)
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 */
export function selectOpenPurchaseOrders(db) {
  return db.purchaseOrders.filter((p) => !['closed', 'received', 'cancelled'].includes(p.status))
}

/** Managed vendor categories, alphabetical. */
export function selectVendorCategories(db) {
  return [...(db.vendorCategories ?? [])].sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Display category for a vendor: the managed category if assigned, else the
 * legacy free-text label from the import ('Supplier' is treated as none).
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {import('./model.js').Vendor} vendor
 */
export function vendorCategoryName(db, vendor) {
  if (vendor?.categoryId) {
    return (db.vendorCategories ?? []).find((c) => c.id === vendor.categoryId)?.name ?? ''
  }
  const legacy = String(vendor?.category ?? '').trim()
  return legacy && legacy.toLowerCase() !== 'supplier' ? legacy : ''
}

/** All purchase orders, newest first. */
export function selectPurchaseOrdersSorted(db) {
  return [...(db.purchaseOrders ?? [])].sort((a, b) => (a.orderedAt < b.orderedAt ? 1 : -1))
}

/** Net line amount: qty × unit cost × (1 − discount%). */
export function poLineAmount(line) {
  const disc = Number(line.discountPercent) || 0
  return (Number(line.qty) || 0) * (Number(line.unitCost) || 0) * (1 - disc / 100)
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} poId
 */
export function selectPurchaseOrderTotal(db, poId) {
  return selectLinesByPurchaseOrder(db, poId).reduce((sum, l) => sum + poLineAmount(l), 0)
}

/** A vendor's purchase orders, newest first. */
export function selectVendorOrders(db, vendorId) {
  return selectPurchaseOrdersSorted(db).filter((p) => p.vendorId === vendorId)
}

/**
 * Vendor scorecard: total spend (excl. cancelled), order count, last purchase
 * date and on-time delivery % (received on/before the expected date).
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} vendorId
 */
export function selectVendorStats(db, vendorId) {
  const orders = selectVendorOrders(db, vendorId).filter((p) => p.status !== 'cancelled')
  const spend = orders.reduce((sum, p) => sum + selectPurchaseOrderTotal(db, p.id), 0)
  const lastOrderAt = orders[0]?.orderedAt ?? null
  let onTimeDone = 0
  let onTimeTotal = 0
  for (const po of orders) {
    if (!po.expectedAt || !['received', 'closed'].includes(po.status)) continue
    const lines = selectLinesByPurchaseOrder(db, po.id).filter((l) => l.receivedAt)
    if (!lines.length) continue
    onTimeTotal += 1
    const lastReceipt = lines.map((l) => l.receivedAt).sort().at(-1)
    if (lastReceipt <= po.expectedAt) onTimeDone += 1
  }
  return {
    spend,
    orderCount: orders.length,
    lastOrderAt,
    onTimePercent: onTimeTotal > 0 ? Math.round((onTimeDone / onTimeTotal) * 100) : null,
  }
}

/**
 * Contract validity state at a given date.
 * @param {import('./model.js').VendorContract} contract
 * @param {string} [todayIso]
 * @returns {'active'|'expiring'|'expired'|'upcoming'}
 */
export function contractStatus(contract, todayIso = new Date().toISOString().slice(0, 10)) {
  if (contract.validFrom && contract.validFrom > todayIso) return 'upcoming'
  if (contract.validTo) {
    if (contract.validTo < todayIso) return 'expired'
    const soon = new Date(todayIso)
    soon.setDate(soon.getDate() + 30)
    if (contract.validTo <= soon.toISOString().slice(0, 10)) return 'expiring'
  }
  return 'active'
}

/** @param {import('../../data/mockDatabase.js').MockDatabase} db */
export function selectVendorContracts(db, vendorId) {
  return (db.vendorContracts ?? [])
    .filter((c) => c.vendorId === vendorId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

/** All contracts, soonest-to-expire first. */
export function selectAllContracts(db) {
  return [...(db.vendorContracts ?? [])].sort((a, b) => String(a.validTo ?? '9999') < String(b.validTo ?? '9999') ? -1 : 1)
}

/** @param {import('../../data/mockDatabase.js').MockDatabase} db */
export function selectVendorDiscounts(db, vendorId) {
  return (db.vendorDiscounts ?? [])
    .filter((d) => d.vendorId === vendorId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

/** @param {import('../../data/mockDatabase.js').MockDatabase} db */
export function selectAllDiscounts(db) {
  return [...(db.vendorDiscounts ?? [])].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

/** A discount is usable today (validity window not passed). */
export function discountIsActive(discount, todayIso = new Date().toISOString().slice(0, 10)) {
  return !discount.validTo || discount.validTo >= todayIso
}

/**
 * Purchase-price history rows for one vendor (each PO line is a price event),
 * newest first, with a trend vs the previous purchase of the same item.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} vendorId
 */
export function selectVendorPriceHistory(db, vendorId) {
  return selectPriceHistory(db).filter((r) => r.vendorId === vendorId)
}

/**
 * All purchase-price events (PO lines of non-cancelled orders), newest first.
 * Each row carries `trend`: 'up' | 'down' | 'same' | null vs the previous
 * purchase of the same item (material or description) from any vendor.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} [materialId]
 */
export function selectPriceHistory(db, materialId) {
  const orders = new Map((db.purchaseOrders ?? []).map((p) => [p.id, p]))
  const rows = []
  for (const line of db.purchaseOrderLines ?? []) {
    const po = orders.get(line.purchaseOrderId)
    if (!po || po.status === 'cancelled') continue
    if (materialId && line.materialId !== materialId) continue
    const material = line.materialId ? (db.materials ?? []).find((m) => m.id === line.materialId) : null
    rows.push({
      lineId: line.id,
      poId: po.id,
      poNo: po.no ?? po.id,
      vendorId: po.vendorId,
      date: po.orderedAt,
      itemKey: line.materialId ?? `txt:${(line.description ?? '').trim().toLowerCase()}`,
      itemLabel: material ? material.name : (line.description ?? ''),
      qty: line.qty,
      uom: line.uom ?? material?.uom,
      unitCost: line.unitCost,
      discountPercent: line.discountPercent ?? 0,
      netUnitCost: poLineAmount(line) / (Number(line.qty) || 1),
      currency: po.currency,
    })
  }
  rows.sort((a, b) => (a.date < b.date ? -1 : 1))
  const lastByItem = new Map()
  for (const r of rows) {
    const prev = lastByItem.get(r.itemKey)
    r.trend = prev === undefined ? null : r.netUnitCost > prev ? 'up' : r.netUnitCost < prev ? 'down' : 'same'
    lastByItem.set(r.itemKey, r.netUnitCost)
  }
  return rows.reverse()
}

/** Distinct quoted item names (the shopping list for offer comparison). */
export function selectQuoteItems(db) {
  const names = new Set()
  for (const q of db.vendorQuotes ?? []) names.add(q.itemName)
  return [...names].sort((a, b) => a.localeCompare(b))
}

/**
 * The best usable discount % for a vendor + optional material today:
 * max of active special discounts (matching scope) and active contract discounts.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 */
export function bestVendorDiscount(db, vendorId, materialId, qty) {
  const todayIso = new Date().toISOString().slice(0, 10)
  let best = 0
  for (const d of db.vendorDiscounts ?? []) {
    if (d.vendorId !== vendorId || !discountIsActive(d, todayIso)) continue
    if (d.materialId && d.materialId !== materialId) continue
    if (d.minQty && (Number(qty) || 0) < d.minQty) continue
    if (d.percent > best) best = d.percent
  }
  for (const c of db.vendorContracts ?? []) {
    if (c.vendorId !== vendorId) continue
    const st = contractStatus(c, todayIso)
    if (st !== 'active' && st !== 'expiring') continue
    if ((c.discountPercent ?? 0) > best) best = c.discountPercent
  }
  return best
}

/** Decorate quotes with the applicable discount + effective price, cheapest first. */
function rankQuotes(db, quotes) {
  const todayIso = new Date().toISOString().slice(0, 10)
  const rows = quotes.map((q) => {
    const discount = bestVendorDiscount(db, q.vendorId, q.materialId, q.qty)
    return {
      ...q,
      discountPercent: discount,
      effectivePrice: q.unitPrice * (1 - discount / 100),
      expired: Boolean(q.validUntil && q.validUntil < todayIso),
    }
  })
  rows.sort((a, b) => a.effectivePrice - b.effectivePrice)
  return rows
}

/**
 * Quotes for one item across vendors, cheapest effective price first.
 * Effective price applies the best usable vendor discount on top of the quote.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} itemName
 */
export function compareQuotesForItem(db, itemName) {
  return rankQuotes(db, (db.vendorQuotes ?? []).filter((q) => q.itemName === itemName))
}

/** All RFQs, newest first. */
export function selectRfqsSorted(db) {
  return [...(db.rfqRequests ?? [])].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

/** Quotes answering one RFQ, cheapest effective price first. */
export function compareQuotesForRfq(db, rfqId) {
  return rankQuotes(db, (db.vendorQuotes ?? []).filter((q) => q.rfqId === rfqId))
}

/**
 * Monthly purchasing spend (non-cancelled orders), oldest month first.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {number} [months]
 */
export function selectMonthlySpend(db, months = 12) {
  const byMonth = new Map()
  for (const po of db.purchaseOrders ?? []) {
    if (po.status === 'cancelled' || !po.orderedAt) continue
    const month = po.orderedAt.slice(0, 7)
    byMonth.set(month, (byMonth.get(month) ?? 0) + selectPurchaseOrderTotal(db, po.id))
  }
  return [...byMonth.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .slice(-months)
    .map(([month, spend]) => ({ month, spend: Math.round(spend * 100) / 100 }))
}

/**
 * Top vendors by total spend (non-cancelled orders), biggest first.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {number} [limit]
 */
export function selectTopVendorsBySpend(db, limit = 5) {
  const byVendor = new Map()
  for (const po of db.purchaseOrders ?? []) {
    if (po.status === 'cancelled') continue
    byVendor.set(po.vendorId, (byVendor.get(po.vendorId) ?? 0) + selectPurchaseOrderTotal(db, po.id))
  }
  return [...byVendor.entries()]
    .map(([vendorId, spend]) => ({ vendorId, vendor: selectVendorById(db, vendorId)?.name ?? vendorId, spend: Math.round(spend * 100) / 100 }))
    .filter((r) => r.spend > 0)
    .sort((a, b) => b.spend - a.spend)
    .slice(0, limit)
}
