import { useMemo, useState } from 'react'
import { ChevronDown, Plus, ArrowRight, Check, RotateCcw } from 'lucide-react'
import { selectTasksByEmployee } from '../domains/tasks/selectors.js'
import { appendTask, patchTask, validateTaskCreate } from '../domains/tasks/mutations.js'
import { PLANNED_QUARTERS, TASK_WORKSTREAMS } from '../domains/tasks/model.js'
import { LIFECYCLE_PHASE_ORDER } from '../domains/lifecycle/model.js'
import { selectOperationsByProduct } from '../domains/operations/selectors.js'
import { selectPathLinkByProduct, selectPathTemplateById } from '../domains/manufacturing-path/selectors.js'
import { buildTaskDefaultsFromOperation } from '../services/tasks/taskAutofillService.js'
import { useLanguage } from '../i18n/useLanguage.js'

const CURRENT_USER_ID = 'emp-1'
const TODAY = new Date().toISOString().slice(0, 10)

const KANBAN_COLS = [
  { id: 'todo',        label: 'To do',       statuses: ['draft', 'blocked'], accent: 'border-slate-300', headerBg: 'bg-slate-100', countBg: 'bg-slate-200 text-slate-700' },
  { id: 'in_progress', label: 'In progress',  statuses: ['in_progress'],      accent: 'border-blue-300',  headerBg: 'bg-blue-50',    countBg: 'bg-blue-100 text-blue-700' },
  { id: 'done',        label: 'Done',         statuses: ['resolved'],          accent: 'border-emerald-300', headerBg: 'bg-emerald-50', countBg: 'bg-emerald-100 text-emerald-700' },
]

const WORKSTREAM_PILL = {
  quotation:     'bg-violet-100 text-violet-700',
  planning:      'bg-blue-100 text-blue-700',
  manufacturing: 'bg-orange-100 text-orange-700',
  shipping:      'bg-teal-100 text-teal-700',
  quality:       'bg-emerald-100 text-emerald-700',
}

function initials(name = '') {
  return name.split(' ').map((n) => n[0] ?? '').join('').slice(0, 2).toUpperCase()
}

function relativeDate(dateStr) {
  if (!dateStr) return null
  const diff = Math.ceil((new Date(dateStr) - new Date(TODAY)) / 86400000)
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, overdue: true }
  if (diff === 0) return { label: 'Due today', overdue: true }
  if (diff === 1) return { label: 'Tomorrow', overdue: false }
  if (diff <= 7) return { label: `${diff}d left`, overdue: false }
  return { label: dateStr, overdue: false }
}

function nextStatus(status) {
  if (status === 'draft' || status === 'blocked') return 'in_progress'
  if (status === 'in_progress') return 'resolved'
  return 'draft'
}

