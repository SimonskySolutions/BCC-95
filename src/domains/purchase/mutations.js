/**
 * Purchase mutations: purchase-order lifecycle + receiving, vendor contracts,
 * special discounts, vendor quotes (offer comparison) and RFQs.
 */
import { bestVendorDiscount } from './selectors.js'

function newId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

const today = () => new Date().toISOString().slice(0, 10)

/** Next human PO number: PO-YYYY-NNNN, scanning what already exists. */
export function nextPurchaseOrderNo(db) {
  const year = new Date().getFullYear()
  const prefix = `PO-${year}-`
  let max = 0
  for (const po of db.purchaseOrders ?? []) {
    if (typeof po.no === 'string' && po.no.startsWith(prefix)) {
      const n = Number(po.no.slice(prefix.length))
      if (Number.isFinite(n) && n > max) max = n
    }
  }
  return `${prefix}${String(max + 1).padStart(4, '0')}`
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {{ vendorId: string; expectedAt?: string; currency?: string; notes?: string; contractId?: string; createdById?: string }} input
 */
export function appendPurchaseOrder(db, input) {
  if (!input.vendorId) return null
  if (!db.purchaseOrders) db.purchaseOrders = []
  /** @type {import('./model.js').PurchaseOrder} */
  const po = {
    id: newId('po'),
    no: nextPurchaseOrderNo(db),
    vendorId: input.vendorId,
    orderedAt: today(),
    expectedAt: input.expectedAt,
    status: 'draft',
    currency: input.currency,
    notes: input.notes,
    contractId: input.contractId,
    createdById: input.createdById,
  }
  db.purchaseOrders.push(po)
  return po
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} poId
 * @param {Partial<import('./model.js').PurchaseOrder>} patch
 */
export function patchPurchaseOrder(db, poId, patch) {
  const po = (db.purchaseOrders ?? []).find((p) => p.id === poId)
  if (!po) return null
  Object.assign(po, patch)
  return po
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {{ purchaseOrderId: string; materialId?: string; description?: string; qty: number; uom?: string; unitCost: number; discountPercent?: number }} input
 */
export function appendPurchaseOrderLine(db, input) {
  if (!db.purchaseOrderLines) db.purchaseOrderLines = []
  /** @type {import('./model.js').PurchaseOrderLine} */
  const line = {
    id: newId('pol'),
    purchaseOrderId: input.purchaseOrderId,
    materialId: input.materialId,
    description: input.description,
    qty: Number(input.qty) || 0,
    uom: input.uom,
    unitCost: Number(input.unitCost) || 0,
    discountPercent: Number(input.discountPercent) || 0,
  }
  db.purchaseOrderLines.push(line)
  return line
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} lineId
 */
export function removePurchaseOrderLine(db, lineId) {
  db.purchaseOrderLines = (db.purchaseOrderLines ?? []).filter((l) => l.id !== lineId)
}

/** Recompute a PO's status from its lines' received quantities. */
function refreshReceiveStatus(db, poId) {
  const po = (db.purchaseOrders ?? []).find((p) => p.id === poId)
  if (!po) return
  const lines = (db.purchaseOrderLines ?? []).filter((l) => l.purchaseOrderId === poId)
  if (!lines.length) return
  const received = lines.filter((l) => (l.receivedQty ?? 0) >= l.qty).length
  if (received === lines.length) po.status = 'received'
  else if (lines.some((l) => (l.receivedQty ?? 0) > 0)) po.status = 'partial'
}

/**
 * Book a goods receipt for one line (full quantity unless `qty` given) and
 * refresh the order status (partial / received).
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} lineId
 * @param {{ qty?: number; receivedAt?: string }} [input]
 */
export function receivePurchaseOrderLine(db, lineId, input = {}) {
  const line = (db.purchaseOrderLines ?? []).find((l) => l.id === lineId)
  if (!line) return null
  const receivedAt = input.receivedAt ?? today()
  const qty = Number(input.qty) || Math.max(0, line.qty - (line.receivedQty ?? 0))
  line.receivedQty = (line.receivedQty ?? 0) + qty
  line.receivedAt = receivedAt
  if (!db.goodsReceipts) db.goodsReceipts = []
  db.goodsReceipts.push({ id: newId('gr'), purchaseOrderId: line.purchaseOrderId, lineId: line.id, qty, receivedAt })
  refreshReceiveStatus(db, line.purchaseOrderId)
  return line
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {{ vendorId: string; title: string; refNo?: string; validFrom?: string; validTo?: string; discountPercent?: number; terms?: string }} input
 */
export function appendVendorContract(db, input) {
  const title = String(input.title ?? '').trim()
  if (!title || !input.vendorId) return null
  if (!db.vendorContracts) db.vendorContracts = []
  /** @type {import('./model.js').VendorContract} */
  const contract = {
    id: newId('vc'),
    vendorId: input.vendorId,
    title,
    refNo: input.refNo,
    validFrom: input.validFrom,
    validTo: input.validTo,
    discountPercent: Number(input.discountPercent) || 0,
    terms: input.terms,
    fileId: input.fileId,
    fileName: input.fileName,
    createdAt: new Date().toISOString(),
  }
  db.vendorContracts.push(contract)
  return contract
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} contractId
 */
export function removeVendorContract(db, contractId) {
  db.vendorContracts = (db.vendorContracts ?? []).filter((c) => c.id !== contractId)
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {{ vendorId: string; materialId?: string; scope?: string; percent: number; minQty?: number; validTo?: string; note?: string }} input
 */
export function appendVendorDiscount(db, input) {
  const percent = Number(input.percent)
  if (!input.vendorId || !Number.isFinite(percent) || percent <= 0) return null
  if (!db.vendorDiscounts) db.vendorDiscounts = []
  /** @type {import('./model.js').VendorDiscount} */
  const discount = {
    id: newId('vd'),
    vendorId: input.vendorId,
    materialId: input.materialId,
    scope: input.scope,
    percent,
    minQty: Number(input.minQty) || undefined,
    validTo: input.validTo,
    note: input.note,
    createdAt: new Date().toISOString(),
  }
  db.vendorDiscounts.push(discount)
  return discount
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} discountId
 */
export function removeVendorDiscount(db, discountId) {
  db.vendorDiscounts = (db.vendorDiscounts ?? []).filter((d) => d.id !== discountId)
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {{ vendorId: string; materialId?: string; itemName: string; qty?: number; unitPrice: number; currency?: string; leadTimeDays?: number; validUntil?: string; note?: string }} input
 */
export function appendVendorQuote(db, input) {
  const itemName = String(input.itemName ?? '').trim()
  const unitPrice = Number(input.unitPrice)
  if (!input.vendorId || !itemName || !Number.isFinite(unitPrice) || unitPrice <= 0) return null
  if (!db.vendorQuotes) db.vendorQuotes = []
  /** @type {import('./model.js').VendorQuote} */
  const quote = {
    id: newId('vq'),
    vendorId: input.vendorId,
    materialId: input.materialId,
    itemName,
    qty: Number(input.qty) || undefined,
    unitPrice,
    currency: input.currency,
    leadTimeDays: Number(input.leadTimeDays) || undefined,
    validUntil: input.validUntil,
    note: input.note,
    rfqId: input.rfqId,
    receivedAt: today(),
  }
  db.vendorQuotes.push(quote)
  return quote
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} quoteId
 */
export function removeVendorQuote(db, quoteId) {
  db.vendorQuotes = (db.vendorQuotes ?? []).filter((q) => q.id !== quoteId)
}

/**
 * Create a vendor category (idempotent by case-insensitive name).
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} name
 */
export function appendVendorCategory(db, name) {
  const n = String(name ?? '').trim()
  if (!n) return null
  if (!db.vendorCategories) db.vendorCategories = []
  const existing = db.vendorCategories.find((c) => c.name.toLowerCase() === n.toLowerCase())
  if (existing) return existing
  const category = { id: newId('vcat'), name: n }
  db.vendorCategories.push(category)
  return category
}

/**
 * Delete a category; vendors assigned to it become uncategorized.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} categoryId
 */
export function removeVendorCategory(db, categoryId) {
  db.vendorCategories = (db.vendorCategories ?? []).filter((c) => c.id !== categoryId)
  for (const v of db.vendors ?? []) {
    if (v.categoryId === categoryId) delete v.categoryId
  }
}

/**
 * Assign (or clear, with '') a vendor's category.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} vendorId
 * @param {string} categoryId
 */
export function setVendorCategory(db, vendorId, categoryId) {
  const vendor = (db.vendors ?? []).find((v) => v.id === vendorId)
  if (!vendor) return null
  vendor.categoryId = categoryId || undefined
  return vendor
}

/**
 * Add a contact person to a vendor. Unknown position is stored as 'N/A'.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} vendorId
 * @param {{ name: string; position?: string; phone?: string; email?: string }} input
 */
export function appendVendorContact(db, vendorId, input) {
  const vendor = (db.vendors ?? []).find((v) => v.id === vendorId)
  const name = String(input.name ?? '').trim()
  if (!vendor || !name) return null
  if (!vendor.contacts) vendor.contacts = []
  /** @type {import('./model.js').VendorContact} */
  const contact = {
    id: newId('vct'),
    name,
    position: String(input.position ?? '').trim() || 'N/A',
    phone: String(input.phone ?? '').trim() || undefined,
    email: String(input.email ?? '').trim() || undefined,
  }
  vendor.contacts.push(contact)
  return contact
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} vendorId
 * @param {string} contactId
 */
export function removeVendorContact(db, vendorId, contactId) {
  const vendor = (db.vendors ?? []).find((v) => v.id === vendorId)
  if (!vendor) return
  vendor.contacts = (vendor.contacts ?? []).filter((c) => c.id !== contactId)
}

/** Next human RFQ number: RFQ-YYYY-NNNN. */
export function nextRfqNo(db) {
  const year = new Date().getFullYear()
  const prefix = `RFQ-${year}-`
  let max = 0
  for (const r of db.rfqRequests ?? []) {
    if (typeof r.no === 'string' && r.no.startsWith(prefix)) {
      const n = Number(r.no.slice(prefix.length))
      if (Number.isFinite(n) && n > max) max = n
    }
  }
  return `${prefix}${String(max + 1).padStart(4, '0')}`
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {{ itemName: string; materialId?: string; qty?: number; uom?: string; neededBy?: string; notes?: string; vendorIds: string[]; createdById?: string }} input
 */
export function appendRfq(db, input) {
  const itemName = String(input.itemName ?? '').trim()
  const vendorIds = (input.vendorIds ?? []).filter(Boolean)
  if (!itemName || vendorIds.length === 0) return null
  if (!db.rfqRequests) db.rfqRequests = []
  /** @type {import('./model.js').RfqRequest} */
  const rfq = {
    id: newId('rfq'),
    no: nextRfqNo(db),
    itemName,
    materialId: input.materialId,
    qty: Number(input.qty) || undefined,
    uom: input.uom,
    neededBy: input.neededBy,
    notes: input.notes,
    vendorIds,
    status: 'draft',
    createdAt: new Date().toISOString(),
    createdById: input.createdById,
  }
  db.rfqRequests.push(rfq)
  return rfq
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} rfqId
 * @param {Partial<import('./model.js').RfqRequest>} patch
 */
export function patchRfq(db, rfqId, patch) {
  const rfq = (db.rfqRequests ?? []).find((r) => r.id === rfqId)
  if (!rfq) return null
  Object.assign(rfq, patch)
  return rfq
}

/** Remove an RFQ; the quotes it collected stay (they remain valid price data). */
export function removeRfq(db, rfqId) {
  db.rfqRequests = (db.rfqRequests ?? []).filter((r) => r.id !== rfqId)
}

/**
 * Turn a vendor quote into a draft purchase order (one line, the quote's
 * price, today's best applicable discount).
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} quoteId
 * @param {{ currency?: string; createdById?: string }} [opts]
 */
export function createOrderFromQuote(db, quoteId, opts = {}) {
  const quote = (db.vendorQuotes ?? []).find((q) => q.id === quoteId)
  if (!quote) return null
  const material = quote.materialId ? (db.materials ?? []).find((m) => m.id === quote.materialId) : null
  const po = appendPurchaseOrder(db, {
    vendorId: quote.vendorId,
    currency: opts.currency ?? quote.currency,
    createdById: opts.createdById,
  })
  appendPurchaseOrderLine(db, {
    purchaseOrderId: po.id,
    materialId: quote.materialId,
    description: quote.materialId ? undefined : quote.itemName,
    qty: quote.qty ?? 1,
    uom: material?.uom,
    unitCost: quote.unitPrice,
    discountPercent: bestVendorDiscount(db, quote.vendorId, quote.materialId, quote.qty),
  })
  return po
}
