/**
 * @param {{ employees: import('./model.js').Employee[] }} db
 * @param {string} employeeId
 * @returns {import('./model.js').Employee | undefined}
 */
export function selectEmployeeById(db, employeeId) {
  return db.employees.find((e) => e.id === employeeId)
}
