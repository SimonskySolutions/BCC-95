import { useDb } from '../../../data/useDb.js'
import { useLanguage } from '../../../i18n/useLanguage.js'
import { patchClient } from '../../../domains/crm/mutations.js'

const STATUSES = ['lead', 'active', 'on_hold', 'inactive']
const STATUS_STYLE = {
  lead: 'bg-amber-50 text-amber-700',
  active: 'bg-emerald-50 text-emerald-700',
  on_hold: 'bg-slate-100 text-slate-600',
  inactive: 'bg-rose-50 text-rose-700',
}

/**
 * Customer status + assigned sales representative — quick-edit bar on the
 * profile. Reps come from the active users (`db.employees`).
 *
 * @param {{ client: import('../../../domains/crm/model.js').Client }} props
 */
export default function ClientStatusBar({ client }) {
  const { db, commit } = useDb()
  const { t } = useLanguage()
  const reps = (db.employees ?? []).filter((e) => e.active !== false)
  const status = client.status ?? 'lead'

  const fieldCls = 'rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs'

  return (
    <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-card">
      <label className="flex items-center gap-2">
        <span className="text-xs font-medium text-slate-500">{t('client.status')}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status] ?? STATUS_STYLE.lead}`}>
          {t(`client.status.${status}`, status)}
        </span>
        <select
          className={fieldCls}
          value={status}
          onChange={(e) => commit(() => patchClient(db, client.id, { status: e.target.value }))}
        >
          {STATUSES.map((s) => <option key={s} value={s}>{t(`client.status.${s}`, s)}</option>)}
        </select>
      </label>

      <label className="flex items-center gap-2">
        <span className="text-xs font-medium text-slate-500">{t('client.assignedRep')}</span>
        <select
          className={fieldCls}
          value={client.assignedRepId ?? ''}
          onChange={(e) => commit(() => patchClient(db, client.id, { assignedRepId: e.target.value || undefined }))}
        >
          <option value="">{t('client.assignedRep.none')}</option>
          {reps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </label>
    </section>
  )
}
