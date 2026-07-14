import { useState } from 'react'
import { useDb } from '../data/useDb.js'
import { useLanguage } from '../i18n/useLanguage.js'
import { selectInquiryMessages } from '../domains/communications/selectors.js'
import InquiryChatPanel from './erp/offers/InquiryChatPanel.jsx'
import { dmThreadKey } from '../domains/communications/threadKeys.js'

function initials(name = '?') {
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

/**
 * Floating chat bubble — a global launcher for 1:1 employee conversations,
 * available on every page. Closed it's a round button; open it shows a contacts
 * list, then the conversation (reusing the discussion thread infrastructure).
 */
export default function ChatLauncher() {
  const { db, commit } = useDb()
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [selId, setSelId] = useState(/** @type {string | null} */ (null))

  const me = db.employees[0]
  const others = db.employees.filter((e) => e.id !== me?.id)
  const counterpart = db.employees.find((e) => e.id === selId)
  const threadKey = me && counterpart ? dmThreadKey(me.id, counterpart.id) : null

  return (
    <>
      {/* Bubble */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={t('nav.messages')}
        aria-label={t('nav.messages')}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition hover:bg-blue-700 active:scale-95"
      >
        {open ? (
          <span className="text-xl leading-none">✕</span>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        )}
      </button>

      {/* Panel */}
      {open ? (
        <div className="fixed bottom-24 right-6 z-40 flex h-[520px] max-h-[calc(100vh-7rem)] w-[360px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <header className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
            {counterpart ? (
              <button
                type="button"
                onClick={() => setSelId(null)}
                className="rounded-lg px-1.5 py-0.5 text-slate-500 hover:bg-slate-100"
                aria-label={t('common.back', 'Back')}
              >
                ‹
              </button>
            ) : null}
            <h3 className="flex-1 truncate text-sm font-semibold text-slate-900">
              {counterpart ? counterpart.name : t('nav.messages')}
            </h3>
          </header>

          {counterpart && threadKey ? (
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <InquiryChatPanel db={db} threadKey={threadKey} actorId={me?.id} onChange={() => commit()} />
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <p className="px-4 pt-3 text-[11px] text-slate-400">{t('dm.youAre')} {me?.name}</p>
              <ul className="p-2">
                {others.map((emp) => {
                  const count = me ? selectInquiryMessages(db, dmThreadKey(me.id, emp.id)).length : 0
                  return (
                    <li key={emp.id}>
                      <button
                        type="button"
                        onClick={() => setSelId(emp.id)}
                        className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-slate-50"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                          {initials(emp.name)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-slate-800">{emp.name}</span>
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
            </div>
          )}
        </div>
      ) : null}
    </>
  )
}
