import { selectEmployeeById } from '../../domains/people/selectors.js'
import { selectProductById } from '../../domains/products/selectors.js'
import { useLanguage } from '../../i18n/useLanguage.js'

const STATUS_STYLES = {
  resolved:    'bg-emerald-100 text-emerald-800',
  in_progress: 'bg-blue-100 text-blue-800',
  pending:     'bg-amber-100 text-amber-800',
}

const TODAY = new Date().toISOString().slice(0, 10)

/**
 * @param {{
 *   db: import('../../data/mockDatabase.js').MockDatabase
 *   tasks: import('../../domains/tasks/model.js').Task[]
 *   showPlanningColumns?: boolean
 *   onOpenTask?: (taskId: string) => void
 * }} props
 */
export default function TaskTable({ db, tasks, showPlanningColumns = false, onOpenTask }) {
  const { t } = useLanguage()

  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
        {t('taskTable.empty')}
      </div>
    )
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
            const isOverdue = taskRow.status !== 'resolved' && taskRow.dueDate < TODAY
            const statusStyle = STATUS_STYLES[taskRow.status] ?? 'bg-slate-100 text-slate-700'
            return (
              <tr
                key={taskRow.id}
                onClick={onOpenTask ? () => onOpenTask(taskRow.id) : undefined}
                className={`hover:bg-slate-50/80 ${onOpenTask ? 'cursor-pointer' : ''} ${isOverdue ? 'bg-rose-50/40' : ''}`}
              >
                <td className="px-4 py-3 font-medium text-slate-900">
                  <span>{taskRow.title}</span>
                  {isOverdue && (
                    <span className="ml-2 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">Overdue</span>
                  )}
                </td>
                {showPlanningColumns ? (
                  <>
                    <td className="px-4 py-3 text-slate-600">
                      <p className="font-medium">{prod?.name ?? taskRow.productId}</p>
                      {prod?.sku ? <p className="text-[11px] text-slate-400">{prod.sku}</p> : null}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{quarterLabel}</td>
                    <td className="px-4 py-3 capitalize text-slate-600">{taskRow.workstream?.replace(/_/g, ' ')}</td>
                  </>
                ) : null}
                <td className="px-4 py-3 text-slate-600">{emp?.name ?? taskRow.assigneeId}</td>
                <td className={`px-4 py-3 text-sm ${isOverdue ? 'font-semibold text-rose-700' : 'text-slate-600'}`}>
                  {taskRow.dueDate}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle}`}>
                    {t(`taskStatus.${taskRow.status}`, taskRow.status.replace(/_/g, ' '))}
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
