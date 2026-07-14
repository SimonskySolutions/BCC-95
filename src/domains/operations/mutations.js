import { selectOperationsByProduct } from './selectors.js'

let opCounter = 60

/**
 * @typedef {Object} OperationCreateInput
 * @property {string} productId
 * @property {string} name
 * @property {string} stepCode
 * @property {number} standardMinutes
 * @property {string} [machineId]
 * @property {string} [siloId]
 * @property {string} [silo]
 * @property {string} [ownerId]
 * @property {string} [stationCode]
 * @property {{ targetUnitsPerShift: number; maxDefectRatePercent: number; targetCycleMinutes: number }} dailyKpiTarget
 * @property {import('./model.js').OperationStatus} [status]
 */

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {OperationCreateInput} input
 * @returns {{ ok: true; operation: import('./model.js').Operation } | { ok: false; errors: string[] }}
 */
export function createOperationDefinition(db, input) {
  const errors = []
  if (!input.productId) errors.push('productId_required')
  if (!input.name?.trim()) errors.push('name_required')
  if (!input.stepCode?.trim()) errors.push('stepCode_required')
  if (!Number.isFinite(input.standardMinutes) || input.standardMinutes <= 0) errors.push('standardMinutes_invalid')
  if (!input.dailyKpiTarget) errors.push('dailyKpiTarget_required')
  else {
    const k = input.dailyKpiTarget
    if (!Number.isFinite(k.targetUnitsPerShift) || k.targetUnitsPerShift <= 0) errors.push('targetUnits_invalid')
    if (!Number.isFinite(k.maxDefectRatePercent) || k.maxDefectRatePercent < 0) errors.push('maxDefectRate_invalid')
    if (!Number.isFinite(k.targetCycleMinutes) || k.targetCycleMinutes <= 0) errors.push('targetCycle_invalid')
  }
  if (!db.products.some((p) => p.id === input.productId)) errors.push('product_invalid')
  if (errors.length) return { ok: false, errors }

  const siblings = selectOperationsByProduct(db, input.productId)
  const nextSeq = siblings.length ? Math.max(...siblings.map((o) => o.sequence)) + 1 : 1
  const id = `op-${++opCounter}`

  /** @type {import('./model.js').Operation} */
  const operation = {
    id,
    productId: input.productId,
    sequence: nextSeq,
    name: input.name.trim(),
    stepCode: input.stepCode.trim().toLowerCase().replace(/\s+/g, '-'),
    status: input.status ?? 'queued',
    machineId: input.machineId,
    standardMinutes: input.standardMinutes,
    siloId: input.siloId,
    silo: input.silo,
    ownerId: input.ownerId,
    stationCode: input.stationCode,
    dailyKpiTarget: { ...input.dailyKpiTarget },
  }
  db.operations.push(operation)
  return { ok: true, operation }
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {OperationCreateInput} input
 * @returns {import('./model.js').Operation}
 */
export function runCreateOperationDefinition(db, input) {
  const r = createOperationDefinition(db, input)
  if (!r.ok) {
    throw new Error(`createOperationDefinition: ${r.errors.join(', ')}`)
  }
  return r.operation
}

/**
 * Change an operation's shop-floor status. Records `startedAt` the first time
 * it enters `in_progress`.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} operationId
 * @param {import('./model.js').OperationStatus} status
 */
export function setOperationStatus(db, operationId, status) {
  const operation = (db.operations ?? []).find((o) => o.id === operationId)
  if (!operation) return null
  operation.status = status
  if (status === 'in_progress' && !operation.startedAt) operation.startedAt = new Date().toISOString()
  return operation
}
