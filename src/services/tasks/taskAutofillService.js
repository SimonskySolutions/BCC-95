import { selectOperationById } from '../../domains/operations/selectors.js'

/**
 * @param {string} isoDate
 * @returns {import('../../domains/tasks/model.js').PlannedQuarter}
 */
function quarterFromIsoDate(isoDate) {
  const month = Number.parseInt(isoDate.slice(5, 7), 10)
  if (month <= 3) return 'Q1'
  if (month <= 6) return 'Q2'
  if (month <= 9) return 'Q3'
  return 'Q4'
}

/**
 * Prefills task fields from selected product operation.
 * Values are editable in UI after being applied.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {{ productId: string; operationId: string; dueDate: string }} input
 */
export function buildTaskDefaultsFromOperation(db, input) {
  const operation = selectOperationById(db, input.operationId)
  if (!operation || operation.productId !== input.productId) {
    return null
  }
  return {
    assigneeId: operation.ownerId,
    phaseId: /** @type {import('../../domains/lifecycle/model.js').LifecyclePhaseId} */ ('production'),
    workstream: /** @type {import('../../domains/tasks/model.js').TaskWorkstream} */ ('manufacturing'),
    plannedYear: Number.parseInt(input.dueDate.slice(0, 4), 10),
    plannedQuarter: quarterFromIsoDate(input.dueDate),
    operationId: operation.id,
    operationOwnerId: operation.ownerId,
    defaultMachineId: operation.machineId,
    stationCode: operation.stationCode,
    siloId: operation.siloId,
    siloLabel: operation.silo,
    plannedDurationMinutes: operation.standardMinutes,
    operationKpiTargetSnapshot: operation.dailyKpiTarget ? { ...operation.dailyKpiTarget } : undefined,
  }
}
