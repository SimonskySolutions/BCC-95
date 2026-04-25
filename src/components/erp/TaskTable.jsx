import { selectEmployeeById } from '../../domains/people/selectors.js'
import { selectProductById } from '../../domains/products/selectors.js'
import { useLanguage } from '../../i18n/useLanguage.js'

/**
 * @param {{
 *   db: import('../../data/mockDatabase.js').MockDatabase
 *   tasks: import('../../domains/tasks/model.js').Task[]
 *   showPlanningColumns?: boolean
 * }} props
 */
export default function TaskTable({ db, tasks, showPlanningColumns = false }) {
  const { t } = useLanguage()

  if (tasks.length === 0) {
    return <p className="text-sm text-slate-500">{t('taskTable.empty')}</p>
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">{t('common.title')}</th>
            {showPlanningColumns ? (
              <>
                <th className="px-4 py-3">{t('taskTable.colProduct')}</th>
                <th className="px-4 py-3">{t('taskTable.colQuarter')}</th>
                <th className="px-4 py-3">{t('taskTable.colWorkstream')}</th>
              </>
            ) : null}
            <th className="px-4 py-3">{t('taskTable.colAssignee')}</th>
            <th className="px-4 py-3">{t('common.due')}</th>
            <th className="px-4 py-3">{t('common.status')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tasks.map((taskRow) => {
            const emp = selectEmployeeById(db, taskRow.assigneeId)
            const prod = selectProductById(db, taskRow.productId)
            const quarterLabel = `${taskRow.plannedYear} ${taskRow.plannedQuarter}`
            return (
              <tr key={taskRow.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3 font-medium text-slate-900">{taskRow.title}</td>
                {showPlanningColumns ? (
                  <>
                    <td className="px-4 py-3 text-slate-600">{prod?.sku ?? taskRow.productId}</td>
                    <td className="px-4 py-3 text-slate-600">{quarterLabel}</td>
                    <td className="px-4 py-3 text-slate-600">{taskRow.workstream}</td>
                  </>
                ) : null}
                <td className="px-4 py-3 text-slate-600">{emp?.name ?? taskRow.assigneeId}</td>
                <td className="px-4 py-3 text-slate-600">{taskRow.dueDate}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                    {t(`taskStatus.${taskRow.status}`, taskRow.status)}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
