/**
 * @param {{
 *   shiftAssignments: import('./model.js').ShiftAssignment[]
 * }} db
 * @param {string} date — yyyy-mm-dd
 * @returns {import('./model.js').ShiftAssignment[]}
 */
export function selectShiftAssignmentsByDate(db, date) {
  return db.shiftAssignments.filter((a) => a.date === date)
}

/**
 * @param {{
 *   stationAssignments: import('./model.js').StationAssignment[]
 * }} db
 * @param {string} date
 * @returns {import('./model.js').StationAssignment[]}
 */
export function selectStationAssignmentsByDate(db, date) {
  return db.stationAssignments.filter((a) => a.date === date)
}

/**
 * @param {{
 *   operationExecutionActuals: import('./model.js').OperationExecutionActual[]
 * }} db
 * @param {string} date
 * @returns {import('./model.js').OperationExecutionActual[]}
 */
export function selectOperationActualsByDate(db, date) {
  return db.operationExecutionActuals.filter((a) => a.date === date)
}

/**
 * @param {{
 *   shiftAssignments: import('./model.js').ShiftAssignment[]
 *   employees?: { id: string; name?: string }[]
 * }} db
 * @param {string} date
 * @returns {import('./model.js').ShiftAssignment[]}
 */
export function selectShiftAssignmentsByDateForEmployee(db, date, employeeId) {
  return db.shiftAssignments.filter((a) => a.date === date && a.employeeId === employeeId)
}

/**
 * Join station assignments on date with optional employee filter.
 * @param {{
 *   stationAssignments: import('./model.js').StationAssignment[]
 * }} db
 * @param {string} date
 * @param {string} [employeeId]
 */
export function selectStationAssignmentsByDateJoined(db, date, employeeId) {
  let rows = selectStationAssignmentsByDate(db, date)
  if (employeeId) rows = rows.filter((r) => r.employeeId === employeeId)
  return rows
}
