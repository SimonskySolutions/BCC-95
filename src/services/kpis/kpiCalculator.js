import { selectOverdueTasks, selectQuarterPlanHealth, selectTasksByEmployee } from '../../domains/tasks/selectors.js'

/**
 * End of calendar day in local time for due-date strings (yyyy-mm-dd).
 * @param {string} isoDate
 */
function endOfDueDate(isoDate) {
  const d = new Date(`${isoDate}T23:59:59`)
  return d
}

/**
 * Delivery: on-time completion for done tasks (requires completedAt) and overdue open backlog.
 * @param {{ tasks: { status: string; dueDate: string; completedAt?: string }[] }} db
 * @param {Date | string} referenceDate — "as of" date for overdue/open counts
 */
export function computeDeliveryMetrics(db, referenceDate) {
  const ref = referenceDate instanceof Date ? referenceDate : new Date(referenceDate)
  const relevant = db.tasks
  const resolved = relevant.filter((t) => t.status === 'resolved')
  const withCompletion = resolved.filter((t) => Boolean(t.completedAt))
  const onTimeDone = withCompletion.filter(
    (t) => new Date(t.completedAt) <= endOfDueDate(t.dueDate),
  )
  const onTimeRate =
    withCompletion.length === 0
      ? 0
      : Math.round((onTimeDone.length / withCompletion.length) * 1000) / 10
  const overdueOpen = selectOverdueTasks(db, ref).length
  const open = relevant.filter((t) => t.status !== 'resolved').length
  return {
    totalActive: relevant.length,
    doneCount: resolved.length,
    openCount: open,
    overdueOpenCount: overdueOpen,
    onTimeDoneRatioPercent: onTimeRate,
    scoredDoneSamples: withCompletion.length,
  }
}

/**
 * Productivity: operations completed vs total operations in dataset.
 * @param {{ operations: { status: string }[] }} db
 */
export function computeProductivityMetrics(db) {
  const total = db.operations.length
  const done = db.operations.filter((o) => o.status === 'done').length
  return {
    operationDoneCount: done,
    operationTotal: total,
    operationThroughputPercent: total === 0 ? 0 : Math.round((done / total) * 1000) / 10,
  }
}

/**
 * Quality: first-pass yield from quality incident log.
 * @param {{ qualityIncidents: { failedFirstPass: boolean }[] }} db
 */
export function computeQualityMetrics(db) {
  const rows = db.qualityIncidents
  if (rows.length === 0) return { firstPassYieldPercent: 100, failCount: 0, sampleCount: 0 }
  const failCount = rows.filter((r) => r.failedFirstPass).length
  const yieldPct = Math.round(((rows.length - failCount) / rows.length) * 1000) / 10
  return { firstPassYieldPercent: yieldPct, failCount, sampleCount: rows.length }
}

/**
 * Workload: open tasks per employee (assignee).
 * @param {{ tasks: { assigneeId: string; status: string }[]; employees: { id: string }[] }} db
 */
export function computeWorkloadByEmployee(db) {
  return db.employees.map((e) => {
    const mine = selectTasksByEmployee(db, e.id)
    const open = mine.filter((t) => t.status !== 'resolved').length
    return { employeeId: e.id, openTaskCount: open }
  })
}

/**
 * Process: average lifecycle completion across products with state.
 * @param {{ productLifecycleStates: { completionPercent: number }[] }} db
 */
export function computeProcessHealthMetrics(db) {
  const rows = db.productLifecycleStates
  if (rows.length === 0) return { avgCompletionPercent: 0, productCount: 0 }
  const sum = rows.reduce((acc, r) => acc + r.completionPercent, 0)
  return {
    avgCompletionPercent: Math.round((sum / rows.length) * 10) / 10,
    productCount: rows.length,
  }
}

/**
 * Quarterly task plan health for reporting (planned quarter fields).
 * @param {{ tasks: import('../../domains/tasks/model.js').Task[] }} db
 * @param {number} year
 * @param {import('../../domains/tasks/model.js').PlannedQuarter} quarter
 * @param {Date | string} referenceDate
 */
export function computeQuarterlyTaskPlanMetrics(db, year, quarter, referenceDate) {
  const h = selectQuarterPlanHealth(db, year, quarter, referenceDate)
  const completionRatePercent =
    h.planned === 0 ? 100 : Math.round((h.completed / h.planned) * 1000) / 10
  return {
    year,
    quarter,
    planned: h.planned,
    completed: h.completed,
    overdue: h.overdue,
    carryover: h.carryover,
    completionRatePercent,
  }
}
