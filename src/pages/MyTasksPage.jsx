import { useMemo, useState } from 'react'
import TaskTable from '../components/erp/TaskTable.jsx'
import {
  selectOverdueTasks,
  selectTasksByEmployee,
  selectTasksByQuarter,
} from '../domains/tasks/selectors.js'
import { computeQuarterlyTaskPlanMetrics } from '../services/kpis/kpiCalculator.js'
import { appendTask, validateTaskCreate } from '../domains/tasks/mutations.js'
import { PLANNED_QUARTERS, TASK_WORKSTREAMS } from '../domains/tasks/model.js'
import { LIFECYCLE_PHASE_ORDER } from '../domains/lifecycle/model.js'
import { selectOperationsByProduct } from '../domains/operations/selectors.js'
import { selectPathLinkByProduct, selectPathTemplateById } from '../domains/manufacturing-path/selectors.js'
import { buildTaskDefaultsFromOperation } from '../services/tasks/taskAutofillService.js'
import { useLanguage } from '../i18n/useLanguage.js'

const CURRENT_USER_ID = 'emp-1'
const TODAY = new Date().toISOString().slice(0, 10)

const STATUS_CARD_STYLES = {
  resolved:    'bg-emerald-100 text-emerald-800',
  in_progress: 'bg-blue-100 text-blue-800',
  pending:     'bg-amber-100 text-amber-800',
}

/**
 * @param {{ db: import('../data/mockDatabase.js').MockDatabase }} props
 */
