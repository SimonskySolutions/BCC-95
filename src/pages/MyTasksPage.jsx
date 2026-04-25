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
        label: t(`lifecycle.phase.${phaseId}`),
        tasks: filteredMine.filter((task) => task.phaseId === phaseId),
      })),
    [filteredMine, t],
  )

  const overdue = selectOverdueTasks(db, new Date('2026-04-10'))
  const q2Health = computeQuarterlyTaskPlanMetrics(db, 2026, 'Q2', new Date('2026-04-10'))
  const quarterSlice = selectTasksByQuarter(db, 2026, 'Q2')
  const operationsForProduct = selectOperationsByProduct(db, form.productId)
  const productPathTemplate = useMemo(() => {
    const link = selectPathLinkByProduct(db, form.productId)
    return link ? selectPathTemplateById(db, link.pathTemplateId) : undefined
  }, [db, form.productId])
  const pathOperationOptions = useMemo(() => {
    if (!productPathTemplate?.graphNodes) return []
    const operationIds = [
      ...new Set(
        productPathTemplate.graphNodes
          .filter((node) => node.data.kind === 'operation' && node.data.operationId)
          .map((node) => node.data.operationId),
      ),
    ]
    return operationIds
      .map((operationId) => operationsForProduct.find((operation) => operation.id === operationId))
      .filter(Boolean)
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
    setForm((f) => ({ ...f, title: '' }))
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        {t('tasks.mockUserLine')}{' '}
        <span className="font-medium text-slate-900">{t('tasks.mockUserName')}</span>{' '}
        {t('tasks.mockUserSuffix')}
      </p>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">{t('tasks.createSection')}</h3>
        <form onSubmit={handleCreate} className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <label className="text-xs font-medium text-slate-600">
            {t('tasks.fieldTitle')}
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          </label>
          <label className="text-xs font-medium text-slate-600">
            {t('tasks.fieldAssignee')}
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
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
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
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
                  {p.sku}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">
            {t('tasks.fieldOperation')}
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
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
              {operationsForProduct.map((operation) => (
                <option key={operation.id} value={operation.id}>
                  {operation.sequence}. {operation.name}
                </option>
              ))}
            </select>
          </label>
          {pathOperationOptions.length > 0 ? (
            <label className="text-xs font-medium text-slate-600">
              {t('tasks.fieldPathOperation')}
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
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
                {pathOperationOptions.map((operation) => (
                  <option key={operation.id} value={operation.id}>
                    {operation.sequence}. {operation.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="text-xs font-medium text-slate-600">
            {t('common.due')}
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
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
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              value={form.plannedYear}
              onChange={(e) => setForm((f) => ({ ...f, plannedYear: Number(e.target.value) }))}
            />
          </label>
          <label className="text-xs font-medium text-slate-600">
            {t('common.quarter')}
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              value={form.plannedQuarter}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  plannedQuarter: /** @type {import('../domains/tasks/model.js').PlannedQuarter} */ (
                    e.target.value
                  ),
                }))
              }
            >
              {PLANNED_QUARTERS.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">
            {t('tasks.fieldLifecyclePhase')}
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              value={form.phaseId}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  phaseId: /** @type {import('../domains/lifecycle/model.js').LifecyclePhaseId} */ (
                    e.target.value
                  ),
                }))
              }
            >
              {LIFECYCLE_PHASE_ORDER.map((phaseId) => (
                <option key={phaseId} value={phaseId}>
                  {phaseId}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">
            {t('tasks.fieldWorkstream')}
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              value={form.workstream}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  workstream: /** @type {import('../domains/tasks/model.js').TaskWorkstream} */ (
                    e.target.value
                  ),
                }))
              }
            >
              {TASK_WORKSTREAMS.map((w) => (
                <option key={w} value={w}>
                  {w}
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
        {autofillNote ? <p className="mt-2 text-xs text-emerald-700">{autofillNote}</p> : null}
        {formError ? <p className="mt-2 text-sm text-red-600">{formError}</p> : null}
      </section>

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
              <option key={q} value={q}>
                {q}
              </option>
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
                {p.sku}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-900">{t('tasks.kanbanTitle')}</h3>
        <div className="overflow-x-auto pb-1">
          <div className="grid min-w-max auto-cols-[minmax(220px,1fr)] grid-flow-col gap-3">
          {kanbanColumns.map((column) => (
            <div key={column.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-card">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">{column.label}</p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                  {column.tasks.length}
                </span>
              </div>
              <div className="space-y-2">
                {column.tasks.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
                    {t('tasks.emptyLane')}
                  </p>
                ) : (
                  column.tasks.map((task) => (
                    <article key={task.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {task.plannedYear} {task.plannedQuarter} · {task.workstream}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {t('tasks.dueLabel')} {task.dueDate}
                      </p>
                      <div className="mt-2 inline-flex rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-700">
                        {task.status}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="mb-2 text-sm font-semibold text-slate-900">{t('tasks.q2Health')}</h3>
        <pre className="text-xs text-slate-700">{JSON.stringify(q2Health, null, 2)}</pre>
        <p className="mt-2 text-xs text-slate-500">
          {t('tasks.q2AllTasks')} {quarterSlice.length}
        </p>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-900">{t('tasks.overdueTitle')}</h3>
        <TaskTable db={db} tasks={overdue} showPlanningColumns />
      </section>
    </div>
  )
}
