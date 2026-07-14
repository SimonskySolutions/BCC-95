import { useState } from 'react'
import { ChevronDown, UserCircle2 } from 'lucide-react'
import { useCurrentUser } from '../auth/useCurrentUser.js'
import { useLanguage } from '../i18n/useLanguage.js'

/**
 * Pick the user you're "acting as" (no passwords). Drives permission checks
 * across the app. Only active users are selectable.
 */
export default function UserSwitcher() {
  const { user, users, setUserId } = useCurrentUser()
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const selectable = users.filter((u) => u.active !== false)

  if (!user) {
    return (
      <div className="hidden items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 sm:flex">
        {t('user.none')}
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 hover:bg-white"
      >
        <UserCircle2 size={18} className="text-slate-400" />
        <div className="hidden text-left sm:block">
          <p className="text-xs font-semibold leading-none text-slate-900">{user.name}</p>
          <p className="mt-0.5 text-xs leading-none text-slate-400">{user.role}</p>
        </div>
        <ChevronDown size={14} className="text-slate-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
            <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">
              {t('user.actingAs')}
            </p>
            <div className="max-h-72 overflow-y-auto">
              {selectable.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => { setUserId(u.id); setOpen(false) }}
                  className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left hover:bg-slate-50 ${
                    u.id === user.id ? 'bg-slate-50' : ''
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-slate-800">{u.name}</span>
                    <span className="block truncate text-[11px] text-slate-400">{u.role}</span>
                  </span>
                  {u.id === user.id ? <span className="text-[10px] font-semibold text-emerald-600">●</span> : null}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