export default function MyTasksPage({ db }) {
  const { t } = useLanguage()
  const [version, setVersion] = useState(0)
  const [yearFilter, setYearFilter] = useState(2026)
  const [quarterFilter, setQuarterFilter] = useState(/** @type {'all' | import('../domains/tasks/model.js').PlannedQuarter} */ ('all'))
  const [productFilter, setProductFilter] = useState('all')

  const [form, setForm] = useState({
    title: '',
    assigneeId: CURRENT_USER_ID,
    productId: 'prod-1',
    operationId: '',
    dueDate: '2026-04-30',
    plannedYear: 2026,
    plannedQuarter: /** @type {import('../domains/tasks/model.js').PlannedQuarter} */ ('Q2'),
    phaseId: /** @type {import('../domains/lifecycle/model.js').LifecyclePhaseId} */ ('production'),
    workstream: /** @type {import('../domains/tasks/model.js').TaskWorkstream} */ ('planning'),
  })
  const [formError, setFormError] = useState(/** @type {string | null} */ (null))
  const [autofillNote, setAutofillNote] = useState('')

  void version
  const mine = selectTasksByEmployee(db, CURRENT_USER_ID)
  let filteredMine = mine
  if (quarterFilter !== 'all') {
    filteredMine = filteredMine.filter(
      (task) => task.plannedYear === yearFilter && task.plannedQuarter === quarterFilter,
    )
  } else {
    filteredMine = filteredMine.filter((task) => task.plannedYear === yearFilter)
  }
  if (productFilter !== 'all') {
    filteredMine = filteredMine.filter((task) => task.productId === productFilter)
  }

  const kanbanColumns = useMemo(
    () =>
      LIFECYCLE_PHASE_ORDER.map((phaseId) => ({
        id: phaseId,
        label: t(`lifecycle.phase.${phaseId}`, phaseId.replace(/_/g, ' ')),
        tasks: filteredMine.filter((task) => task.phaseId === phaseId),
      })),
    [filteredMine, t],
  )

  const overdue = selectOverdueTasks(db, new Date('2026-04-10'))
  const q2Health = computeQuarterlyTaskPlanMetrics(db, 2026, 'Q2', new Date('2026-04-10'))
  const quarterSlice = selectTasksByQuarter(db, 2026, 'Q2')

  const operationsForProduct = useMemo(
    () => selectOperationsByProduct(db, form.productId),
    [db, form.productId],
  )
  const productPathTemplate = useMemo(() => {
    const link = selectPathLinkByProduct(db, form.productId)
    return link ? selectPathTemplateById(db, link.pathTemplateId) : undefined
  }, [db, form.productId])

  // Prefer path operations when available, otherwise fall back to flat operation list
  const operationOptions = useMemo(() => {
    if (productPathTemplate?.graphNodes) {
      const operationIds = [
        ...new Set(
          productPathTemplate.graphNodes
            .filter((node) => node.data.kind === 'operation' && node.data.operationId)
            .map((node) => node.data.operationId),
        ),
      ]
      const pathOps = operationIds
        .map((id) => operationsForProduct.find((op) => op.id === id))
        .filter(Boolean)
      if (pathOps.length) return pathOps
    }
    return operationsForProduct
  }, [operationsForProduct, productPathTemplate])

  function applyOperationDefaults(productId, operationId, dueDate) {
    const defaults = buildTaskDefaultsFromOperation(db, { productId, operationId, dueDate })
    if (!defaults) {
      setAutofillNote('')
      return
    }
    setForm((f) => ({
      ...f,
      ...defaults,
      assigneeId: defaults.assigneeId ?? f.assigneeId,
      workstream: defaults.workstream ?? f.workstream,
      phaseId: defaults.phaseId ?? f.phaseId,
      plannedYear: defaults.plannedYear ?? f.plannedYear,
      plannedQuarter: defaults.plannedQuarter ?? f.plannedQuarter,
    }))
    setAutofillNote(t('tasks.autofillNote'))
  }

  function handleCreate(e) {
    e.preventDefault()
    setFormError(null)
    const v = validateTaskCreate(db, {
      title: form.title,
      assigneeId: form.assigneeId,
      productId: form.productId,
      dueDate: form.dueDate,
      plannedYear: form.plannedYear,
      plannedQuarter: form.plannedQuarter,
      phaseId: form.phaseId,
      workstream: form.workstream,
      operationId: form.operationId || undefined,
    })
    if (!v.ok) {
      setFormError(v.errors.join(', '))
      return
    }
    appendTask(db, v.task)
    setVersion((x) => x + 1)
    setAutofillNote('')
    setForm((f) => ({ ...f, title: '' }))
  }

  const inputCls = 'mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm'

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        {t('tasks.mockUserLine')}{' '}
        <span className="font-medium text-slate-900">{t('tasks.mockUserName')}</span>{' '}
        {t('tasks.mockUserSuffix')}
      </p>

      {/* Overdue alert — at the top where it can't be missed */}
      {overdue.length > 0 && (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
              {overdue.length}
            </span>
            <h3 className="text-sm font-semibold text-rose-800">{t('tasks.overdueTitle')}</h3>
          </div>
          <TaskTable db={db} tasks={overdue} showPlanningColumns />
        </section>
      )}

      {/* Q2 health as stat cards */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">{t('tasks.q2Health')}</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: 'Total tasks', value: quarterSlice.length, style: 'text-slate-800' },
            { label: 'Completed', value: q2Health.completedCount ?? 0, style: 'text-emerald-700' },
            { label: 'On time', value: q2Health.onTimeCount ?? 0, style: 'text-blue-700' },
            { label: 'Overdue', value: q2Health.overdueCount ?? 0, style: q2Health.overdueCount > 0 ? 'text-rose-700' : 'text-slate-800' },
          ].map(({ label, value, style }) => (
            <div key={label} className="rounded-xl border border-slate-100 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
              <p className={`mt-1 text-2xl font-bold ${style}`}>{value}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-400">
          {t('tasks.q2AllTasks')} {quarterSlice.length}
        </p>
      </section>

      {/* Create task form */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">{t('tasks.createSection')}</h3>
        <form onSubmit={handleCreate} className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <label className="text-xs font-medium text-slate-600 lg:col-span-2">
            {t('tasks.fieldTitle')} <span className="text-rose-500">*</span>
            <input
              className={inputCls}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="What needs to be done?"
              required
            />
          </label>
          <label className="text-xs font-medium text-slate-600">
            {t('tasks.fieldAssignee')}
            <select
              className={inputCls}
              value={form.assigneeId}
              onChange={(e) => setForm((f) => ({ ...f, assigneeId: e.target.value }))}
            >
              {db.employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">
            {t('common.product')}
            <select
              className={inputCls}
              value={form.productId}
              onChange={(e) => {
                const nextProductId = e.target.value
                const firstOperation = selectOperationsByProduct(db, nextProductId)[0]
                setForm((f) => ({ ...f, productId: nextProductId, operationId: firstOperation?.id ?? '' }))
                if (firstOperation) {
                  applyOperationDefaults(nextProductId, firstOperation.id, form.dueDate)
                } else {
                  setAutofillNote('')
                }
              }}
            >
              {db.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">
            {t('tasks.fieldOperation')}
            <select
              className={inputCls}
              value={form.operationId}
              onChange={(e) => {
                const nextOperationId = e.target.value
                setForm((f) => ({ ...f, operationId: nextOperationId }))
                if (nextOperationId) {
                  applyOperationDefaults(form.productId, nextOperationId, form.dueDate)
                } else {
                  setAutofillNote('')
                }
              }}
            >
              <option value="">{t('common.none')}</option>
              {operationOptions.map((operation) => (
                <option key={operation.id} value={operation.id}>
                  {operation.sequence}. {operation.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">
            {t('common.due')}
            <input
              type="date"
              className={inputCls}
              value={form.dueDate}
              onChange={(e) => {
                const nextDueDate = e.target.value
                setForm((f) => ({ ...f, dueDate: nextDueDate }))
                if (form.operationId) {
                  applyOperationDefaults(form.productId, form.operationId, nextDueDate)
                }
              }}
            />
          </label>
          <label className="text-xs font-medium text-slate-600">
            {t('tasks.fieldPlannedYear')}
            <input
              type="number"
              className={inputCls}
              value={form.plannedYear}
              onChange={(e) => setForm((f) => ({ ...f, plannedYear: Number(e.target.value) }))}
            />
          </label>
          <label className="text-xs font-medium text-slate-600">
            {t('common.quarter')}
            <select
              className={inputCls}
              value={form.plannedQuarter}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  plannedQuarter: /** @type {import('../domains/tasks/model.js').PlannedQuarter} */ (e.target.value),
                }))
              }
            >
              {PLANNED_QUARTERS.map((q) => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">
            {t('tasks.fieldLifecyclePhase')}
            <select
              className={inputCls}
              value={form.phaseId}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  phaseId: /** @type {import('../domains/lifecycle/model.js').LifecyclePhaseId} */ (e.target.value),
                }))
              }
            >
              {LIFECYCLE_PHASE_ORDER.map((phaseId) => (
                <option key={phaseId} value={phaseId}>
                  {t(`lifecycle.phase.${phaseId}`, phaseId.replace(/_/g, ' '))}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">
            {t('tasks.fieldWorkstream')}
            <select
              className={inputCls}
              value={form.workstream}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  workstream: /** @type {import('../domains/tasks/model.js').TaskWorkstream} */ (e.target.value),
                }))
              }
            >
              {TASK_WORKSTREAMS.map((w) => (
                <option key={w} value={w}>
                  {t(`taskWorkstream.${w}`, w.replace(/_/g, ' '))}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              {t('tasks.addTask')}
            </button>
          </div>
        </form>
        {autofillNote ? (
          <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100">
            ✓ {autofillNote}
          </p>
        ) : null}
        {formError ? (
          <p className="mt-2 rounded-lg bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 ring-1 ring-rose-100">
            {formError}
          </p>
        ) : null}
      </section>

      {/* Filters */}
      <section className="flex flex-wrap gap-3 text-sm">
        <label className="flex items-center gap-2 text-slate-600">
          {t('common.year')}
          <input
            type="number"
            className="w-24 rounded-lg border border-slate-200 px-2 py-1"
            value={yearFilter}
            onChange={(e) => setYearFilter(Number(e.target.value))}
          />
        </label>
        <label className="flex items-center gap-2 text-slate-600">
          {t('common.quarter')}
          <select
            className="rounded-lg border border-slate-200 px-2 py-1"
            value={quarterFilter}
            onChange={(e) =>
              setQuarterFilter(
                e.target.value === 'all'
                  ? 'all'
                  : /** @type {import('../domains/tasks/model.js').PlannedQuarter} */ (e.target.value),
              )
            }
          >
            <option value="all">{t('common.all')}</option>
            {PLANNED_QUARTERS.map((q) => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-slate-600">
          {t('common.product')}
          <select
            className="rounded-lg border border-slate-200 px-2 py-1"
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
          >
            <option value="all">{t('common.all')}</option>
            {db.products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>
        </label>
      </section>

      {/* Kanban */}
      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-900">{t('tasks.kanbanTitle')}</h3>
        <div className="overflow-x-auto pb-1">
          <div className="grid min-w-max auto-cols-[minmax(240px,1fr)] grid-flow-col gap-3">
            {kanbanColumns.map((column) => (
              <div key={column.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-card">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold capitalize text-slate-900">{column.label}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                    {column.tasks.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {column.tasks.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs text-slate-400">
                      {t('tasks.emptyLane')}
                    </p>
                  ) : (
                    column.tasks.map((task) => {
                      const assignee = db.employees.find((e) => e.id === task.assigneeId)
                      const isOverdue = task.status !== 'resolved' && task.dueDate < TODAY
                      const statusStyle = STATUS_CARD_STYLES[task.status] ?? 'bg-slate-100 text-slate-700'
                      return (
                        <article
                          key={task.id}
                          className={`rounded-xl border p-3 ${isOverdue ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200 bg-slate-50'}`}
                        >
                          <p className="text-sm font-semibold text-slate-900 leading-snug">{task.title}</p>
                          {assignee && (
                            <p className="mt-1 text-xs text-slate-500">{assignee.name}</p>
                          )}
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusStyle}`}>
                              {t(`taskStatus.${task.status}`, task.status.replace(/_/g, ' '))}
                            </span>
                            <span className={`text-[11px] ${isOverdue ? 'font-semibold text-rose-600' : 'text-slate-400'}`}>
                              {isOverdue ? '⚠ ' : ''}{task.dueDate}
                            </span>
                          </div>
                        </article>
                      )
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
