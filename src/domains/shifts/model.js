/**
 * @typedef {Object} ShiftTemplate
 * @property {string} id
 * @property {string} label
 * @property {string} startTime
 * @property {string} endTime
 */

/**
 * @typedef {Object} ShiftAssignment
 * @property {string} id
 * @property {string} employeeId
 * @property {string} date — ISO yyyy-mm-dd
 * @property {string} shiftTemplateId
 */

/**
 * @typedef {Object} StationAssignment
 * @property {string} id
 * @property {string} date — ISO yyyy-mm-dd
 * @property {string} employeeId
 * @property {string} stationCode
 * @property {string} machineId
 * @property {string} operationId
 * @property {string} ownerId — operation owner (employee id)
 * @property {string} taskId — linked employee execution task
 * @property {string} ownerTaskId — linked owner oversight task
 */

/**
 * @typedef {Object} OperationExecutionActual
 * @property {string} id
 * @property {string} date — ISO yyyy-mm-dd
 * @property {string} stationAssignmentId
 * @property {string} operationId
 * @property {string} employeeId
 * @property {string} ownerId
 * @property {string} [actualStart] — ISO datetime or time
 * @property {string} [actualEnd]
 * @property {number} [actualDurationMinutes]
 * @property {number} [actualGoodQty]
 * @property {number} [actualScrapQty]
 * @property {number} [actualDowntimeMinutes]
 * @property {string} [actualDowntimeReason]
 * @property {string} [actualMachineId]
 * @property {string} [executionNote]
 * @property {string} linkedTaskId — employee task updated by applyExecutionActualToTask
 */
