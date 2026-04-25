import { useLanguage } from '../i18n/useLanguage.js'

/**
 * @param {{
 *   db: import('../data/mockDatabase.js').MockDatabase
 *   onOpenMachine: (id: string) => void
 * }} props
 */
export default function MachinesPage({ db, onOpenMachine }) {
  const { t } = useLanguage()

  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {db.machines.map((m) => (
        <li key={m.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-slate-900">{m.name}</p>
              <p className="text-xs text-slate-500">{m.workCenterCode}</p>
            </div>
            <button
              type="button"
              onClick={() => onOpenMachine(m.id)}
              className="shrink-0 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
            >
              {t('common.profile')}
            </button>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            {t('machines.status')} {m.status}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {t('machines.utilRisk')} {m.utilization}% · {t('machines.risk')} {m.qualityRisk}
          </p>
        </li>
      ))}
    </ul>
  )
}
