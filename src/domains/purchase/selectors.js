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
  return db.purchaseOrders.filter((p) => p.status !== 'closed' && p.status !== 'received')
}
