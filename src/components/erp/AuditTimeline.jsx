import { useLanguage } from '../../i18n/useLanguage.js'

/**
 * @param {{
 *   entries: import('../../domains/audit/model.js').AuditEntry[]
 *   employeeLookup?: Record<string, string>
 * }} props
 */
export default function AuditTimeline({ entries, employeeLookup = {} }) {
  const { t } = useLanguage()
  if (!entries || entries.length === 0) {
    return <p className="text-xs text-slate-500">{t('audit.empty')}</p>
  }
  return (
    <ol className="relative space-y-3 border-l border-slate-200 pl-4">
      {[...entries]
        .sort((a, b) => (a.at < b.at ? 1 : -1))
        .map((entry) => (
          <li key={entry.id} className="relative">
            <span className="absolute -left-[21px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-slate-400" />
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs">
              <div className="flex items-center justify-between text-slate-700">
                <span className="font-semibold">{t(`audit.action.${entry.action}`, entry.action)}</span>
                <span className="text-slate-500">{entry.at.replace('T', ' ').slice(0, 16)}</span>
              </div>
              <div className="mt-0.5 text-slate-500">
                {entry.actorId ? `${employeeLookup[entry.actorId] ?? entry.actorId} · ` : ''}
                {entry.actorLabel ? `${entry.actorLabel} · ` : ''}
                {entry.entityType}:{entry.entityId}
              </div>
              {entry.meta ? (
                <div className="mt-1 font-mono text-[10px] text-slate-500">
                  {JSON.stringify(entry.meta)}
                </div>
              ) : null}
            </div>
          </li>
        ))}
    </ol>
  )
}
