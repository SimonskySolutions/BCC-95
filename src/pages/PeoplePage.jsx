import { useLanguage } from '../i18n/useLanguage.js'

/**
 * @param {{ db: import('../data/mockDatabase.js').MockDatabase; onTeamWorkload: () => void }} props
 */
export default function PeoplePage({ db, onTeamWorkload }) {
  const { t } = useLanguage()

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onTeamWorkload}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          {t('people.teamWorkload')}
        </button>
      </div>
      <ul className="grid gap-3 md:grid-cols-2">
        {db.employees.map((e) => (
          <li key={e.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
            <p className="font-semibold text-slate-900">{e.name}</p>
            <p className="text-sm text-slate-600">{e.role}</p>
            {e.team ? <p className="text-xs text-slate-500">{e.team}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
