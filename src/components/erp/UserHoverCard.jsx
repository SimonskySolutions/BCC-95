import { useState } from 'react'
import { Mail, ShieldCheck } from 'lucide-react'

/**
 * Wrap a person's name to show an identification card on hover (name, role,
 * email, approval rights). Looks the user up in `db.employees` by id; falls
 * back to just rendering the children when unknown.
 *
 * @param {{
 *   db: any
 *   userId?: string
 *   children: import('react').ReactNode
 * }} props
 */
export default function UserHoverCard({ db, userId, children }) {
  const [show, setShow] = useState(false)
  const u = (db?.employees ?? []).find((e) => e.id === userId)

  return (
    <span
      className="relative inline-flex cursor-default"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span className={u ? 'underline decoration-dotted underline-offset-2' : undefined}>{children}</span>
      {show && u ? (
        <span className="absolute bottom-full left-0 z-40 mb-1 w-56 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-lg">
          <span className="block text-sm font-semibold text-slate-900">{u.name}</span>
          {u.role ? <span className="block text-xs text-slate-500">{u.role}</span> : null}
          {u.email ? (
            <span className="mt-1 flex items-center gap-1 text-xs text-slate-500">
              <Mail size={11} /> {u.email}
            </span>
          ) : null}
          {u.canApproveQuotes ? (
            <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-emerald-600">
              <ShieldCheck size={11} /> Can approve offers
            </span>
          ) : null}
          {u.active === false ? (
            <span className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">inactive</span>
          ) : null}
        </span>
      ) : null}
    </span>
  )
}
