import { useState } from 'react'
import { Bell, AtSign, ClipboardCheck, FileUp, Check } from 'lucide-react'
import { useDb } from '../data/useDb.js'
import { useCurrentUser } from '../auth/useCurrentUser.js'
import { useLanguage } from '../i18n/useLanguage.js'
import { selectNotifications, selectUnreadCount } from '../domains/notifications/selectors.js'
import { markNotificationRead, markAllNotificationsRead } from '../domains/notifications/mutations.js'

const ICONS = { mention: AtSign, approval: ClipboardCheck, upload: FileUp }

/**
 * Notification inbox in the header: unread badge + dropdown. Clicking an item
 * marks it read and navigates to the thing that needs attention.
 *
 * @param {{ onNavigate?: (link: any) => void }} props
 */
export default function NotificationBell({ onNavigate }) {
  const { db, commit } = useDb()
  const { user } = useCurrentUser()
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)

  if (!user) return null
  const items = selectNotifications(db, user.id)
  const unread = selectUnreadCount(db, user.id)

  function openItem(n) {
    commit(() => markNotificationRead(db, n.id))
    setOpen(false)
    if (n.link) onNavigate?.(n.link)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
        aria-label={t('notif.title')}
      >
        <Bell size={18} />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-1 w-80 rounded-xl border border-slate-200 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
              <span className="text-sm font-semibold text-slate-900">{t('notif.title')}</span>
              {unread > 0 ? (
                <button type="button" onClick={() => commit(() => markAllNotificationsRead(db, user.id))}
                  className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800">
                  <Check size={12} /> {t('notif.markAll')}
                </button>
              ) : null}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-slate-400">{t('notif.empty')}</p>
              ) : (
                items.slice(0, 30).map((n) => {
                  const Icon = ICONS[n.type] ?? Bell
                  return (
                    <button key={n.id} type="button" onClick={() => openItem(n)}
                      className={`flex w-full items-start gap-2 border-b border-slate-50 px-3 py-2 text-left hover:bg-slate-50 ${n.read ? '' : 'bg-blue-50/40'}`}>
                      <Icon size={15} className={`mt-0.5 shrink-0 ${n.read ? 'text-slate-300' : 'text-blue-500'}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-medium text-slate-800">{n.title}</span>
                        {n.body ? <span className="block truncate text-[11px] text-slate-500">{n.body}</span> : null}
                        <span className="block text-[10px] text-slate-400">{String(n.createdAt).replace('T', ' ').slice(0, 16)}</span>
                      </span>
                      {!n.read ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" /> : null}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
