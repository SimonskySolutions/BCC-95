import { selectProductById } from '../products/selectors.js'
import { isLifecyclePhaseId } from '../lifecycle/model.js'

/**
 * @typedef {Object} TaskCreateInput
 * @property {string} title
 * @property {string} assigneeId
 * @property {string} productId
 * @property {string} dueDate
 * @property {number} plannedYear
 * @property {import('./model.js').PlannedQuarter} plannedQuarter
 * @property {import('../lifecycle/model.js').LifecyclePhaseId} phaseId
 * @property {import('./model.js').TaskWorkstream} workstream
 * @property {string} [priority]
 * @property {string} [quoteId]
 * @property {string} [orderId]
 * @property {string} [operationId]
 * @property {string} [assignmentDate]
 * @property {string} [operationOwnerId]
 * @property {string} [defaultMachineId]
 * @property {string} [stationCode]
 * @property {string} [siloId]
 * @property {string} [siloLabel]
 * @property {number} [plannedDurationMinutes]
 * @property {{ targetUnitsPerShift: number; maxDefectRatePercent: number; targetCycleMinutes: number }} [operationKpiTargetSnapshot]
 */

let idCounter = 9000

/**
 * @param {TaskCreateInput} input
 * @param {string} [id]
 * @returns {import('./model.js').Task}
 */
export function createTaskDraft(input, id) {
  const taskId = id ?? `task-${++idCounter}`
  const slug = input.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  return {
    id: taskId,
    taskKey: `${slug}-${taskId}`,
    title: input.title,
    assigneeId: input.assigneeId,
    productId: input.productId,
    dueDate: input.dueDate,
    status: 'draft',
    plannedYear: input.plannedYear,
    plannedQuarter: input.plannedQuarter,
    phaseId: input.phaseId,
    workstream: input.workstream,
    priority: input.priority,
    quoteId: input.quoteId,
    orderId: input.orderId,
    ...(input.operationId != null ? { operationId: input.operationId } : {}),
    ...(input.assignmentDate != null ? { assignmentDate: input.assignmentDate } : {}),
    ...(input.operationOwnerId != null ? { operationOwnerId: input.operationOwnerId } : {}),
    ...(input.defaultMachineId != null ? { defaultMachineId: input.defaultMachineId } : {}),
    ...(input.stationCode != null ? { stationCode: input.stationCode } : {}),
    ...(input.siloId != null ? { siloId: input.siloId } : {}),
    ...(input.siloLabel != null ? { siloLabel: input.siloLabel } : {}),
    ...(input.plannedDurationMinutes != null ? { plannedDurationMinutes: input.plannedDurationMinutes } : {}),
    ...(input.operationKpiTargetSnapshot != null ? { operationKpiTargetSnapshot: { ...input.operationKpiTargetSnapshot } } : {}),
  }
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {TaskCreateInput} input
 * @returns {{ ok: true; task: import('./model.js').Task } | { ok: false; errors: string[] }}
 */
export function validateTaskCreate(db, input) {
  const errors = []
  if (!input.title?.trim()) errors.push('title_required')
  if (!input.assigneeId) errors.push('assignee_required')
  if (!input.dueDate) errors.push('dueDate_required')
  if (!Number.isFinite(input.plannedYear)) errors.push('plannedYear_required')
  if (!input.plannedQuarter) errors.push('plannedQuarter_required')
  if (!input.phaseId) {
    errors.push('phase_required')
  } else if (!isLifecyclePhaseId(input.phaseId)) {
    errors.push('phase_invalid')
  }
  if (!input.workstream) errors.push('workstream_required')
  if (!input.productId) {
    errors.push('productId_required')
  } else if (!selectProductById(db, input.productId)) {
    errors.push('product_invalid')
  }
  if (errors.length) return { ok: false, errors }
  return { ok: true, task: createTaskDraft(input) }
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {import('./model.js').Task} task
 */
export function appendTask(db, task) {
  db.tasks.push(task)
}
