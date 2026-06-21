/**
 * Jira-like task statuses used across phases/workstreams.
 * @typedef {'draft' | 'in_progress' | 'resolved' | 'blocked'} TaskStatus
 */

/**
 * @typedef {'Q1' | 'Q2' | 'Q3' | 'Q4'} PlannedQuarter
 */

/**
 * @typedef {'quotation' | 'planning' | 'manufacturing' | 'shipping' | 'quality'} TaskWorkstream
 */

/**
 * @typedef {Object} Task
 * @property {string} id
 * @property {string} taskKey — stable business key (e.g. quote-gate)
 * @property {string} title
 * @property {string} assigneeId — employee id
 * @property {string} productId
 * @property {string} dueDate — ISO date (yyyy-mm-dd)
 * @property {TaskStatus} status
 * @property {number} plannedYear
 * @property {PlannedQuarter} plannedQuarter
 * @property {import('../lifecycle/model.js').LifecyclePhaseId} phaseId
 * @property {TaskWorkstream} workstream
 * @property {string} [priority]                — 'low' | 'medium' | 'high' | 'urgent'
 * @property {string} [description]              — free-text details
 * @property {string[]} [labels]                 — freeform tags
 * @property {{ id: string; name: string; size?: number }[]} [attachments]   — file references
 * @property {{ id: string; title: string; done: boolean }[]} [subtasks]     — checklist
 * @property {string} [completedAt]
 * @property {string} [quoteId]
 * @property {string} [orderId]
 * @property {string} [operationId] — shop-floor link to manufacturing operation
 * @property {string} [assignmentDate] — ISO date for same-day execution / oversight tasks
 * @property {string} [actualStart]
 * @property {string} [actualEnd]
 * @property {number} [actualDurationMinutes]
 * @property {number} [actualGoodQty]
 * @property {number} [actualScrapQty]
 * @property {number} [actualDowntimeMinutes]
 * @property {string} [actualDowntimeReason]
 * @property {string} [actualMachineId]
 * @property {string} [executionNote]
 * @property {string} [operationOwnerId]
 * @property {string} [defaultMachineId]
 * @property {string} [stationCode]
 * @property {string} [siloId]
 * @property {string} [siloLabel]
 * @property {number} [plannedDurationMinutes]
 * @property {{ targetUnitsPerShift: number; maxDefectRatePercent: number; targetCycleMinutes: number }} [operationKpiTargetSnapshot]
 */

/** @type {TaskStatus[]} */
export const TASK_STATUSES = ['draft', 'in_progress', 'resolved', 'blocked']

/** @type {string[]} */
export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent']

/** @type {PlannedQuarter[]} */
export const PLANNED_QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']

/** @type {TaskWorkstream[]} */
export const TASK_WORKSTREAMS = ['quotation', 'planning', 'manufacturing', 'shipping', 'quality']
