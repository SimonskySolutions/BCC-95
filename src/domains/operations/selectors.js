/**
 * @param {{ operations: import('./model.js').Operation[] }} db
 * @param {string} operationId
 * @returns {import('./model.js').Operation | undefined}
 */
export function selectOperationById(db, operationId) {
  return db.operations.find((o) => o.id === operationId)
}

/**
 * @param {{ operations: import('./model.js').Operation[] }} db
 * @param {string} productId
 * @returns {import('./model.js').Operation[]}
 */
export function selectOperationsByProduct(db, productId) {
  return db.operations.filter((o) => o.productId === productId).sort((a, b) => a.sequence - b.sequence)
}

/**
 * KPI basis for an operation on a calendar day (targets + routing context).
 * @param {{ operations: import('./model.js').Operation[] }} db
 * @param {string} operationId
 * @param {string} date — yyyy-mm-dd
 */
export function selectOperationDailyKpiBasis(db, operationId, date) {
  const op = selectOperationById(db, operationId)
  if (!op) return undefined
  return {
    operationId: op.id,
    date,
    dailyKpiTarget: op.dailyKpiTarget,
    standardMinutes: op.standardMinutes,
    ownerId: op.ownerId,
  }
}
