/**
 * @typedef {'queued' | 'in_progress' | 'done' | 'blocked'} OperationStatus
 */

/**
 * Per-shift planning targets for operation-owned KPIs.
 * @typedef {Object} OperationDailyKpiTarget
 * @property {number} targetUnitsPerShift
 * @property {number} maxDefectRatePercent
 * @property {number} targetCycleMinutes
 */

/**
 * @typedef {Object} Operation
 * @property {string} id
 * @property {string} productId
 * @property {number} sequence
 * @property {string} name
 * @property {string} stepCode
 * @property {OperationStatus} status
 * @property {string} [machineId]
 * @property {number} standardMinutes
 * @property {string} [siloId]
 * @property {string} [silo]
 * @property {string} [ownerId] — employee id
 * @property {OperationDailyKpiTarget} dailyKpiTarget
 * @property {string} [stationCode]
 */

/** @type {OperationStatus[]} */
export const OPERATION_STATUSES = ['queued', 'in_progress', 'done', 'blocked']
