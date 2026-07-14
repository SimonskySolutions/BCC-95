import { useState } from 'react'
import { KeyRound, Eye, EyeOff, ExternalLink, AlertTriangle } from 'lucide-react'
import { useDb } from '../../../data/useDb.js'
import { useLanguage } from '../../../i18n/useLanguage.js'
import { patchClient } from '../../../domains/crm/mutations.js'

/**
 * Store a customer's external platform (e.g. their SharePoint) — URL + the
 * login they shared — so staff can fetch documents. Saved on the client record.
 *
 * SECURITY: credentials are stored as entered (not encrypted). A warning is
 * shown; for highly sensitive logins a dedicated password manager is safer.
 *
 * @param {{ client: import('../../../domains/crm/model.js').Client }} props
 */
export default function ClientExternalAccess({ client }) {
  const { db, commit } = useDb()
  const { t } = useLanguage()
  const ea = client.externalAccess ?? {}
  const [show, setShow] = useState(false)

  const save = (patch) => commit(() => patchClient(db, client.id, { externalAccess: { ...ea, ...patch } }))
  const input = 'mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200'

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <KeyRound size={15} className="text-slate-500" /> {t('client.externalAccess')}
      </h3>

      <div className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800 ring-1 ring-amber-200">
        <AlertTriangle size={13} className="mt-0.5 shrink-0" />
        <span>{t('client.externalAccess.warning')}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-slate-600">
          {t('client.externalAccess.platform')}
          <input className={input} defaultValue={ea.platform ?? ''} placeholder="SharePoint, Google Drive…"
            onBlur={(e) => save({ platform: e.target.value })} />
        </label>
        <label className="block text-xs font-medium text-slate-600">
          {t('client.externalAccess.url')}
          <div className="flex items-center gap-1">
            <input className={input} defaultValue={ea.url ?? ''} placeholder="https://…"
              onBlur={(e) => save({ url: e.target.value })} />
            {ea.url ? (
              <a href={ea.url} target="_blank" rel="noreferrer" className="mt-1 rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" title={t('client.externalAccess.open')}>
                <ExternalLink size={14} />
              </a>
            ) : null}
          </div>
        </label>
        <label className="block text-xs font-medium text-slate-600">
          {t('client.externalAccess.username')}
          <input className={input} defaultValue={ea.username ?? ''} autoComplete="off"
            onBlur={(e) => save({ username: e.target.value })} />
        </label>
        <label className="block text-xs font-medium text-slate-600">
          {t('client.externalAccess.password')}
          <div className="relative">
            <input className={input} type={show ? 'text' : 'password'} defaultValue={ea.password ?? ''} autoComplete="off"
              onBlur={(e) => save({ password: e.target.value })} />
            <button type="button" onClick={() => setShow((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
              {show ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </label>
        <label className="block text-xs font-medium text-slate-600 sm:col-span-2">
          {t('client.externalAccess.notes')}
          <textarea className={input} rows={2} defaultValue={ea.notes ?? ''}
            onBlur={(e) => save({ notes: e.target.value })} />
        </label>
      </div>
    </section>
  )
}
