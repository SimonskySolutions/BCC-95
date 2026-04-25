/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} clientId
 */
export function selectClientById(db, clientId) {
  return db.clients.find((c) => c.id === clientId)
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} clientId
 */
export function selectOrdersByClient(db, clientId) {
  return db.clientOrders.filter((o) => o.clientId === clientId)
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} clientId
 */
export function selectPaymentsByClient(db, clientId) {
  return db.paymentRecords.filter((p) => p.clientId === clientId)
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} clientId
 */
export function selectClientProfileBundle(db, clientId) {
  const client = selectClientById(db, clientId)
  if (!client) return null
  const orders = selectOrdersByClient(db, clientId)
  const orderIds = new Set(orders.map((o) => o.id))
  const lines = db.orderLines.filter((l) => orderIds.has(l.orderId))
  const executions = db.orderExecutionRecords.filter((e) => orderIds.has(e.orderId))
  const machineUsages = db.orderMachineUsages.filter((m) => orderIds.has(m.orderId))
  const timeLogs = db.orderTimeLogs.filter((t) => orderIds.has(t.orderId))
  const issues = db.orderIssues.filter((i) => orderIds.has(i.orderId))
  const invoices = db.invoices.filter((i) => i.clientId === clientId)
  const payments = selectPaymentsByClient(db, clientId)
  const schematics = db.schematicDocuments.filter((s) => s.clientId === clientId)
  return {
    client,
    orders,
    lines,
    executions,
    machineUsages,
    timeLogs,
    issues,
    invoices,
    payments,
    schematics,
  }
}
