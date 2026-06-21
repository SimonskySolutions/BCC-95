import { useLanguage } from '../../../i18n/useLanguage.js'
import { mandatoryQuotationTaskKeysForProduct } from '../../../services/quotations/quotationAutomationService.js'
import { patchTask } from '../../../domains/tasks/mutations.js'

/**
 * The two mandatory VSM gate tasks (tech review + costing) for a product,
 * resolvable inline. Renders nothing once both are resolved.
 * @param {{
 *   db: import('../../../data/mockDatabase.js').MockDatabase
 *   productId: string
 *   onChange: () => void
 * }} props
 */
export default function GateTasksPanel({ db, productId, onChange }) {
  const { t } = useLanguage()
  const keys = mandatoryQuotationTaskKeysForProduct(productId)
  const gateTasks = keys.map((key) => ({
    key,
    task: db.tasks.find((x) => x.productId === productId && x.taskKey === key && x.workstream === 'quotation'),
  }))
  if (gateTasks.every(({ task }) => task?.status === 'resolved')) return null
  return (
    <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
      <p className="text-xs font-semibold text-amber-900">{t('offer.gateTasks.title')}</p>
      <p className="mt-0.5 text-[11px] text-amber-700">{t('offer.gateTasks.hint')}</p>
      <ul className="mt-2 space-y-1.5">
        {gateTasks.map(({ key, task }) => {
          const assignee = task ? db.employees.find((e) => e.id === task.assigneeId) : undefined
          const resolved = task?.status === 'resolved'
          return (
            <li key={key} className="flex flex-wrap items-center gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-amber-100">
              <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${resolved ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className="min-w-0 flex-1 text-xs font-medium text-slate-800">
                {task?.title ?? key}
                {assignee ? <span className="ml-2 font-normal text-slate-400">{assignee.name}</span> : null}
              </span>
              {resolved ? (
                <span className="text-[10px] font-semibold text-emerald-600">✓ {t('offer.gateTasks.resolved')}</span>
              ) : task ? (
                <button
                  type="button"
                  onClick={() => {
                    patchTask(db, task.id, { status: 'resolved', completedAt: new Date().toISOString().slice(0, 10) })
                    onChange()
                  }}
                  className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                >
                  {t('offer.gateTasks.resolve')}
                </button>
              ) : (
                <span className="text-[10px] text-slate-400">{t('offer.gateTasks.missing')}</span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
