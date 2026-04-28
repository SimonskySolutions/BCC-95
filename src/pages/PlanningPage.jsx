import { useMemo, useState } from 'react'
import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  createShiftAssignment,
  createStationAssignment,
  selectShiftAssignmentsByDate,
  selectStationAssignmentsByDate,
} from '../domains/shifts/index.js'
import { selectEmployeeById } from '../domains/people/selectors.js'
import { selectMachineById } from '../domains/machines/selectors.js'
import { selectOperationById } from '../domains/operations/selectors.js'
import { useLanguage } from '../i18n/useLanguage.js'

/** Color token per shift-template index (cycles if more than 4 templates) */
const SHIFT_COLORS = [
  { ring: 'ring-blue-300',   bg: 'bg-blue-50',   text: 'text-blue-800',   bar: 'bg-blue-400',   dot: 'bg-blue-500',   leftBorder: 'border-l-blue-400'   },
  { ring: 'ring-amber-300',  bg: 'bg-amber-50',  text: 'text-amber-800',  bar: 'bg-amber-400',  dot: 'bg-amber-500',  leftBorder: 'border-l-amber-400'  },
  { ring: 'ring-violet-300', bg: 'bg-violet-50', text: 'text-violet-800', bar: 'bg-violet-400', dot: 'bg-violet-500', leftBorder: 'border-l-violet-400' },
  { ring: 'ring-teal-300',   bg: 'bg-teal-50',   text: 'text-teal-800',   bar: 'bg-teal-400',   dot: 'bg-teal-500',   leftBorder: 'border-l-teal-400'   },
]

function shiftColor(index) {
  return SHIFT_COLORS[index % SHIFT_COLORS.length]
}

function addDays(dateStr, delta) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + delta)
  return d.toISOString().slice(0, 10)
}

function horizonBadge(status) {
  switch (status) {
    case 'active': return 'bg-emerald-100 text-emerald-800'
    case 'closed': return 'bg-slate-100 text-slate-500'
    default:       return 'bg-sky-100 text-sky-700'
  }
}

/**
 * @param {{ db: import('../data/mockDatabase.js').MockDatabase }} props
 */
