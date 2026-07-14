import { useEffect, useState } from 'react'
import { Trash2, Plus, ShieldCheck } from 'lucide-react'
import { useDb } from '../data/useDb.js'
import { refreshUsers } from '../data/store.js'
import { useLanguage } from '../i18n/useLanguage.js'
import { useConfirm } from './ui/feedbackContext.js'
import { roleLabel } from '../auth/roleLabels.js'

/**
 * Manage employee accounts and their roles. Users live in the relational
 * `users` table (master data); this calls the API and re-syncs `db.employees`.
 */
export default function UsersAdmin() {
  const { db } = useDb()
  const { t, language } = useLanguage()
  const confirmDialog = useConfirm()
  const users = db.employees ?? []
  const [roles, setRoles] = useState(/** @type {any[]} */ ([]))
  const [form, setForm] = useState({ name: '', email: '', roleId: '' })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetch('/api/roles')
      .then((r) => (r.ok ? r.json() : []))
      .then((rs) => {
        setRoles(rs)
        setForm((f) => ({ ...f, roleId: f.roleId || rs[0]?.id || '' }))
      })
      .catch(() => {})
  }, [])

  async function api(path, opts) {
    setBusy(true)
    try {
      await fetch(path, opts)
      await refreshUsers(db)
    } finally {
      setBusy(false)
    }
  }

  const createUser = () => {
    if (!form.name.trim()) return
    api('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    }).then(() => setForm({ name: '', email: '', roleId: roles[0]?.id || '' }))
  }
  const patchUser = (id, patch) =>
    api(`/api/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
  const deleteUser = async (id) => {
    const ok = await confirmDialog({ message: t('users.deleteConfirm'), confirmLabel: t('common.delete', 'Delete'), danger: true })
    if (ok) api(`/api/users/${id}`, { method: 'DELETE' })
  }

  const input = 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200'

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">{t('users.intro')}</p>

      {/* Add user */}
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
        <input className={input} placeholder={t('users.name')} value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className={input} placeholder={t('users.email')} value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <select className={input} value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>
          {roles.map((r) => <option key={r.id} value={r.id}>{roleLabel(r, language)}</option>)}
        </select>
        <button type="button" onClick={createUser} disabled={busy || !form.name.trim()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
          <Plus size={14} /> {t('users.add')}
        </button>
      </div>

      {/* User list */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">{t('users.name')}</th>
              <th className="px-3 py-2 font-medium">{t('users.role')}</th>
              <th className="px-3 py-2 font-medium">{t('users.canApprove')}</th>
              <th className="px-3 py-2 font-medium">{t('users.active')}</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="px-3 py-2">
                  <div className="font-medium text-slate-800">{u.name}</div>
                  {u.email ? <div className="text-xs text-slate-400">{u.email}</div> : null}
                </td>
                <td className="px-3 py-2">
                  <select
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                    value={u.roleId ?? ''}
                    onChange={(e) => patchUser(u.id, { roleId: e.target.value })}
                  >
                    {roles.map((r) => <option key={r.id} value={r.id}>{roleLabel(r, language)}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2">
                  {u.canApproveQuotes
                    ? <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600"><ShieldCheck size={13} /> {t('common.yes')}</span>
                    : <span className="text-xs text-slate-400">{t('common.no')}</span>}
                </td>
                <td className="px-3 py-2">
                  <button type="button" onClick={() => patchUser(u.id, { active: !u.active })}
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {u.active ? t('users.activeYes') : t('users.activeNo')}
                  </button>
                </td>
                <td className="px-3 py-2 text-right">
                  <button type="button" onClick={() => deleteUser(u.id)}
                    className="rounded-md p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-600" title={t('users.delete')}>
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-xs text-slate-400">{t('users.empty')}</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">{t('users.rolesNote')}</p>
    </div>
  )
}
