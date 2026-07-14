import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  computeDeliveryMetrics,
  computeProcessHealthMetrics,
  computeProductivityMetrics,
  computeQuarterlyTaskPlanMetrics,
  computeWorkloadByEmployee,
} from '../services/kpis/kpiCalculator.js'
import {
  evaluateQuotationTaskReadiness,
  generateQuoteFromReadiness,
} from '../services/quotations/quotationAutomationService.js'
import { computeDailyOperationKpis } from '../services/operations/dailyOperationKpiService.js'
import { useLanguage } from '../i18n/useLanguage.js'
import { selectEmployeeById } from '../domains/people/selectors.js'
import { selectMonthlySpend, selectTopVendorsBySpend } from '../domains/purchase/selectors.js'
import { groupAmount } from '../lib/money.js'
import DatePicker from '../components/DatePicker.jsx'

/**
 * @param {{ db: import('../data/mockDatabase.js').MockDatabase }} props
 */
export default function AnalyticsPage({ db }) {
  const { t } = useLanguage()
  const [kpiDate, setKpiDate] = useState('2026-04-11')
  const operationKpis = useMemo(() => computeDailyOperationKpis(db, kpiDate), [db, kpiDate])
  const monthlySpend = useMemo(() => selectMonthlySpend(db), [db])
  const topVendors = useMemo(() => selectTopVendorsBySpend(db), [db])

  const referenceDate = '2026-04-10'
  const delivery = computeDeliveryMetrics(db, referenceDate)
  const productivity = computeProductivityMetrics(db)
  const process = computeProcessHealthMetrics(db)
  const workload = computeWorkloadByEmployee(db)
  const q2 = computeQuarterlyTaskPlanMetrics(db, 2026, 'Q2', referenceDate)
  const quarterSeries = useMemo(
    () =>
      /** @type {import('../domains/tasks/model.js').PlannedQuarter[]} */ (['Q1', 'Q2', 'Q3', 'Q4']).map(
        (quarter) => computeQuarterlyTaskPlanMetrics(db, 2026, quarter, referenceDate),
      ),
    [db],
  )
  const workloadSeries = useMemo(
    () =>
      workload.map((row) => ({
        employee: selectEmployeeById(db, row.employeeId)?.name ?? row.employeeId,
        openTasks: row.openTaskCount,
      })),
    [db, workload],
  )
  const operationPerfSeries = useMemo(
    () =>
      [...operationKpis]
        .sort((a, b) => b.plannedTargetUnits - a.plannedTargetUnits)
        .slice(0, 10)
        .map((row) => ({
          operation: row.operationName.length > 16 ? `${row.operationName.slice(0, 16)}…` : row.operationName,
          targetUnits: row.plannedTargetUnits,
          actualGood: row.actualGoodQty,
          defectRate: Number(row.defectRatePercent.toFixed(1)),
        })),
    [operationKpis],
  )

  const [preview, setPreview] = useState(/** @type {unknown} */ (null))
  const [, setRefresh] = useState(0)

  const readiness = evaluateQuotationTaskReadiness(db, { quoteId: 'quote-1', productId: 'prod-1' })
  const blockedGen = generateQuoteFromReadiness(db, {
    clientId: 'client-1',
    productId: 'prod-1',
    quoteId: 'quote-1',
  })

  function simulateCompleteCosting() {
    const taskRow = db.tasks.find((x) => x.taskKey === 'quote-costing-prod-1')
    if (taskRow) {
      taskRow.status = 'resolved'
      taskRow.completedAt = '2026-04-10'
    }
    setPreview(generateQuoteFromReadiness(db, { clientId: 'client-1', productId: 'prod-1', quoteId: 'quote-1' }))
    setRefresh((x) => x + 1)
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">{t('analytics.visualSectionTitle')}</h3>
        <p className="mt-1 text-xs text-slate-600">{t('analytics.visualSectionHelp')}</p>
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-900">{t('analytics.chartQuarterTitle')}</p>
            <p className="text-xs text-slate-500">{t('analytics.chartQuarterSubtitle')}</p>
            <div className="mt-3 h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={quarterSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="quarter" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="planned" name={t('analytics.metricPlanned')} fill="#cbd5e1" />
                  <Bar dataKey="completed" name={t('analytics.metricCompleted')} fill="#10b981" />
                  <Bar dataKey="overdue" name={t('analytics.metricOverdue')} fill="#ef4444" />
                  <Bar dataKey="carryover" name={t('analytics.metricCarryover')} fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-900">{t('analytics.chartWorkloadTitle')}</p>
            <p className="text-xs text-slate-500">{t('analytics.chartWorkloadSubtitle')}</p>
            <div className="mt-3 h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workloadSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="employee" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="openTasks" name={t('analytics.metricOpenTasks')} fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-900">{t('analytics.chartOperationTitle')}</p>
            <p className="text-xs text-slate-500">{t('analytics.chartOperationSubtitle')}</p>
            <div className="mt-3 h-60">
              {operationPerfSeries.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-slate-500">
                  {t('analytics.chartEmpty')}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={operationPerfSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="operation" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar yAxisId="left" dataKey="targetUnits" name={t('analytics.metricTargetUnits')} fill="#94a3b8" />
                    <Bar yAxisId="left" dataKey="actualGood" name={t('analytics.metricActualGood')} fill="#22c55e" />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="defectRate"
                      name={t('analytics.metricDefectRate')}
                      stroke="#ef4444"
                      strokeWidth={2}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </section>

      {monthlySpend.length > 0 || topVendors.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900">{t('analytics.purchasingTitle', 'Purchasing')}</h3>
          <p className="mt-1 text-xs text-slate-600">{t('analytics.purchasingHelp', 'Spend from purchase orders (cancelled orders excluded).')}</p>
          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 xl:col-span-2">
              <p className="text-sm font-semibold text-slate-900">{t('analytics.monthlySpend', 'Monthly spend')}</p>
              <div className="mt-3 h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlySpend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="spend" name={t('purchase.stat.spend', 'Total spend')} fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-900">{t('analytics.topVendors', 'Top vendors by spend')}</p>
              <ul className="mt-3 space-y-2">
                {topVendors.map((v) => {
                  const max = topVendors[0]?.spend || 1
                  return (
                    <li key={v.vendorId} className="text-xs">
                      <div className="flex justify-between gap-2">
                        <span className="truncate font-medium text-slate-800">{v.vendor}</span>
                        <span className="shrink-0 text-slate-500">{groupAmount(v.spend)}</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-slate-200">
                        <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${Math.max(4, Math.round((v.spend / max) * 100))}%` }} />
                      </div>
                    </li>
                  )
                })}
                {topVendors.length === 0 ? <li className="text-xs text-slate-400">—</li> : null}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
        <h3 className="text-sm font-semibold text-slate-900">{t('analytics.kpiTitle')}</h3>
        <p className="mt-1 text-xs text-slate-600">{t('analytics.kpiHelp')}</p>
        <label className="mt-3 block text-xs font-medium text-slate-700">
          {t('common.date')}
          <DatePicker className="ml-2 mt-1 w-48" value={kpiDate} onChange={(iso) => setKpiDate(iso)} />
        </label>
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">{t('analytics.colOperation')}</th>
                <th className="px-3 py-2">{t('analytics.colProduct')}</th>
                <th className="px-3 py-2 text-right">{t('analytics.colTargetUnits')}</th>
                <th className="px-3 py-2 text-right">{t('analytics.colGood')}</th>
                <th className="px-3 py-2 text-right">{t('analytics.colScrap')}</th>
                <th className="px-3 py-2 text-right">{t('analytics.colDefect')}</th>
                <th className="px-3 py-2 text-right">{t('analytics.colCycle')}</th>
                <th className="px-3 py-2 text-right">{t('analytics.colParticipants')}</th>
              </tr>
            </thead>
            <tbody>
              {operationKpis.map((row) => (
                <tr key={row.operationId} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-900">{row.operationName}</td>
                  <td className="px-3 py-2">{row.productId}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.plannedTargetUnits}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.actualGoodQty}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.actualScrapQty}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.defectRatePercent.toFixed(1)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.cycleAdherencePercent == null ? '—' : `${row.cycleAdherencePercent}`}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.participationCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
        <h3 className="text-sm font-semibold text-slate-900">{t('analytics.quoteTitle')}</h3>
        <p className="mt-1 text-xs text-slate-600">
          {t('analytics.quoteReadiness')}{' '}
          <code className="rounded bg-white px-1">quote-1</code> /{' '}
          <code className="rounded bg-white px-1">prod-1</code>:{' '}
          <span className="font-medium">{readiness.ready ? t('analytics.ready') : t('analytics.blocked')}</span>
          {!readiness.ready ? (
            <span className="text-slate-500">
              {' '}
              — {t('analytics.pending')} {readiness.pendingKeys.join(', ')}
            </span>
          ) : null}
        </p>
        <p className="mt-2 text-xs text-slate-600">
          {t('analytics.liveGen')}{' '}
          {blockedGen.ok ? (
            <span className="font-medium text-emerald-800">
              {t('analytics.subtotal')} {blockedGen.draft.subtotal}
            </span>
          ) : (
            <span className="font-medium text-amber-800">{blockedGen.code}</span>
          )}
        </p>
        <button
          type="button"
          onClick={simulateCompleteCosting}
          className="mt-3 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
        >
          {t('analytics.simulateBtn')}
        </button>
        {preview ? (
          <pre className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800">
            {JSON.stringify(preview, null, 2)}
          </pre>
        ) : null}
      </section>

      <pre className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-900 p-4 text-xs text-slate-100">
        {JSON.stringify({ delivery, productivity, process, workload, quarterlyQ2_2026: q2 }, null, 2)}
      </pre>
    </div>
  )
}
