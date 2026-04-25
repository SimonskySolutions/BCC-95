import { useMemo, useState } from 'react'
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

  function refresh() {
    setTick((x) => x + 1)
  }

  function onAddShiftAssignment(e) {
    e.preventDefault()
    setFormMsg(null)
    const r = createShiftAssignment(db, {
      employeeId: shiftEmp,
      date,
      shiftTemplateId: shiftTpl,
    })
    if (r.ok) {
      setFormMsg({
        type: 'ok',
        text: `${t('planning.shiftSaved')} (${r.shiftAssignment.id}).`,
      })
      refresh()
    } else {
      setFormMsg({ type: 'err', text: r.errors.join(', ') })
    }
  }

  function onAddStationAssignment(e) {
    e.preventDefault()
    setFormMsg(null)
    const r = createStationAssignment(db, {
      date,
      employeeId: stnEmp,
      stationCode: stnCode,
      machineId: stnMach,
      operationId: stnOp,
      ownerId: stnOwner,
    })
    if (r.ok) {
      setFormMsg({
        type: 'ok',
        text: `${t('planning.stationSaved')} (${r.stationAssignment.taskId} / ${r.stationAssignment.ownerTaskId}).`,
      })
      refresh()
    } else {
      setFormMsg({ type: 'err', text: r.errors.join(', ') })
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end gap-4">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">{t('planning.scheduleDate')}</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      {formMsg ? (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            formMsg.type === 'ok' ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-800'
          }`}
        >
          {formMsg.text}
        </p>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">{t('planning.summaryTitle')}</h2>
        <p className="mt-1 text-xs text-slate-600">{t('planning.summaryHelp')}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{t('planning.summaryTotalEmployees')}</p>
            <p className="text-lg font-semibold text-slate-900">{planningSummary.totalEmployees}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{t('planning.summaryScheduledEmployees')}</p>
            <p className="text-lg font-semibold text-slate-900">{planningSummary.scheduledEmployees}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{t('planning.summaryUnassignedEmployees')}</p>
            <p className="text-lg font-semibold text-slate-900">{planningSummary.unassignedEmployees}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{t('planning.summaryStationAssignments')}</p>
            <p className="text-lg font-semibold text-slate-900">{planningSummary.stationAssignments}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-amber-50 p-3">
            <p className="text-xs text-amber-700">{t('planning.summaryEmployeeConflicts')}</p>
            <p className="text-lg font-semibold text-amber-900">{planningSummary.employeeConflicts}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-amber-50 p-3">
            <p className="text-xs text-amber-700">{t('planning.summaryStationConflicts')}</p>
            <p className="text-lg font-semibold text-amber-900">{planningSummary.stationConflicts}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">{t('planning.coverageTitle')}</h2>
        <p className="mt-1 text-xs text-slate-600">{t('planning.coverageHelp')}</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {coverageByShift.map(({ template, rows, stationCoverage }) => (
            <div key={template.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">
                  {t('common.shiftWord')} {template.label}
                </p>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-700">
                  {rows.length}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {template.startTime} - {template.endTime}
              </p>
              <p className="mt-2 text-xs text-slate-600">
                {t('planning.coverageAssignedStations')} {stationCoverage}/{rows.length}
              </p>
              <ul className="mt-2 space-y-1 text-xs text-slate-600">
                {rows.slice(0, 4).map((row) => {
                  const emp = selectEmployeeById(db, row.employeeId)
                  return <li key={row.id}>- {emp?.name ?? row.employeeId}</li>
                })}
                {rows.length > 4 ? <li>+{rows.length - 4}</li> : null}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">{t('planning.shiftSection')}</h2>
        <p className="mt-1 text-xs text-slate-600">{t('planning.shiftHelp')}</p>
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
                <option key={template.id} value={template.id}>
                  {template.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <ul className="mt-4 space-y-2 text-sm">
          {shiftRows.length === 0 ? (
            <li className="text-slate-500">{t('planning.noShifts')}</li>
          ) : (
            shiftRows.map((row) => {
              const emp = selectEmployeeById(db, row.employeeId)
              const tpl = db.shiftTemplates.find((template) => template.id === row.shiftTemplateId)
              return (
                <li key={row.id} className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
                  <span className="font-medium text-slate-800">{emp?.name ?? row.employeeId}</span>
                  {tpl ? (
                    <span className="text-slate-600">
                      {' '}
                      — {t('common.shiftWord')} {tpl.label} ({tpl.startTime}–{tpl.endTime})
                    </span>
                  ) : null}
                </li>
              )
            })
          )}
        </ul>

        <form onSubmit={onAddShiftAssignment} className="mt-6 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4">
          <label className="text-xs font-medium text-slate-700">
            {t('common.employee')}
            <select
              value={shiftEmp}
              onChange={(e) => setShiftEmp(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
            >
              {db.employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-700">
            {t('planning.shiftTemplate')}
            <select
              value={shiftTpl}
              onChange={(e) => setShiftTpl(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
            >
              {db.shiftTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.label} ({template.startTime}–{template.endTime})
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end sm:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              {t('planning.addShift')}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">{t('planning.stationSection')}</h2>
        <p className="mt-1 text-xs text-slate-600">{t('planning.stationHelp')}</p>
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
                  <td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-500">
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
                    <tr key={row.id} className="border-t border-slate-100 text-slate-700">
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

        <form onSubmit={onAddStationAssignment} className="mt-6 grid gap-3 border-t border-slate-100 pt-4 md:grid-cols-2 lg:grid-cols-3">
          <label className="text-xs font-medium text-slate-700">
            {t('common.employee')}
            <select
              value={stnEmp}
              onChange={(e) => setStnEmp(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
            >
              {db.employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-700">
            {t('planning.stationCode')}
            <input
              value={stnCode}
              onChange={(e) => setStnCode(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-700">
            {t('common.machine')}
            <select
              value={stnMach}
              onChange={(e) => setStnMach(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
            >
              {db.machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-700">
            {t('common.operation')}
            <select
              value={stnOp}
              onChange={(e) => setStnOp(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
            >
              {db.operations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.productId} · {o.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-700">
            {t('planning.operationOwner')}
            <select
              value={stnOwner}
              onChange={(e) => setStnOwner(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
            >
              {db.employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              {t('planning.assignLink')}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-600">
        <p className="font-semibold text-slate-800">{t('planning.horizons')}</p>
        <ul className="mt-2 list-disc pl-5">
          {db.plans.map((p) => (
            <li key={p.id}>
              {p.horizonLabel} — {p.status}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