export default function PlanningPage({ db }) {
  const { t } = useLanguage()
  const [date, setDate] = useState('2026-04-11')
  const [, setTick] = useState(0)
  const [shiftTemplateFilter, setShiftTemplateFilter] = useState('all')
  const [stationQuery, setStationQuery] = useState('')
  const [shiftEmp, setShiftEmp] = useState('emp-2')
  const [shiftTpl, setShiftTpl] = useState('shift-a')
  const [stnEmp, setStnEmp] = useState('emp-2')
  const [stnCode, setStnCode] = useState('ST-ASSY-03')
  const [stnMach, setStnMach] = useState('mach-3')
  const [stnOp, setStnOp] = useState('op-3')
  const [stnOwner, setStnOwner] = useState('emp-1')
  const [formMsg, setFormMsg] = useState(/** @type {{ type: 'ok' | 'err'; text: string } | null} */ (null))
  const [showShiftForm, setShowShiftForm] = useState(false)
  const [showStationForm, setShowStationForm] = useState(false)

  const shiftRowsRaw = useMemo(() => selectShiftAssignmentsByDate(db, date), [db, date])
  const stationRowsRaw = useMemo(() => selectStationAssignmentsByDate(db, date), [db, date])
  const shiftRows = useMemo(
    () =>
      shiftRowsRaw.filter((row) =>
        shiftTemplateFilter === 'all' ? true : row.shiftTemplateId === shiftTemplateFilter,
      ),
    [shiftRowsRaw, shiftTemplateFilter],
  )
  const stationRows = useMemo(() => {
    const query = stationQuery.trim().toLowerCase()
    if (!query) return stationRowsRaw
    return stationRowsRaw.filter((row) => {
      const emp = selectEmployeeById(db, row.employeeId)
      const own = selectEmployeeById(db, row.ownerId)
      const op = selectOperationById(db, row.operationId)
      const mach = selectMachineById(db, row.machineId)
      return (
        row.stationCode.toLowerCase().includes(query) ||
        row.id.toLowerCase().includes(query) ||
        row.taskId.toLowerCase().includes(query) ||
        row.ownerTaskId.toLowerCase().includes(query) ||
        (emp?.name ?? '').toLowerCase().includes(query) ||
        (own?.name ?? '').toLowerCase().includes(query) ||
        (op?.name ?? '').toLowerCase().includes(query) ||
        (mach?.name ?? '').toLowerCase().includes(query)
      )
    })
  }, [db, stationQuery, stationRowsRaw])

  const planningSummary = useMemo(() => {
    const scheduled = new Set(shiftRowsRaw.map((row) => row.employeeId))
    const stationByEmployee = new Map()
    for (const row of stationRowsRaw) {
      stationByEmployee.set(row.employeeId, (stationByEmployee.get(row.employeeId) ?? 0) + 1)
    }
    const employeeConflicts = Array.from(stationByEmployee.values()).filter((count) => count > 1).length
    const stationByCode = new Map()
    for (const row of stationRowsRaw) {
      stationByCode.set(row.stationCode, (stationByCode.get(row.stationCode) ?? 0) + 1)
    }
    const stationConflicts = Array.from(stationByCode.values()).filter((count) => count > 1).length
    return {
      totalEmployees: db.employees.length,
      scheduledEmployees: scheduled.size,
      unassignedEmployees: Math.max(0, db.employees.length - scheduled.size),
      stationAssignments: stationRowsRaw.length,
      employeeConflicts,
      stationConflicts,
    }
  }, [db.employees.length, shiftRowsRaw, stationRowsRaw])

  const coverageByShift = useMemo(
    () =>
      db.shiftTemplates.map((template) => {
        const rows = shiftRowsRaw.filter((row) => row.shiftTemplateId === template.id)
        const stationCoverage = rows.filter((row) =>
          stationRowsRaw.some((station) => station.employeeId === row.employeeId),
        ).length
        return { template, rows, stationCoverage }
      }),
    [db.shiftTemplates, shiftRowsRaw, stationRowsRaw],
  )

  function refresh() { setTick((x) => x + 1) }

  function onAddShiftAssignment(e) {
    e.preventDefault()
    setFormMsg(null)
    const r = createShiftAssignment(db, { employeeId: shiftEmp, date, shiftTemplateId: shiftTpl })
    if (r.ok) {
      setFormMsg({ type: 'ok', text: `${t('planning.shiftSaved')} (${r.shiftAssignment.id}).` })
      setShowShiftForm(false)
      refresh()
    } else {
      setFormMsg({ type: 'err', text: r.errors.join(', ') })
    }
  }

  function onAddStationAssignment(e) {
    e.preventDefault()
    setFormMsg(null)
    const r = createStationAssignment(db, {
      date, employeeId: stnEmp, stationCode: stnCode,
      machineId: stnMach, operationId: stnOp, ownerId: stnOwner,
    })
    if (r.ok) {
      setFormMsg({ type: 'ok', text: `${t('planning.stationSaved')} (${r.stationAssignment.taskId} / ${r.stationAssignment.ownerTaskId}).` })
      setShowStationForm(false)
      refresh()
    } else {
      setFormMsg({ type: 'err', text: r.errors.join(', ') })
    }
  }

  return (
    <div className="space-y-6">

      {/* Date navigator */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={t('planning.prevDay')}
          onClick={() => setDate((d) => addDays(d, -1))}
          className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50"
        >
          <ChevronLeft size={16} />
        </button>
        <label className="block text-sm">
          <span className="sr-only">{t('planning.scheduleDate')}</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="block rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="button"
          aria-label={t('planning.nextDay')}
          onClick={() => setDate((d) => addDays(d, 1))}
          className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {formMsg ? (
        <p className={`rounded-lg px-3 py-2 text-sm ${formMsg.type === 'ok' ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-800'}`}>
          {formMsg.text}
        </p>
      ) : null}

      {/* Summary KPIs */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">{t('planning.summaryTitle')}</h2>
        <p className="mt-1 text-xs text-slate-500">{t('planning.summaryHelp')}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {[
            { label: t('planning.summaryTotalEmployees'),       value: planningSummary.totalEmployees,       variant: 'default' },
            { label: t('planning.summaryScheduledEmployees'),   value: planningSummary.scheduledEmployees,   variant: 'default' },
            { label: t('planning.summaryUnassignedEmployees'),  value: planningSummary.unassignedEmployees,  variant: 'default' },
            { label: t('planning.summaryStationAssignments'),   value: planningSummary.stationAssignments,   variant: 'default' },
            { label: t('planning.summaryEmployeeConflicts'),    value: planningSummary.employeeConflicts,    variant: 'conflict' },
            { label: t('planning.summaryStationConflicts'),     value: planningSummary.stationConflicts,     variant: 'conflict' },
          ].map(({ label, value, variant }) => (
            <div key={label} className={`rounded-xl border p-3 ${variant === 'conflict' ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-start gap-1.5">
                {variant === 'conflict' && value > 0 ? (
                  <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-500" />
                ) : null}
                <p className={`text-xs leading-snug ${variant === 'conflict' ? 'text-amber-700' : 'text-slate-500'}`}>{label}</p>
              </div>
              <p className={`mt-1 text-lg font-semibold ${variant === 'conflict' ? 'text-amber-900' : 'text-slate-900'}`}>{value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Shift coverage */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">{t('planning.coverageTitle')}</h2>
        <p className="mt-1 text-xs text-slate-500">{t('planning.coverageHelp')}</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {coverageByShift.map(({ template, rows, stationCoverage }, idx) => {
            const color = shiftColor(idx)
            const pct = rows.length > 0 ? Math.round((stationCoverage / rows.length) * 100) : 0
            return (
              <div key={template.id} className={`rounded-xl border ${color.ring} ring-1 ring-inset ${color.bg} p-3`}>
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm font-semibold ${color.text}`}>
                    {t('common.shiftWord')} {template.label}
                  </p>
                  <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium text-slate-700">
                    {rows.length}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{template.startTime} – {template.endTime}</p>

                {/* Coverage progress bar */}
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{t('planning.coverageAssignedStations')}</span>
                    <span className="font-medium text-slate-700">{stationCoverage}/{rows.length}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/60">
                    <div
                      className={`h-full rounded-full transition-all ${color.bar}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <ul className="mt-3 space-y-1">
                  {rows.slice(0, 4).map((row) => {
                    const emp = selectEmployeeById(db, row.employeeId)
                    return (
                      <li key={row.id} className="flex items-center gap-1.5 text-xs text-slate-600">
                        <span className={`inline-block h-1.5 w-1.5 rounded-full ${color.dot}`} />
                        {emp?.name ?? row.employeeId}
                      </li>
                    )
                  })}
                  {rows.length > 4 ? (
                    <li className="text-xs text-slate-400">+{rows.length - 4} more</li>
                  ) : null}
                </ul>
              </div>
            )
          })}
        </div>
      </section>

      {/* Shift assignments */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{t('planning.shiftSection')}</h2>
            <p className="mt-1 text-xs text-slate-500">{t('planning.shiftHelp')}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowShiftForm((v) => !v)}
            className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            {t('planning.addShiftToggle')}
          </button>
        </div>

        <div className="mt-4 max-w-xs">
          <label className="text-xs font-medium text-slate-700">
            {t('planning.filterShiftTemplate')}
            <select
              value={shiftTemplateFilter}
              onChange={(e) => setShiftTemplateFilter(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
            >
              <option value="all">{t('common.all')}</option>
              {db.shiftTemplates.map((template) => (
                <option key={template.id} value={template.id}>{template.label}</option>
              ))}
            </select>
          </label>
        </div>

        <ul className="mt-4 space-y-2 text-sm">
          {shiftRows.length === 0 ? (
            <li className="text-sm text-slate-400">{t('planning.noShifts')}</li>
          ) : (
            shiftRows.map((row) => {
              const emp = selectEmployeeById(db, row.employeeId)
              const tplIdx = db.shiftTemplates.findIndex((t) => t.id === row.shiftTemplateId)
              const tpl = db.shiftTemplates[tplIdx]
              const color = shiftColor(tplIdx >= 0 ? tplIdx : 0)
              return (
                <li key={row.id} className={`flex items-center gap-3 rounded-lg border border-l-4 border-slate-100 ${color.leftBorder} bg-slate-50/80 px-3 py-2`}>
                  <span className={`inline-block h-2 w-2 rounded-full ${color.dot}`} />
                  <span className="font-medium text-slate-800">{emp?.name ?? row.employeeId}</span>
                  {tpl ? (
                    <span className="text-slate-500">
                      {t('common.shiftWord')} {tpl.label} ({tpl.startTime}–{tpl.endTime})
                    </span>
                  ) : null}
                </li>
              )
            })
          )}
        </ul>

        {showShiftForm ? (
          <form onSubmit={onAddShiftAssignment} className="mt-5 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-4">
            <label className="text-xs font-medium text-slate-700">
              {t('common.employee')}
              <select value={shiftEmp} onChange={(e) => setShiftEmp(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm">
                {db.employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-700">
              {t('planning.shiftTemplate')}
              <select value={shiftTpl} onChange={(e) => setShiftTpl(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm">
                {db.shiftTemplates.map((template) => (
                  <option key={template.id} value={template.id}>{template.label} ({template.startTime}–{template.endTime})</option>
                ))}
              </select>
            </label>
            <div className="flex items-end gap-2 sm:col-span-2">
              <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                {t('planning.addShift')}
              </button>
              <button type="button" onClick={() => setShowShiftForm(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">
                {t('common.cancel')}
              </button>
            </div>
          </form>
        ) : null}
      </section>

      {/* Station assignments */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{t('planning.stationSection')}</h2>
            <p className="mt-1 text-xs text-slate-500">{t('planning.stationHelp')}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowStationForm((v) => !v)}
            className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            {t('planning.addStationToggle')}
          </button>
        </div>

        <div className="mt-4 max-w-md">
          <label className="text-xs font-medium text-slate-700">
            {t('planning.filterStationSearch')}
            <input
              value={stationQuery}
              onChange={(e) => setStationQuery(e.target.value)}
              placeholder={t('planning.filterStationPlaceholder')}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
            />
          </label>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">{t('planning.colStation')}</th>
                <th className="px-3 py-2">{t('planning.colOperation')}</th>
                <th className="px-3 py-2">{t('planning.colEmployee')}</th>
                <th className="px-3 py-2">{t('planning.colMachine')}</th>
                <th className="px-3 py-2">{t('planning.colOwner')}</th>
                <th className="px-3 py-2">{t('planning.colTask')}</th>
                <th className="px-3 py-2">{t('planning.colOwnerTask')}</th>
              </tr>
            </thead>
            <tbody>
              {stationRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-400">
                    {t('planning.noStations')}
                  </td>
                </tr>
              ) : (
                stationRows.map((row) => {
                  const emp = selectEmployeeById(db, row.employeeId)
                  const own = selectEmployeeById(db, row.ownerId)
                  const op = selectOperationById(db, row.operationId)
                  const mach = selectMachineById(db, row.machineId)
                  return (
                    <tr key={row.id} className="border-t border-slate-100 text-slate-700 hover:bg-slate-50/60">
                      <td className="px-3 py-2 font-mono text-[11px]">{row.stationCode}</td>
                      <td className="px-3 py-2">{op?.name ?? row.operationId}</td>
                      <td className="px-3 py-2">{emp?.name ?? row.employeeId}</td>
                      <td className="px-3 py-2">{mach?.name ?? row.machineId}</td>
                      <td className="px-3 py-2">{own?.name ?? row.ownerId}</td>
                      <td className="px-3 py-2 font-mono text-[11px]">{row.taskId}</td>
                      <td className="px-3 py-2 font-mono text-[11px]">{row.ownerTaskId}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {showStationForm ? (
          <form onSubmit={onAddStationAssignment} className="mt-5 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs font-medium text-slate-700">
              {t('common.employee')}
              <select value={stnEmp} onChange={(e) => setStnEmp(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm">
                {db.employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-700">
              {t('planning.stationCode')}
              <input value={stnCode} onChange={(e) => setStnCode(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
            </label>
            <label className="text-xs font-medium text-slate-700">
              {t('common.machine')}
              <select value={stnMach} onChange={(e) => setStnMach(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm">
                {db.machines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-700">
              {t('common.operation')}
              <select value={stnOp} onChange={(e) => setStnOp(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm">
                {db.operations.map((o) => <option key={o.id} value={o.id}>{o.productId} · {o.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-700">
              {t('planning.operationOwner')}
              <select value={stnOwner} onChange={(e) => setStnOwner(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm">
                {db.employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </label>
            <div className="flex items-end gap-2">
              <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                {t('planning.assignLink')}
              </button>
              <button type="button" onClick={() => setShowStationForm(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">
                {t('common.cancel')}
              </button>
            </div>
          </form>
        ) : null}
      </section>

      {/* Planning horizons */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">{t('planning.horizons')}</h2>
        <ul className="mt-4 space-y-2">
          {db.plans.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5">
              <span className="text-sm font-medium text-slate-800">{p.horizonLabel}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${horizonBadge(p.status)}`}>
                {t(`planning.horizonStatus.${p.status}`) ?? p.status}
              </span>
            </li>
          ))}
        </ul>
      </section>

    </div>
  )
}
