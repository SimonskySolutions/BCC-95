/**
 * Bridge between the shop floor and the client-order execution log: starting /
 * completing a product's operations automatically logs milestones, machine
 * hours and planned-vs-actual time on the linked client order — the same
 * records the CRM client profile displays.
 */
import { setOperationStatus } from '../../domains/operations/mutations.js'
import {
  appendOrderExecutionRecord,
  appendOrderMachineUsage,
  appendOrderTimeLog,
} from '../../domains/crm/mutations.js'

/** The open client order production for this product should log against (newest first). */
export function resolveOpenOrderForProduct(db, productId) {
  return [...(db.clientOrders ?? [])]
    .filter((o) => o.productId === productId && ['open', 'in_production'].includes(o.status))
    .sort((a, b) => (a.orderedAt < b.orderedAt ? 1 : -1))[0] ?? null
}

/**
 * Start an operation. Moves the linked client order to `in_production`.
 * @returns {{ operation: object, order: object | null } | null}
 */
export function startOperation(db, operationId) {
  const operation = setOperationStatus(db, operationId, 'in_progress')
  if (!operation) return null
  const order = resolveOpenOrderForProduct(db, operation.productId)
  if (order && order.status === 'open') order.status = 'in_production'
  return { operation, order }
}

/**
 * Complete an operation and log it against the linked client order:
 * a milestone (the operation's name), machine hours and a planned-vs-actual
 * time entry. When this was the product's last open operation, a final
 * "production completed" milestone is added too.
 *
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} operationId
 * @param {{ actualHours?: number, allDoneMilestone?: string }} [opts]
 * @returns {{ operation: object, order: object | null, logged: boolean, allDone: boolean } | null}
 */
export function completeOperation(db, operationId, opts = {}) {
  const operation = setOperationStatus(db, operationId, 'done')
  if (!operation) return null
  const plannedHours = Math.round(((operation.standardMinutes ?? 0) / 60) * 100) / 100
  const actualHours = Number(opts.actualHours) > 0 ? Number(opts.actualHours) : plannedHours

  const order = resolveOpenOrderForProduct(db, operation.productId)
  const productOps = (db.operations ?? []).filter((o) => o.productId === operation.productId)
  const allDone = productOps.length > 0 && productOps.every((o) => o.status === 'done')

  if (order) {
    appendOrderExecutionRecord(db, { orderId: order.id, milestone: operation.name })
    if (operation.machineId && actualHours > 0) {
      appendOrderMachineUsage(db, { orderId: order.id, machineId: operation.machineId, hours: actualHours })
    }
    appendOrderTimeLog(db, { orderId: order.id, phase: operation.name, plannedHours, actualHours })
    if (allDone && opts.allDoneMilestone) {
      appendOrderExecutionRecord(db, { orderId: order.id, milestone: opts.allDoneMilestone })
    }
  }
  return { operation, order, logged: Boolean(order), allDone }
}
