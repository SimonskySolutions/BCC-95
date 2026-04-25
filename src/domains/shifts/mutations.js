import { selectProductById } from '../products/selectors.js'
import { selectEmployeeById } from '../people/selectors.js'
import { selectMachineById } from '../machines/selectors.js'
import { selectOperationById } from '../operations/selectors.js'
import { appendTask, createTaskDraft } from '../tasks/mutations.js'

let shiftAssignmentId = 200
let stationAssignmentId = 300
let executionActualId = 400

/**
 * @param {string} isoDate
 * @returns {import('../tasks/model.js').PlannedQuarter}
 */
function plannedQuarterFromIsoDate(isoDate) {
  const m = Number.parseInt(isoDate.slice(5, 7), 10)
  if (m <= 3) return 'Q1'
  if (m <= 6) return 'Q2'
  if (m <= 9) return 'Q3'
  return 'Q4'
}

/**
 * Ensures employee execution task and owner oversight task for operation/day; creates if missing.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {{
 *   date: string
 *   employeeId: string
 *   ownerId: string
 *   operationId: string
 * }} input
 * @returns {{ ok: true; taskId: string; ownerTaskId: string } | { ok: false; errors: string[] }}
 */
export function ensureOwnerAndEmployeeTasksForOperationDay(db, input) {
  const errors = []
  const op = selectOperationById(db, input.operationId)
  if (!op) errors.push('operation_not_found')
  if (!selectEmployeeById(db, input.employeeId)) errors.push('employee_not_found')
  if (!selectEmployeeById(db, input.ownerId)) errors.push('owner_not_found')
  if (!op?.productId || !selectProductById(db, op.productId)) errors.push('product_invalid')
  if (errors.length) return { ok: false, errors }

  const { date, employeeId, ownerId, operationId } = input
  const year = Number.parseInt(date.slice(0, 4), 10)

  let execTask = db.tasks.find(
    (t) =>
      t.assigneeId === employeeId &&
      t.productId === op.productId &&
      t.operationId === operationId &&
      t.assignmentDate === date,
  )
  if (!execTask) {
    execTask = createTaskDraft({
      title: `Shop floor: ${op.name}`,
      assigneeId: employeeId,
      productId: op.productId,
      dueDate: date,
      plannedYear: year,
      plannedQuarter: plannedQuarterFromIsoDate(date),
      phaseId: 'production',
      workstream: 'manufacturing',
      operationId,
      assignmentDate: date,
    })
    appendTask(db, execTask)
  }

  let ownerTask = db.tasks.find(
    (t) =>
      t.assigneeId === ownerId &&
      t.productId === op.productId &&
      t.operationId === operationId &&
      t.assignmentDate === date &&
      t.id !== execTask.id,
  )
  if (!ownerTask) {
    ownerTask = createTaskDraft({
      title: `Oversight: ${op.name} (${date})`,
      assigneeId: ownerId,
      productId: op.productId,
      dueDate: date,
      plannedYear: year,
      plannedQuarter: plannedQuarterFromIsoDate(date),
      phaseId: 'production',
      workstream: 'manufacturing',
      operationId,
      assignmentDate: date,
    })
    appendTask(db, ownerTask)
  }

  return { ok: true, taskId: execTask.id, ownerTaskId: ownerTask.id }
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {{ employeeId: string; date: string; shiftTemplateId: string; id?: string }}
 */
export function createShiftAssignment(db, input) {
  const errors = []
  if (!input.employeeId) errors.push('employee_required')
  if (!input.date) errors.push('date_required')
  if (!input.shiftTemplateId) errors.push('shiftTemplate_required')
  if (!selectEmployeeById(db, input.employeeId)) errors.push('employee_invalid')
  const tpl = db.shiftTemplates.find((s) => s.id === input.shiftTemplateId)
  if (!tpl) errors.push('shiftTemplate_invalid')
  if (errors.length) return { ok: false, errors }

  const row = {
    id: input.id ?? `sa-${++shiftAssignmentId}`,
    employeeId: input.employeeId,
    date: input.date,
    shiftTemplateId: input.shiftTemplateId,
  }
  db.shiftAssignments.push(row)
  return { ok: true, shiftAssignment: row }
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {{
 *   date: string
 *   employeeId: string
 *   stationCode: string
 *   machineId: string
 *   operationId: string
 *   ownerId: string
 *   id?: string
 * }}
 */
export function createStationAssignment(db, input) {
  const errors = []
  if (!input.date) errors.push('date_required')
  if (!input.employeeId) errors.push('employee_required')
  if (!input.stationCode?.trim()) errors.push('stationCode_required')
  if (!input.machineId) errors.push('machine_required')
  if (!input.operationId) errors.push('operation_required')
  if (!input.ownerId) errors.push('owner_required')
  if (!selectMachineById(db, input.machineId)) errors.push('machine_invalid')
  const linked = ensureOwnerAndEmployeeTasksForOperationDay(db, {
    date: input.date,
    employeeId: input.employeeId,
    ownerId: input.ownerId,
    operationId: input.operationId,
  })
  if (!linked.ok) return linked

  const row = {
    id: input.id ?? `stn-${++stationAssignmentId}`,
    date: input.date,
    employeeId: input.employeeId,
    stationCode: input.stationCode.trim(),
    machineId: input.machineId,
    operationId: input.operationId,
    ownerId: input.ownerId,
    taskId: linked.taskId,
    ownerTaskId: linked.ownerTaskId,
  }
  db.stationAssignments.push(row)
  return { ok: true, stationAssignment: row }
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {Omit<import('./model.js').OperationExecutionActual, 'id'> & { id?: string }} input
 */
export function createExecutionActualEntry(db, input) {
  const errors = []
  const stn = db.stationAssignments.find((s) => s.id === input.stationAssignmentId)
  if (!stn) errors.push('stationAssignment_not_found')
  if (input.ownerId != null && stn && input.ownerId !== stn.ownerId) errors.push('owner_mismatch')
  if (!input.date) errors.push('date_required')
  if (errors.length) return { ok: false, errors }

  const row = {
    id: input.id ?? `act-${++executionActualId}`,
    date: input.date,
    stationAssignmentId: input.stationAssignmentId,
    operationId: stn.operationId,
    employeeId: stn.employeeId,
    ownerId: stn.ownerId,
    actualStart: input.actualStart,
    actualEnd: input.actualEnd,
    actualDurationMinutes: input.actualDurationMinutes,
    actualGoodQty: input.actualGoodQty,
    actualScrapQty: input.actualScrapQty,
    actualDowntimeMinutes: input.actualDowntimeMinutes,
    actualDowntimeReason: input.actualDowntimeReason,
    actualMachineId: input.actualMachineId ?? stn.machineId,
    executionNote: input.executionNote,
    linkedTaskId: stn.taskId,
  }
  db.operationExecutionActuals.push(row)
  return { ok: true, actual: row }
}

/**
 * Merges execution actual onto the linked employee task and advances status when appropriate.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {import('./model.js').OperationExecutionActual} actualEntry
 * @returns {{ ok: true; task: import('../tasks/model.js').Task } | { ok: false; errors: string[] }}
 */
export function applyExecutionActualToTask(db, actualEntry) {
  const task = db.tasks.find((t) => t.id === actualEntry.linkedTaskId)
  if (!task) return { ok: false, errors: ['task_not_found'] }

  if (actualEntry.actualStart != null) task.actualStart = actualEntry.actualStart
  if (actualEntry.actualEnd != null) task.actualEnd = actualEntry.actualEnd
  if (actualEntry.actualDurationMinutes != null) task.actualDurationMinutes = actualEntry.actualDurationMinutes
  if (actualEntry.actualGoodQty != null) task.actualGoodQty = actualEntry.actualGoodQty
  if (actualEntry.actualScrapQty != null) task.actualScrapQty = actualEntry.actualScrapQty
  if (actualEntry.actualDowntimeMinutes != null) task.actualDowntimeMinutes = actualEntry.actualDowntimeMinutes
  if (actualEntry.actualDowntimeReason != null) task.actualDowntimeReason = actualEntry.actualDowntimeReason
  if (actualEntry.actualMachineId != null) task.actualMachineId = actualEntry.actualMachineId
  if (actualEntry.executionNote != null) task.executionNote = actualEntry.executionNote

  const hasWork =
    (actualEntry.actualGoodQty ?? 0) > 0 ||
    (actualEntry.actualScrapQty ?? 0) > 0 ||
    (actualEntry.actualDurationMinutes ?? 0) > 0

  if (hasWork && task.status === 'draft') {
    task.status = 'in_progress'
  }

  const qtyTotal = (actualEntry.actualGoodQty ?? 0) + (actualEntry.actualScrapQty ?? 0)
  if (actualEntry.actualEnd && qtyTotal > 0) {
    task.status = 'resolved'
    task.completedAt = actualEntry.actualEnd.slice(0, 10)
  }

  return { ok: true, task }
}
