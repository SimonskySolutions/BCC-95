import { useMemo, useState } from 'react'
import { selectOperationsByProduct } from '../domains/operations/selectors.js'
import { createOperationDefinition } from '../domains/operations/mutations.js'
import {
  createExecutionActualEntry,
  applyExecutionActualToTask,
  selectStationAssignmentsByDate,
} from '../domains/shifts/index.js'
import { selectEmployeeById } from '../domains/people/selectors.js'
import { useLanguage } from '../i18n/useLanguage.js'
import ProductPathBuilder from '../components/erp/ProductPathBuilder.jsx'

/**
 * @param {{ db: import('../data/mockDatabase.js').MockDatabase }} props
 */
export default function ManufacturingPage({ db }) {
  const { t } = useLanguage()
  const [productId, setProductId] = useState('prod-1')
  const [, setTick] = useState(0)
  const [opSearch, setOpSearch] = useState('')
  const [opStatusFilter, setOpStatusFilter] = useState('all')
  const [opOwnerFilter, setOpOwnerFilter] = useState('all')
  const [opMachineFilter, setOpMachineFilter] = useState('all')
  const [opPage, setOpPage] = useState(1)
  const [machineSearch, setMachineSearch] = useState('')
  const [machineStatusFilter, setMachineStatusFilter] = useState('all')
  const [machineWorkCenterFilter, setMachineWorkCenterFilter] = useState('all')
  const [banner, setBanner] = useState(/** @type {{ type: 'ok' | 'err'; text: string } | null} */ (null))

  const [opName, setOpName] = useState('')
  const [opStep, setOpStep] = useState('')
  const [opStdMin, setOpStdMin] = useState('30')
  const [opMach, setOpMach] = useState('')
  const [opSiloId, setOpSiloId] = useState('silo-custom')
  const [opSiloLabel, setOpSiloLabel] = useState('Custom silo')
  const [opOwner, setOpOwner] = useState('emp-1')
  const [opStation, setOpStation] = useState('')
  const [opTgtUnits, setOpTgtUnits] = useState('100')
  const [opTgtDefect, setOpTgtDefect] = useState('2')
  const [opTgtCycle, setOpTgtCycle] = useState('29')

  const [capDate, setCapDate] = useState('2026-04-11')
  const [capAssignment, setCapAssignment] = useState('')
  const [capOwner, setCapOwner] = useState('emp-1')
  const [capGood, setCapGood] = useState('10')
  const [capScrap, setCapScrap] = useState('0')
  const [capDur, setCapDur] = useState('60')
  const [capStart, setCapStart] = useState('2026-04-11T06:00:00')
  const [capEnd, setCapEnd] = useState('')
  const [capDown, setCapDown] = useState('0')
  const [capDownReason, setCapDownReason] = useState('')
  const [capNote, setCapNote] = useState('')

  const ops = useMemo(() => selectOperationsByProduct(db, productId), [db, productId])
  const opOwners = useMemo(
    () => Array.from(new Set(ops.map((op) => op.ownerId).filter(Boolean))),
    [ops],
  )
  const opMachines = useMemo(
    () => Array.from(new Set(ops.map((op) => op.machineId).filter(Boolean))),
    [ops],
  )
  const filteredOps = useMemo(() => {
    const query = opSearch.trim().toLowerCase()
    return ops.filter((op) => {
      if (opStatusFilter !== 'all' && op.status !== opStatusFilter) return false
      if (opOwnerFilter !== 'all' && op.ownerId !== opOwnerFilter) return false
      if (opMachineFilter !== 'all' && op.machineId !== opMachineFilter) return false
      if (!query) return true
      return (
        op.name.toLowerCase().includes(query) ||
        op.stepCode.toLowerCase().includes(query) ||
        op.id.toLowerCase().includes(query) ||
        (op.stationCode ?? '').toLowerCase().includes(query) ||
        (op.silo ?? '').toLowerCase().includes(query)
      )
    })
  }, [ops, opMachineFilter, opOwnerFilter, opSearch, opStatusFilter])
  const pageSize = 25
  const totalPages = Math.max(1, Math.ceil(filteredOps.length / pageSize))
  const currentOpPage = Math.min(opPage, totalPages)
  const pagedOps = useMemo(
    () => filteredOps.slice((currentOpPage - 1) * pageSize, currentOpPage * pageSize),
    [currentOpPage, filteredOps],
  )
  const opsSummary = useMemo(
    () => ({
      total: ops.length,
      visible: filteredOps.length,
      queued: ops.filter((op) => op.status === 'queued').length,
      inProgress: ops.filter((op) => op.status === 'in_progress').length,
      done: ops.filter((op) => op.status === 'done').length,
    }),
    [filteredOps.length, ops],
  )
  const machineWorkCenters = useMemo(
    () => Array.from(new Set(db.machines.map((machine) => machine.workCenterCode))),
    [db.machines],
  )
  const filteredMachines = useMemo(() => {
    const query = machineSearch.trim().toLowerCase()
    return db.machines.filter((machine) => {
      if (machineStatusFilter !== 'all' && machine.status !== machineStatusFilter) return false
      if (machineWorkCenterFilter !== 'all' && machine.workCenterCode !== machineWorkCenterFilter) return false
      if (!query) return true
      return (
        machine.id.toLowerCase().includes(query) ||
        machine.name.toLowerCase().includes(query) ||
        machine.workCenterCode.toLowerCase().includes(query) ||
        machine.capabilities.join(' ').toLowerCase().includes(query)
      )
    })
  }, [db.machines, machineSearch, machineStatusFilter, machineWorkCenterFilter])
  const machineSummary = useMemo(
    () => ({
      total: db.machines.length,
      running: db.machines.filter((machine) => machine.status === 'running').length,
      idle: db.machines.filter((machine) => machine.status === 'idle').length,
      down: db.machines.filter((machine) => machine.status === 'down').length,
      visible: filteredMachines.length,
    }),
    [db.machines, filteredMachines.length],
  )
  const capAssignments = useMemo(() => selectStationAssignmentsByDate(db, capDate), [db, capDate])

  function refresh() {
    setTick((x) => x + 1)
  }

  function onCreateOperation(e) {
    e.preventDefault()
    setBanner(null)
    const r = createOperationDefinition(db, {
      productId,
      name: opName,
      stepCode: opStep,
      standardMinutes: Number(opStdMin),
      machineId: opMach || undefined,
      siloId: opSiloId || undefined,
      silo: opSiloLabel || undefined,
      ownerId: opOwner,
      stationCode: opStation || undefined,
      dailyKpiTarget: {
        targetUnitsPerShift: Number(opTgtUnits),
        maxDefectRatePercent: Number(opTgtDefect),
        targetCycleMinutes: Number(opTgtCycle),
      },
    })
    if (r.ok) {
      setBanner({
        type: 'ok',
        text: `${t('mfg.opCreated')} ${r.operation.id} (${r.operation.name}).`,
      })
      setOpName('')
      setOpStep('')
      setOpPage(1)
      refresh()
    } else {
      setBanner({ type: 'err', text: r.errors.join(', ') })
    }
  }

  function onCaptureActual(e) {
    e.preventDefault()
    setBanner(null)
    if (!capAssignment) {
      setBanner({ type: 'err', text: t('mfg.selectAssignment') })
      return
    }
    const created = createExecutionActualEntry(db, {
      date: capDate,
      stationAssignmentId: capAssignment,
      ownerId: capOwner,
      actualStart: capStart || undefined,
      actualEnd: capEnd || undefined,
      actualDurationMinutes: capDur ? Number(capDur) : undefined,
      actualGoodQty: capGood ? Number(capGood) : undefined,
      actualScrapQty: capScrap ? Number(capScrap) : undefined,
      actualDowntimeMinutes: capDown ? Number(capDown) : undefined,
      actualDowntimeReason: capDownReason || undefined,
      executionNote: capNote || undefined,
    })
    if (!created.ok) {
      setBanner({ type: 'err', text: created.errors.join(', ') })
      return
    }
    const applied = applyExecutionActualToTask(db, created.actual)
    if (!applied.ok) {
      setBanner({ type: 'err', text: applied.errors.join(', ') })
      return
    }
    setBanner({
      type: 'ok',
      text: `${t('mfg.actualLogged')} ${applied.task.id} ${t('mfg.updatedStatus')} ${applied.task.status}).`,
    })
    refresh()
  }

  return (
    <div className="space-y-8">
      {banner ? (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            banner.type === 'ok' ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-800'
          }`}
        >
          {banner.text}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-slate-700">
          {t('common.product')}
          <select
            value={productId}
            onChange={(e) => {
              setProductId(e.target.value)
              setOpPage(1)
            }}
            className="ml-2 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          >
            {db.products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ProductPathBuilder key={productId} db={db} productId={productId} onSaved={refresh} />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">{t('mfg.routedTitle')}</h2>
        <p className="mt-1 text-sm text-slate-600">
          {t('mfg.routedHelp')} <span className="font-medium">{productId}</span> {t('mfg.routedHelpSuffix')}
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{t('mfg.summaryTotal')}</p>
            <p className="text-lg font-semibold text-slate-900">{opsSummary.total}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{t('mfg.summaryVisible')}</p>
            <p className="text-lg font-semibold text-slate-900">{opsSummary.visible}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{t('mfg.summaryQueued')}</p>
            <p className="text-lg font-semibold text-slate-900">{opsSummary.queued}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{t('mfg.summaryInProgress')}</p>
            <p className="text-lg font-semibold text-slate-900">{opsSummary.inProgress}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{t('mfg.summaryDone')}</p>
            <p className="text-lg font-semibold text-slate-900">{opsSummary.done}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-xs font-medium text-slate-700">
            {t('mfg.searchOps')}
            <input
              value={opSearch}
              onChange={(e) => {
                setOpSearch(e.target.value)
                setOpPage(1)
              }}
              placeholder={t('mfg.searchOpsPlaceholder')}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-700">
            {t('mfg.filterStatus')}
            <select
              value={opStatusFilter}
              onChange={(e) => {
                setOpStatusFilter(e.target.value)
                setOpPage(1)
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
            >
              <option value="all">{t('common.all')}</option>
              <option value="queued">queued</option>
              <option value="in_progress">in_progress</option>
              <option value="done">done</option>
              <option value="blocked">blocked</option>
            </select>
          </label>
          <label className="text-xs font-medium text-slate-700">
            {t('mfg.filterOwner')}
            <select
              value={opOwnerFilter}
              onChange={(e) => {
                setOpOwnerFilter(e.target.value)
                setOpPage(1)
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
            >
              <option value="all">{t('common.all')}</option>
              {opOwners.map((ownerId) => {
                const owner = selectEmployeeById(db, ownerId)
                return (
                  <option key={ownerId} value={ownerId}>
                    {owner?.name ?? ownerId}
                  </option>
                )
              })}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-700">
            {t('mfg.filterMachine')}
            <select
              value={opMachineFilter}
              onChange={(e) => {
                setOpMachineFilter(e.target.value)
                setOpPage(1)
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
            >
              <option value="all">{t('common.all')}</option>
              {opMachines.map((machineId) => {
                const machine = db.machines.find((m) => m.id === machineId)
                return (
                  <option key={machineId} value={machineId}>
                    {machine?.name ?? machineId}
                  </option>
                )
              })}
            </select>
          </label>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">{t('mfg.colSequence')}</th>
                <th className="px-3 py-2">{t('mfg.colOperation')}</th>
                <th className="px-3 py-2">{t('mfg.colOwner')}</th>
                <th className="px-3 py-2">{t('mfg.colMachine')}</th>
                <th className="px-3 py-2">{t('mfg.colStation')}</th>
                <th className="px-3 py-2">{t('mfg.colSilo')}</th>
                <th className="px-3 py-2 text-right">{t('mfg.colStdMin')}</th>
                <th className="px-3 py-2 text-right">{t('mfg.colTargetUnits')}</th>
                <th className="px-3 py-2 text-right">{t('mfg.colTargetCycle')}</th>
                <th className="px-3 py-2 text-right">{t('mfg.colMaxDefect')}</th>
                <th className="px-3 py-2">{t('mfg.colStatus')}</th>
              </tr>
            </thead>
            <tbody>
              {pagedOps.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-3 py-6 text-center text-sm text-slate-500">
                    {t('mfg.noOperationsMatch')}
                  </td>
                </tr>
              ) : (
                pagedOps.map((op) => {
                  const owner = op.ownerId ? selectEmployeeById(db, op.ownerId) : undefined
                  const machine = op.machineId ? db.machines.find((m) => m.id === op.machineId) : undefined
                  return (
                    <tr key={op.id} className="border-t border-slate-100 text-slate-700">
                      <td className="px-3 py-2 font-medium text-slate-900">{op.sequence}</td>
                      <td className="px-3 py-2">
                        <p className="font-medium text-slate-900">{op.name}</p>
                        <p className="text-[11px] text-slate-500">{op.id} · {op.stepCode}</p>
                      </td>
                      <td className="px-3 py-2">{owner?.name ?? '—'}</td>
                      <td className="px-3 py-2">{machine?.name ?? '—'}</td>
                      <td className="px-3 py-2">{op.stationCode ?? '—'}</td>
                      <td className="px-3 py-2">{op.silo ?? op.siloId ?? '—'}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{op.standardMinutes}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{op.dailyKpiTarget?.targetUnitsPerShift ?? '—'}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{op.dailyKpiTarget?.targetCycleMinutes ?? '—'}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{op.dailyKpiTarget?.maxDefectRatePercent ?? '—'}</td>
                      <td className="px-3 py-2">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                          {op.status}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            {t('mfg.pageInfo')} {currentOpPage}/{totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentOpPage <= 1}
              onClick={() => setOpPage((prev) => Math.max(1, prev - 1))}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('mfg.prev')}
            </button>
            <button
              type="button"
              disabled={currentOpPage >= totalPages}
              onClick={() => setOpPage((prev) => Math.min(totalPages, prev + 1))}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('mfg.next')}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">{t('mfg.machineCatalogTitle')}</h2>
        <p className="mt-1 text-sm text-slate-600">{t('mfg.machineCatalogHelp')}</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{t('mfg.machineSummaryTotal')}</p>
            <p className="text-lg font-semibold text-slate-900">{machineSummary.total}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{t('mfg.machineSummaryVisible')}</p>
            <p className="text-lg font-semibold text-slate-900">{machineSummary.visible}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{t('mfg.machineSummaryRunning')}</p>
            <p className="text-lg font-semibold text-slate-900">{machineSummary.running}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{t('mfg.machineSummaryIdle')}</p>
            <p className="text-lg font-semibold text-slate-900">{machineSummary.idle}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{t('mfg.machineSummaryDown')}</p>
            <p className="text-lg font-semibold text-slate-900">{machineSummary.down}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="text-xs font-medium text-slate-700">
            {t('mfg.machineSearch')}
            <input
              value={machineSearch}
              onChange={(e) => setMachineSearch(e.target.value)}
              placeholder={t('mfg.machineSearchPlaceholder')}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-700">
            {t('mfg.machineFilterStatus')}
            <select
              value={machineStatusFilter}
              onChange={(e) => setMachineStatusFilter(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
            >
              <option value="all">{t('common.all')}</option>
              <option value="running">running</option>
              <option value="idle">idle</option>
              <option value="down">down</option>
            </select>
          </label>
          <label className="text-xs font-medium text-slate-700">
            {t('mfg.machineFilterWorkCenter')}
            <select
              value={machineWorkCenterFilter}
              onChange={(e) => setMachineWorkCenterFilter(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
            >
              <option value="all">{t('common.all')}</option>
              {machineWorkCenters.map((workCenterCode) => (
                <option key={workCenterCode} value={workCenterCode}>
                  {workCenterCode}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">{t('mfg.machineColName')}</th>
                <th className="px-3 py-2">{t('mfg.machineColWorkCenter')}</th>
                <th className="px-3 py-2">{t('mfg.machineColStatus')}</th>
                <th className="px-3 py-2">{t('mfg.machineColCapabilities')}</th>
                <th className="px-3 py-2 text-right">{t('mfg.machineColUtilization')}</th>
                <th className="px-3 py-2 text-right">{t('mfg.machineColDowntime')}</th>
                <th className="px-3 py-2 text-right">{t('mfg.machineColHourlyRate')}</th>
                <th className="px-3 py-2">{t('mfg.machineColQualityRisk')}</th>
                <th className="px-3 py-2">{t('mfg.machineColLastMaintenance')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredMachines.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-sm text-slate-500">
                    {t('mfg.machineNoMatch')}
                  </td>
                </tr>
              ) : (
                filteredMachines.map((machine) => {
                  const lastMaintenance =
                    machine.maintenanceHistory.length > 0
                      ? machine.maintenanceHistory.reduce((a, b) => (a.date > b.date ? a : b))
                      : null
                  return (
                    <tr key={machine.id} className="border-t border-slate-100 text-slate-700">
                      <td className="px-3 py-2">
                        <p className="font-medium text-slate-900">{machine.name}</p>
                        <p className="text-[11px] text-slate-500">{machine.id}</p>
                      </td>
                      <td className="px-3 py-2">{machine.workCenterCode}</td>
                      <td className="px-3 py-2">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                          {machine.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">{machine.capabilities.join(', ')}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{machine.utilization}%</td>
                      <td className="px-3 py-2 text-right tabular-nums">{machine.downtimeHours}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{machine.hourlyRate}</td>
                      <td className="px-3 py-2">{machine.qualityRisk}</td>
                      <td className="px-3 py-2">
                        {lastMaintenance ? `${lastMaintenance.date} · ${lastMaintenance.description}` : '—'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">{t('mfg.createOp')}</h2>
        <p className="mt-1 text-xs text-slate-600">{t('mfg.createOpHelp')}</p>
        <form onSubmit={onCreateOperation} className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <label className="text-xs font-medium text-slate-700">
            {t('mfg.fieldName')}
            <input
              required
              value={opName}
              onChange={(e) => setOpName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
              placeholder={t('mfg.placeholderName')}
            />
          </label>
          <label className="text-xs font-medium text-slate-700">
            {t('mfg.fieldStepCode')}
            <input
              required
              value={opStep}
              onChange={(e) => setOpStep(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
              placeholder={t('mfg.placeholderStep')}
            />
          </label>
          <label className="text-xs font-medium text-slate-700">
            {t('mfg.fieldStdMin')}
            <input
              required
              type="number"
              min={1}
              value={opStdMin}
              onChange={(e) => setOpStdMin(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-700">
            {t('mfg.fieldMachineOpt')}
            <select
              value={opMach}
              onChange={(e) => setOpMach(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
            >
              <option value="">—</option>
              {db.machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-700">
            {t('mfg.fieldSiloId')}
            <input
              value={opSiloId}
              onChange={(e) => setOpSiloId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-700">
            {t('mfg.fieldSiloLabel')}
            <input
              value={opSiloLabel}
              onChange={(e) => setOpSiloLabel(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-700">
            {t('common.owner')}
            <select
              value={opOwner}
              onChange={(e) => setOpOwner(e.target.value)}
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
            {t('mfg.fieldStationOpt')}
            <input
              value={opStation}
              onChange={(e) => setOpStation(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-700">
            {t('mfg.fieldTgtUnits')}
            <input
              required
              type="number"
              min={1}
              value={opTgtUnits}
              onChange={(e) => setOpTgtUnits(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-700">
            {t('mfg.fieldMaxDefect')}
            <input
              required
              type="number"
              min={0}
              step={0.1}
              value={opTgtDefect}
              onChange={(e) => setOpTgtDefect(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-700">
            {t('mfg.fieldTgtCycle')}
            <input
              required
              type="number"
              min={1}
              value={opTgtCycle}
              onChange={(e) => setOpTgtCycle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
            />
          </label>
          <div className="flex items-end md:col-span-2 lg:col-span-3">
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              {t('mfg.createOpBtn')}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">{t('mfg.actualTitle')}</h2>
        <p className="mt-1 text-xs text-slate-600">{t('mfg.actualHelp')}</p>
        <form onSubmit={onCaptureActual} className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <label className="text-xs font-medium text-slate-700">
            {t('mfg.workDate')}
            <input
              type="date"
              value={capDate}
              onChange={(e) => {
                setCapDate(e.target.value)
                setCapAssignment('')
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-700 md:col-span-2">
            {t('mfg.stationAssignment')}
            <select
              value={capAssignment}
              onChange={(e) => setCapAssignment(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
            >
              <option value="">{t('common.select')}</option>
              {capAssignments.map((a) => {
                const emp = selectEmployeeById(db, a.employeeId)
                return (
                  <option key={a.id} value={a.id}>
                    {a.id} · {emp?.name ?? a.employeeId} · {a.stationCode}
                  </option>
                )
              })}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-700">
            {t('mfg.confirmOwner')}
            <select
              value={capOwner}
              onChange={(e) => setCapOwner(e.target.value)}
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
            {t('mfg.goodQty')}
            <input
              type="number"
              min={0}
              value={capGood}
              onChange={(e) => setCapGood(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-700">
            {t('mfg.scrapQty')}
            <input
              type="number"
              min={0}
              value={capScrap}
              onChange={(e) => setCapScrap(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-700">
            {t('mfg.durationMin')}
            <input
              type="number"
              min={0}
              value={capDur}
              onChange={(e) => setCapDur(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-700">
            {t('mfg.actualStart')}
            <input
              value={capStart}
              onChange={(e) => setCapStart(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-700">
            {t('mfg.actualEnd')}
            <input
              value={capEnd}
              onChange={(e) => setCapEnd(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
              placeholder="2026-04-11T14:00:00"
            />
          </label>
          <label className="text-xs font-medium text-slate-700">
            {t('mfg.downtimeMin')}
            <input
              type="number"
              min={0}
              value={capDown}
              onChange={(e) => setCapDown(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-700">
            {t('mfg.downtimeReason')}
            <input
              value={capDownReason}
              onChange={(e) => setCapDownReason(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-700 md:col-span-2">
            {t('common.note')}
            <input
              value={capNote}
              onChange={(e) => setCapNote(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
            />
          </label>
          <div className="flex items-end md:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              {t('mfg.saveActual')}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
