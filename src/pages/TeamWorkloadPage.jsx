import { useState } from 'react'
import { computeWorkloadByEmployee } from '../services/kpis/kpiCalculator.js'
import { selectEmployeeById } from '../domains/people/selectors.js'
import { selectTasksByEmployee } from '../domains/tasks/selectors.js'
import { TASK_STATUSES } from '../domains/tasks/model.js'
import TaskTable from '../components/erp/TaskTable.jsx'
import { useLanguage } from '../i18n/useLanguage.js'

/**
 * @param {{ db: import('../data/mockDatabase.js').MockDatabase }} props
 */
export default function TeamWorkloadPage({ db }) {
  const { t } = useLanguage()
  const rows = computeWorkloadByEmployee(db)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(rows[0]?.employeeId ?? '')
  const [statusFilter, setStatusFilter] = useState('all')
  const selectedTasks = selectedEmployeeId ? selectTasksByEmployee(db, selectedEmployeeId) : []
  const filteredTasks =
    statusFilter === 'all'
      ? selectedTasks
      : selectedTasks.filter((taskRow) => taskRow.status === statusFilter)
  const statusCounts = TASK_STATUSES.reduce((acc, status) => {
    acc[status] = selectedTasks.filter((taskRow) => taskRow.status === status).length
    return acc
  }, /** @type {Record<string, number>} */ ({}))

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">{t('team.intro')}</p>
      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">{t('common.name')}</th>
                <th className="px-4 py-3">{t('team.colOpenTasks')}</th>
                <th className="px-4 py-3">{t('team.colTotalTasks')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => {
                const emp = selectEmployeeById(db, r.employeeId)
                const total = selectTasksByEmployee(db, r.employeeId).length
                const active = r.employeeId === selectedEmployeeId
                return (
                  <tr
                    key={r.employeeId}
                    className={`cursor-pointer ${active ? 'bg-blue-50/60' : 'hover:bg-slate-50/80'}`}
                    onClick={() => setSelectedEmployeeId(r.employeeId)}
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">{emp?.name ?? r.employeeId}</td>
                    <td className="px-4 py-3 text-slate-700">{r.openTaskCount}</td>
                    <td className="px-4 py-3 text-slate-700">{total}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{t('team.assignedTasksTitle')}</p>
                <p className="text-xs text-slate-500">
                  {t('team.selectedEmployee')}{' '}
                  <span className="font-medium text-slate-700">
                    {selectEmployeeById(db, selectedEmployeeId)?.name ?? selectedEmployeeId}
                  </span>
                </p>
              </div>
              <label className="text-xs font-medium text-slate-700">
                {t('team.filterStatus')}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="ml-2 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                >
                  <option value="all">{t('common.all')}</option>
                  {TASK_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {t(`taskStatus.${status}`, status)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {TASK_STATUSES.map((status) => (
                <span key={status} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  {t(`taskStatus.${status}`, status)}: {statusCounts[status] ?? 0}
                </span>
              ))}
            </div>
          </div>

          {filteredTasks.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
              {t('team.noTasks')}
            </p>
          ) : (
            <TaskTable db={db} tasks={filteredTasks} showPlanningColumns />
          )}
        </div>
      </div>
    </div>
  )
}
