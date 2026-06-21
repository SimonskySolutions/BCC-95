import { useState } from 'react'
import { useDb } from '../data/useDb.js'
import { useLanguage } from '../i18n/useLanguage.js'
import { selectInquiryMessages } from '../domains/communications/selectors.js'
import InquiryChatPanel from '../components/erp/offers/InquiryChatPanel.jsx'

/** Stable thread key for a 1:1 conversation between two employees. */
export function dmThreadKey(a, b) {
  return `dm:${[a, b].sort().join('|')}`
}

function initials(name = '?') {
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

/**
 * Direct messages between employees — a contacts list on the left, the
 * conversation on the right. Reuses the inquiry/quotation discussion thread
 * infrastructure, keyed by the participant pair.
 */
export default function MessagesPage() {
  const { db, commit } = useDb()
  const { t } = useLanguage()
  const me = db.employees[0]
  const others = db.employees.filter((e) => e.id !== me?.id)
  const [selId, setSelId] = useState(others[0]?.id ?? null)
  const counterpart = db.employees.find((e) => e.id === selId)
  const threadKey = me && counterpart ? dmThreadKey(me.id, counterpart.id) : null

  return (
    <div className="flex h-[calc(100vh-160px)] min-h-[420px] gap-4">
      {/* Contacts */}
      <aside className="w-64 shrink-0 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-card">
        <header className="border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">{t('dm.contacts')}</h3>
          <p className="text-[11px] text-slate-400">{t('dm.youAre')} {me?.name}</p>
        </header>
        <ul>
          {others.map((emp) => {
            const count = me ? selectInquiryMessages(db, dmThreadKey(me.id, emp.id)).length : 0
            const active = emp.id === selId
            return (
              <li key={emp.id}>
                <button
                  type="button"
                  onClick={() => setSelId(emp.id)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${active ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                    {initials(emp.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm font-medium ${active ? 'text-blue-800' : 'text-slate-800'}`}>{emp.name}</span>
                    {emp.role ? <span className="block truncate text-[11px] text-slate-400">{emp.role}</span> : null}
                  </span>
                  {count > 0 ? (
                    <span className="shrink-0 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">{count}</span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      </aside>

      {/* Conversation */}
      <section className="flex min-w-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white shadow-card">
        {counterpart && threadKey ? (
          <>
            <header className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                {initials(counterpart.name)}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">{counterpart.name}</h3>
                {counterpart.role ? <p className="text-[11px] text-slate-400">{counterpart.role}</p> : null}
              </div>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <InquiryChatPanel db={db} threadKey={threadKey} actorId={me?.id} onChange={() => commit()} />
            </div>
          </>
        ) : (
          <p className="m-auto text-sm text-slate-400">{t('dm.pick')}</p>
        )}
      </section>
    </div>
  )
}
