/**
 * Node functional checks: selectors, phase transitions, KPI helpers.
 */
import assert from 'node:assert/strict'
import { createMockDatabase } from '../src/data/mockDatabase.js'
import {
  selectOverdueTasks,
  selectQuarterPlanHealth,
  selectTasksByEmployee,
  selectTasksByProduct,
  selectTasksByQuarter,
} from '../src/domains/tasks/selectors.js'
import { appendTask, validateTaskCreate } from '../src/domains/tasks/mutations.js'
import { selectOperationsByProduct } from '../src/domains/operations/selectors.js'
import { validatePhaseTransition } from '../src/services/lifecycle/phaseTransitionService.js'
import {
  computeDeliveryMetrics,
  computeProcessHealthMetrics,
  computeQualityMetrics,
} from '../src/services/kpis/kpiCalculator.js'
import { selectClientProfileBundle } from '../src/domains/crm/selectors.js'
import { selectShippingDispatchSummary } from '../src/domains/shipping/selectors.js'
import {
  selectLinesByPurchaseOrder,
  selectOpenPurchaseOrders,
} from '../src/domains/purchase/selectors.js'
import {
  evaluateQuotationTaskReadiness,
  generateQuoteFromReadiness,
} from '../src/services/quotations/quotationAutomationService.js'
import {
  createStationAssignment,
  createExecutionActualEntry,
  applyExecutionActualToTask,
} from '../src/domains/shifts/mutations.js'
import { computeDailyOperationKpis } from '../src/services/operations/dailyOperationKpiService.js'
import { buildTaskDefaultsFromOperation } from '../src/services/tasks/taskAutofillService.js'

const db = createMockDatabase()

console.log('--- Selectors ---')
const byEmp = selectTasksByEmployee(db, 'emp-1')
assert.ok(byEmp.length >= 2, 'emp-1 should have at least 2 tasks')
assert.ok(byEmp.every((t) => t.assigneeId === 'emp-1'))

const byProd = selectTasksByProduct(db, 'prod-1')
assert.ok(byProd.length >= 2)

const overdue = selectOverdueTasks(db, new Date('2026-04-10'))
assert.ok(overdue.some((t) => t.id === 'task-2'), 'task-2 should be overdue vs 2026-04-10')

const ops = selectOperationsByProduct(db, 'prod-1')
assert.deepEqual(
  ops.map((o) => o.sequence),
  [1, 2, 3, 4],
  'operations should be ordered by sequence',
)
console.log('selectTasksByEmployee / selectTasksByProduct / selectOverdueTasks / selectOperationsByProduct: OK')

console.log('--- Task quarter selectors & create validation ---')
const q2Tasks = selectTasksByQuarter(db, 2026, 'Q2')
assert.ok(q2Tasks.length >= 3)
const health = selectQuarterPlanHealth(db, 2026, 'Q2', new Date('2026-04-10'))
assert.equal(typeof health.planned, 'number')
assert.ok(health.planned >= q2Tasks.length - 1)

const bad = validateTaskCreate(db, {
  title: 'x',
  assigneeId: 'emp-1',
  productId: 'nope',
  dueDate: '2026-05-01',
  plannedYear: 2026,
  plannedQuarter: 'Q2',
  phaseId: 'production',
  workstream: 'planning',
})
assert.equal(bad.ok, false)
assert.ok(bad.errors.includes('product_invalid'))

const good = validateTaskCreate(db, {
  title: 'Validation task',
  assigneeId: 'emp-1',
  productId: 'prod-1',
  dueDate: '2026-06-01',
  plannedYear: 2026,
  plannedQuarter: 'Q3',
  phaseId: 'quality',
  workstream: 'quality',
})
assert.equal(good.ok, true)
if (good.ok) appendTask(db, good.task)
assert.ok(db.tasks.some((t) => t.title === 'Validation task'))
console.log('quarter selectors / create validation: OK')

console.log('--- Phase transitions ---')
const skip = validatePhaseTransition(db, 'prod-1', 'released')
assert.equal(skip.ok, false)
assert.equal(skip.code, 'invalid_transition')

const blocked = validatePhaseTransition(db, 'prod-2', 'released')
assert.equal(blocked.ok, false)
assert.equal(blocked.code, 'blocked')

const phaseTasksIncomplete = validatePhaseTransition(db, 'prod-1', 'quality')
assert.equal(phaseTasksIncomplete.ok, false)
assert.equal(phaseTasksIncomplete.code, 'phase_tasks_incomplete')

const prod1ProductionOpen = db.tasks.filter(
  (t) => t.productId === 'prod-1' && t.phaseId === 'production' && t.status !== 'resolved',
)
assert.ok(prod1ProductionOpen.length >= 1)
for (const t of prod1ProductionOpen) {
  t.status = 'resolved'
  t.completedAt = '2026-02-14'
}

const okMove = validatePhaseTransition(db, 'prod-1', 'quality')
assert.equal(okMove.ok, true)
console.log('phase transition validation: OK')

console.log('--- KPI helpers (data-driven) ---')
const delivery = computeDeliveryMetrics(db, new Date('2026-04-10'))
assert.ok(delivery.scoredDoneSamples >= 2)
assert.equal(delivery.onTimeDoneRatioPercent, 100)

const quality = computeQualityMetrics(db)
assert.equal(quality.sampleCount, db.qualityIncidents.length)
assert.equal(quality.firstPassYieldPercent, 50)

