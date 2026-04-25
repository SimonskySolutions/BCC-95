/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} orderId
 */
export function selectShipmentsByOrder(db, orderId) {
  return db.shipments.filter((s) => s.orderId === orderId)
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 */
export function selectBlockedShipments(db) {
  return db.shipments.filter((s) => s.status === 'blocked')
}

/**
 * Dispatched on-time: dispatchedAt <= promisedDate (date-only compare).
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 */
export function selectShippingDispatchSummary(db) {
  const dispatched = db.shipments.filter((s) => s.status === 'dispatched' && s.dispatchedAt)
  let onTime = 0
  for (const s of dispatched) {
    if (!s.dispatchedAt) continue
    const d = new Date(`${s.dispatchedAt}T12:00:00`)
    const p = new Date(`${s.promisedDate}T12:00:00`)
    if (d <= p) onTime += 1
  }
  const ratioPercent =
    dispatched.length === 0 ? 100 : Math.round((onTime / dispatched.length) * 1000) / 10
  return {
    dispatchedCount: dispatched.length,
    onTimeCount: onTime,
    onTimePercent: ratioPercent,
    readyCount: db.shipments.filter((s) => s.status === 'ready').length,
    blocked: selectBlockedShipments(db),
  }
}
