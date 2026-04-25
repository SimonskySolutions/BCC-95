/**
 * @param {{ tasks: import('./model.js').Task[] }} db
 * @param {string} employeeId
 * @returns {import('./model.js').Task[]}
 */
export function selectTasksByEmployee(db, employeeId) {
  return db.tasks.filter((t) => t.assigneeId === employeeId)
}

/**
 * @param {{ tasks: import('./model.js').Task[] }} db
 * @param {string} productId
 * @returns {import('./model.js').Task[]}
 */
export function selectTasksByProduct(db, productId) {
  return db.tasks.filter((t) => t.productId === productId)
}

/**
 * @param {{ tasks: import('./model.js').Task[] }} db
 * @param {Date | string} referenceDate
 * @returns {import('./model.js').Task[]}
 */
export function selectOverdueTasks(db, referenceDate) {
  const ref = referenceDate instanceof Date ? referenceDate : new Date(referenceDate)
  const endOfRefDay = new Date(ref)
  endOfRefDay.setHours(23, 59, 59, 999)
  return db.tasks.filter((t) => {
    if (t.status === 'resolved') return false
    return new Date(t.dueDate) < endOfRefDay
  })
}

/**
 * @param {{ tasks: import('./model.js').Task[] }} db
 * @param {number} year
 * @param {import('./model.js').PlannedQuarter} quarter
 * @returns {import('./model.js').Task[]}
 */
export function selectTasksByQuarter(db, year, quarter) {
  return db.tasks.filter((t) => t.plannedYear === year && t.plannedQuarter === quarter)
}

/**
 * Quarter order index 1-4.
 * @param {import('./model.js').PlannedQuarter} q
 */
function quarterIndex(q) {
  return Number(q.replace('Q', ''))
}

/**
 * True if task's planned slot is strictly before the given year/quarter.
 * @param {import('./model.js').Task} t
 * @param {number} year
 * @param {import('./model.js').PlannedQuarter} quarter
 */
function isPlannedBeforeQuarter(t, year, quarter) {
  if (t.plannedYear < year) return true
  if (t.plannedYear > year) return false
  return quarterIndex(t.plannedQuarter) < quarterIndex(quarter)
}

/**
 * @param {{ tasks: import('./model.js').Task[] }} db
 * @param {number} year
 * @param {import('./model.js').PlannedQuarter} quarter
 * @param {Date | string} [referenceDate]
 */
export function selectQuarterPlanHealth(db, year, quarter, referenceDate = new Date()) {
  const ref = referenceDate instanceof Date ? referenceDate : new Date(referenceDate)
  const endOfRefDay = new Date(ref)
  endOfRefDay.setHours(23, 59, 59, 999)

  const inQuarter = selectTasksByQuarter(db, year, quarter)
  const planned = inQuarter.length
  const completed = inQuarter.filter((t) => t.status === 'resolved').length
  const overdue = inQuarter.filter(
    (t) => t.status !== 'resolved' && new Date(t.dueDate) < endOfRefDay,
  ).length
  const carryover = db.tasks.filter(
    (t) =>
      isPlannedBeforeQuarter(t, year, quarter) &&
      (t.status === 'draft' || t.status === 'in_progress' || t.status === 'blocked'),
  ).length

  return { planned, completed, overdue, carryover, inQuarter }
}