const process = computeProcessHealthMetrics(db)
assert.ok(process.productCount > 0)
assert.ok(typeof process.avgCompletionPercent === 'number')
console.log('KPI helpers: OK')

console.log('--- Quotation readiness ---')
let readiness = evaluateQuotationTaskReadiness(db, { quoteId: 'quote-1', productId: 'prod-1' })
assert.equal(readiness.ready, false)
assert.ok(readiness.pendingKeys.includes('quote-costing-prod-1'))
let gen = generateQuoteFromReadiness(db, { clientId: 'client-1', productId: 'prod-1', quoteId: 'quote-1' })
assert.equal(gen.ok, false)
assert.equal(gen.code, 'tasks_incomplete')

const costingTask = db.tasks.find((t) => t.taskKey === 'quote-costing-prod-1')
assert.ok(costingTask)
costingTask.status = 'resolved'
costingTask.completedAt = '2026-04-10'
readiness = evaluateQuotationTaskReadiness(db, { quoteId: 'quote-1', productId: 'prod-1' })
assert.equal(readiness.ready, true)
gen = generateQuoteFromReadiness(db, { clientId: 'client-1', productId: 'prod-1', quoteId: 'quote-1' })
assert.equal(gen.ok, true)
assert.ok(gen.draft.subtotal > 0)
console.log('quotation readiness: OK')

console.log('--- CRM profile bundle ---')
const bundle = selectClientProfileBundle(db, 'client-1')
assert.ok(bundle)
assert.equal(bundle.client.id, 'client-1')
assert.ok(bundle.orders.length >= 1)
assert.ok(bundle.lines.length >= 1)
assert.ok(bundle.payments.length >= 1)
assert.ok(bundle.schematics.length >= 1)
console.log('CRM profile bundle: OK')

console.log('--- Shipping / Purchase ---')
const ship = selectShippingDispatchSummary(db)
assert.ok(ship.dispatchedCount >= 1)
assert.ok(typeof ship.onTimePercent === 'number')
assert.ok(Array.isArray(ship.blocked))

const openPo = selectOpenPurchaseOrders(db)
assert.ok(openPo.length >= 1)
const pol = selectLinesByPurchaseOrder(db, 'po-1')
assert.ok(pol.length >= 1)
console.log('shipping / purchase: OK')

console.log('--- Task operation autofill ---')
const autofill = buildTaskDefaultsFromOperation(db, {
  productId: 'prod-1',
  operationId: 'op-3',
  dueDate: '2026-04-30',
})
assert.ok(autofill)
assert.equal(autofill.phaseId, 'production')
assert.equal(autofill.workstream, 'manufacturing')
assert.equal(autofill.plannedYear, 2026)
assert.equal(autofill.plannedQuarter, 'Q2')
assert.equal(autofill.operationId, 'op-3')
console.log('task operation autofill: OK')

console.log('--- Shift station assignment, execution actuals, operation KPI ---')
const dbShift = createMockDatabase()
const stnRes = createStationAssignment(dbShift, {
  date: '2026-06-01',
  employeeId: 'emp-3',
  stationCode: 'ST-VAL-1',
  machineId: 'mach-2',
  operationId: 'op-4',
  ownerId: 'emp-1',
})
assert.equal(stnRes.ok, true)
if (!stnRes.ok) throw new Error('station assignment expected ok')
const { stationAssignment } = stnRes
const linkedExec = dbShift.tasks.find((t) => t.id === stationAssignment.taskId)
const linkedOwner = dbShift.tasks.find((t) => t.id === stationAssignment.ownerTaskId)
assert.ok(linkedExec, 'employee execution task should be created or linked')
assert.ok(linkedOwner, 'owner oversight task should be created or linked')
assert.equal(linkedExec.assigneeId, 'emp-3')
assert.equal(linkedOwner.assigneeId, 'emp-1')
assert.equal(linkedExec.operationId, 'op-4')

const actualRes = createExecutionActualEntry(dbShift, {
  date: '2026-06-01',
  stationAssignmentId: stationAssignment.id,
  ownerId: 'emp-1',
  actualGoodQty: 12,
  actualScrapQty: 1,
  actualDurationMinutes: 90,
  actualEnd: '2026-06-01T15:00:00',
})
assert.equal(actualRes.ok, true)
if (!actualRes.ok) throw new Error('execution actual expected ok')
const applyRes = applyExecutionActualToTask(dbShift, actualRes.actual)
assert.equal(applyRes.ok, true)
if (!applyRes.ok) throw new Error('apply actual expected ok')
assert.equal(applyRes.task.actualGoodQty, 12)
assert.equal(applyRes.task.status, 'resolved')

const kpisDay = computeDailyOperationKpis(dbShift, '2026-06-01')
const op4Row = kpisDay.find((k) => k.operationId === 'op-4')
assert.ok(op4Row, 'KPI row for op-4 on 2026-06-01')
assert.equal(op4Row.actualGoodQty, 12)
assert.ok(op4Row.plannedTargetUnits > 0, 'uses operation-owned target units')
assert.ok(typeof op4Row.defectRatePercent === 'number')

const kpisSeed = computeDailyOperationKpis(createMockDatabase(), '2026-04-11')
const op3Row = kpisSeed.find((k) => k.operationId === 'op-3')
assert.ok(op3Row)
assert.ok(op3Row.actualGoodQty >= 88, 'seed actual should roll into op-3 KPI')
console.log('shift / execution / operation KPI: OK')

console.log('\nAll functional checks passed.')
