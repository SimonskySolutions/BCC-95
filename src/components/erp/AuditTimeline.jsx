import { useLanguage } from '../../i18n/useLanguage.js'

/** @param {string} iso */
function relativeTime(iso) {
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** Render audit metadata as readable key-value pairs instead of raw JSON. */
function MetaDisplay({ meta }) {
  if (!meta || typeof meta !== 'object') return null
  const entries = Object.entries(meta).filter(([, v]) => v !== null && v !== undefined && v !== '')
  if (entries.length === 0) return null
  return (
    <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[10px]">
      {entries.map(([key, val]) => (
        <div key={key} className="contents">
          <dt className="font-medium text-slate-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</dt>
          <dd className="truncate text-slate-600">{Array.isArray(val) ? val.join(', ') : String(val)}</dd>
        </div>
      ))}
    </dl>
  )
}

function dotColor(action) {
  if (!action) return 'bg-slate-400'
  if (action.includes('created') || action.includes('approved') || action.includes('accepted')) return 'bg-emerald-400'
  if (action.includes('rejected') || action.includes('cancelled')) return 'bg-rose-400'
  if (action.includes('sent') || action.includes('updated')) return 'bg-blue-400'
  return 'bg-slate-400'
}

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
        .map((entry) => {
          const actorName = entry.actorId ? (employeeLookup[entry.actorId] ?? entry.actorId) : entry.actorLabel
          return (
            <li key={entry.id} className="relative">
              <span className={`absolute -left-[21px] top-1.5 h-3 w-3 rounded-full border-2 border-white ${dotColor(entry.action)}`} />
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs">
                <div className="flex items-start justify-between gap-2 text-slate-700">
                  <span className="font-semibold leading-snug">{t(`audit.action.${entry.action}`, entry.action.replace(/\./g, ' '))}</span>
                  <span className="shrink-0 text-slate-400" title={entry.at.replace('T', ' ').slice(0, 16)}>
                    {relativeTime(entry.at)}
                  </span>
                </div>
                {actorName ? (
                  <p className="mt-0.5 text-slate-500">{actorName}</p>
                ) : null}
                <MetaDisplay meta={entry.meta} />
              </div>
            </li>
          )
        })}
    </ol>
  )
}