/** @param {{ task: import('../domains/tasks/model.js').Task; db: any; onStatusChange: (id: string, s: string) => void }} props */
function TaskCard({ task, db, onStatusChange }) {
  const product = db.products.find((p) => p.id === task.productId)
  const assignee = db.employees.find((e) => e.id === task.assigneeId)
  const due = relativeDate(task.dueDate)
  const isBlocked = task.status === 'blocked'
  const isOverdue = task.status !== 'resolved' && due?.overdue
  const pillStyle = WORKSTREAM_PILL[task.workstream] ?? 'bg-slate-100 text-slate-600'

  const AdvanceIcon = task.status === 'in_progress' ? Check : task.status === 'resolved' ? RotateCcw : ArrowRight
  const advanceTitle = task.status === 'in_progress' ? 'Mark done' : task.status === 'resolved' ? 'Reopen' : 'Start'

  return (
    <article
      className={`group relative rounded-xl border bg-white p-3 shadow-sm transition hover:shadow-md ${
        isOverdue ? 'border-rose-200' : isBlocked ? 'border-amber-200' : 'border-slate-200'
      }`}
    >
      {/* Top row: workstream + status advance button */}
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${pillStyle}`}>
          {task.workstream}
        </span>
        <button
          type="button"
          title={advanceTitle}
          onClick={() => onStatusChange(task.id, nextStatus(task.status))}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-400 opacity-0 transition hover:border-slate-400 hover:text-slate-700 group-hover:opacity-100"
        >
          <AdvanceIcon size={11} />
        </button>
      </div>

      {/* Title */}
      <p className="text-sm font-semibold leading-snug text-slate-900">{task.title}</p>

      {/* Product name */}
      {product && (
        <p className="mt-0.5 truncate text-xs text-slate-400">{product.name}</p>
      )}

      {/* Blocked badge */}
      {isBlocked && (
        <span className="mt-1.5 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
          BLOCKED
        </span>
      )}

      {/* Bottom row: assignee + due date */}
      <div className="mt-2.5 flex items-center justify-between gap-2">
        {assignee ? (
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[9px] font-bold text-slate-600"
            title={assignee.name}
          >
            {initials(assignee.name)}
          </span>
        ) : (
          <span />
        )}
        {due && (
          <span className={`text-[11px] font-medium ${due.overdue ? 'text-rose-600' : 'text-slate-400'}`}>
            {due.overdue ? '⚠ ' : ''}{due.label}
          </span>
        )}
      </div>
    </article>
  )
}

/**
 * @param {{ db: import('../data/mockDatabase.js').MockDatabase }} props
 */
export default function MyTasksPage({ db }) {
  const { t } = useLanguage()
  const [version, setVersion] = useState(0)
  const [search, setSearch] = useState('')
  const [productFilter, setProductFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [yearFilter, setYearFilter] = useState(2026)
  const [quarterFilter, setQuarterFilter] = useState(/** @type {'all' | import('../domains/tasks/model.js').PlannedQuarter} */ ('all'))

  const [form, setForm] = useState({
    title: '',
    assigneeId: CURRENT_USER_ID,
    productId: db.products[0]?.id ?? 'prod-1',
    operationId: '',
    dueDate: '2026-06-30',
    plannedYear: 2026,
    plannedQuarter: /** @type {import('../domains/tasks/model.js').PlannedQuarter} */ ('Q2'),
    phaseId: /** @type {import('../domains/lifecycle/model.js').LifecyclePhaseId} */ ('production'),
    workstream: /** @type {import('../domains/tasks/model.js').TaskWorkstream} */ ('planning'),
  })
  const [formError, setFormError] = useState(/** @type {string | null} */ (null))
  const [autofillNote, setAutofillNote] = useState('')

  void version

  const mine = useMemo(() => selectTasksByEmployee(db, CURRENT_USER_ID), [db, version])
  const overdueCount = useMemo(
    () => mine.filter((t) => t.status !== 'resolved' && t.dueDate < TODAY).length,
    [mine],
  )

  const filtered = useMemo(() => {
    let result = mine
    if (quarterFilter !== 'all') {
      result = result.filter((t) => t.plannedYear === yearFilter && t.plannedQuarter === quarterFilter)
    } else {
      result = result.filter((t) => t.plannedYear === yearFilter)
    }
    if (productFilter !== 'all') result = result.filter((t) => t.productId === productFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((t) => t.title.toLowerCase().includes(q))
    }
    return result
  }, [mine, yearFilter, quarterFilter, productFilter, search])

  const kanbanColumns = useMemo(
    () =>
      KANBAN_COLS.map((col) => ({
        ...col,
        tasks: filtered.filter((t) => col.statuses.includes(t.status)),
      })),
    [filtered],
  )

  const operationsForProduct = useMemo(
    () => selectOperationsByProduct(db, form.productId),
    [db, form.productId],
  )
  const productPathTemplate = useMemo(() => {
    const link = selectPathLinkByProduct(db, form.productId)
    return link ? selectPathTemplateById(db, link.pathTemplateId) : undefined
  }, [db, form.productId])

  const operationOptions = useMemo(() => {
    if (productPathTemplate?.graphNodes) {
      const ids = [
        ...new Set(
          productPathTemplate.graphNodes
            .filter((n) => n.data.kind === 'operation' && n.data.operationId)
            .map((n) => n.data.operationId),
        ),
      ]
      const pathOps = ids.map((id) => operationsForProduct.find((op) => op.id === id)).filter(Boolean)
      if (pathOps.length) return pathOps
    }
    return operationsForProduct
  }, [operationsForProduct, productPathTemplate])

  function applyOperationDefaults(productId, operationId, dueDate) {
    const defaults = buildTaskDefaultsFromOperation(db, { productId, operationId, dueDate })
    if (!defaults) { setAutofillNote(''); return }
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
    if (!v.ok) { setFormError(v.errors.join(', ')); return }
    appendTask(db, v.task)
    setVersion((x) => x + 1)
    setAutofillNote('')
    setForm((f) => ({ ...f, title: '' }))
    setShowForm(false)
  }

  function handleStatusChange(taskId, newStatus) {
    patchTask(db, taskId, { status: newStatus, ...(newStatus === 'resolved' ? { completedAt: TODAY } : {}) })
    setVersion((x) => x + 1)
  }

  const inputCls = 'mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm'

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="Search tasks…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 w-48 rounded-lg border border-slate-200 bg-white px-3 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        <select
          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700"
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
        >
          <option value="all">All products</option>
          {db.products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700"
          value={quarterFilter}
          onChange={(e) =>
            setQuarterFilter(e.target.value === 'all' ? 'all' : /** @type {any} */ (e.target.value))
          }
        >
          <option value="all">All quarters</option>
          {PLANNED_QUARTERS.map((q) => <option key={q} value={q}>{q} {yearFilter}</option>)}
        </select>
        <input
          type="number"
          className="h-8 w-20 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700"
          value={yearFilter}
          onChange={(e) => setYearFilter(Number(e.target.value))}
        />

        {/* Stats chips */}
        <div className="ml-auto flex items-center gap-2">
          {overdueCount > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">
              ⚠ {overdueCount} overdue
            </span>
          )}
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
            {filtered.length} tasks
          </span>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800"
          >
            <Plus size={13} />
            New task
          </button>
        </div>
      </div>

      {/* Collapsible create form */}
      {showForm && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">{t('tasks.createSection')}</h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
              <ChevronDown size={16} />
            </button>
          </div>
          <form onSubmit={handleCreate} className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs font-medium text-slate-600 lg:col-span-2">
              {t('tasks.fieldTitle')} <span className="text-rose-500">*</span>
              <input
                className={inputCls}
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="What needs to be done?"
                required
                autoFocus
              />
            </label>
            <label className="text-xs font-medium text-slate-600">
              {t('tasks.fieldAssignee')}
              <select className={inputCls} value={form.assigneeId} onChange={(e) => setForm((f) => ({ ...f, assigneeId: e.target.value }))}>
                {db.employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-600">
              {t('common.product')}
              <select
                className={inputCls}
                value={form.productId}
                onChange={(e) => {
                  const pid = e.target.value
                  const firstOp = selectOperationsByProduct(db, pid)[0]
                  setForm((f) => ({ ...f, productId: pid, operationId: firstOp?.id ?? '' }))
                  if (firstOp) applyOperationDefaults(pid, firstOp.id, form.dueDate)
                  else setAutofillNote('')
                }}
              >
                {db.products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-600">
              {t('tasks.fieldOperation')}
              <select
                className={inputCls}
                value={form.operationId}
                onChange={(e) => {
                  const oid = e.target.value
                  setForm((f) => ({ ...f, operationId: oid }))
                  if (oid) applyOperationDefaults(form.productId, oid, form.dueDate)
                  else setAutofillNote('')
                }}
              >
                <option value="">{t('common.none')}</option>
                {operationOptions.map((op) => (
                  <option key={op.id} value={op.id}>{op.sequence}. {op.name}</option>
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
                  const d = e.target.value
                  setForm((f) => ({ ...f, dueDate: d }))
                  if (form.operationId) applyOperationDefaults(form.productId, form.operationId, d)
                }}
              />
            </label>
            <label className="text-xs font-medium text-slate-600">
              {t('common.quarter')}
              <select
                className={inputCls}
                value={form.plannedQuarter}
                onChange={(e) => setForm((f) => ({ ...f, plannedQuarter: /** @type {any} */ (e.target.value) }))}
              >
                {PLANNED_QUARTERS.map((q) => <option key={q} value={q}>{q} {form.plannedYear}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-600">
              {t('tasks.fieldLifecyclePhase')}
              <select
                className={inputCls}
                value={form.phaseId}
                onChange={(e) => setForm((f) => ({ ...f, phaseId: /** @type {any} */ (e.target.value) }))}
              >
                {LIFECYCLE_PHASE_ORDER.map((pid) => (
                  <option key={pid} value={pid}>{t(`lifecycle.phase.${pid}`, pid.replace(/_/g, ' '))}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-600">
              {t('tasks.fieldWorkstream')}
              <select
                className={inputCls}
                value={form.workstream}
                onChange={(e) => setForm((f) => ({ ...f, workstream: /** @type {any} */ (e.target.value) }))}
              >
                {TASK_WORKSTREAMS.map((w) => (
                  <option key={w} value={w}>{t(`taskWorkstream.${w}`, w.replace(/_/g, ' '))}</option>
                ))}
              </select>
            </label>
            <div className="flex items-end gap-2">
              <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                {t('tasks.addTask')}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </form>
          {autofillNote && (
            <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100">
              ✓ {autofillNote}
            </p>
          )}
          {formError && (
            <p className="mt-2 rounded-lg bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 ring-1 ring-rose-100">
              {formError}
            </p>
          )}
        </section>
      )}

      {/* Kanban board */}
      <div className="overflow-x-auto pb-2">
        <div className="grid min-w-[700px] grid-cols-3 gap-3">
          {kanbanColumns.map((col) => (
            <div key={col.id} className={`rounded-2xl border ${col.accent} bg-white`}>
              {/* Column header */}
              <div className={`flex items-center justify-between rounded-t-2xl px-3 py-2.5 ${col.headerBg}`}>
                <span className="text-sm font-semibold text-slate-800">{col.label}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${col.countBg}`}>
                  {col.tasks.length}
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-2 p-3">
                {col.tasks.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-xs text-slate-400">
                    No tasks
                  </p>
                ) : (
                  col.tasks.map((task) => (
                    <TaskCard key={task.id} task={task} db={db} onStatusChange={handleStatusChange} />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
