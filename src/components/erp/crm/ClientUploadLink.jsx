import { useEffect, useState } from 'react'
import { Link2, Copy, Check, X } from 'lucide-react'
import { useLanguage } from '../../../i18n/useLanguage.js'

/**
 * Generate / copy / revoke a customer's secure upload-portal link. The customer
 * uses it (no login) to upload documents straight into their profile folders.
 *
 * @param {{ clientId: string }} props
 */
export default function ClientUploadLink({ clientId }) {
  const { t } = useLanguage()
  const [token, setToken] = useState(/** @type {string | null} */ (null))
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch(`/api/clients/${clientId}/upload-link`)
      .then((r) => (r.ok ? r.json() : null))
      .then((row) => setToken(row?.token ?? null))
      .catch(() => {})
  }, [clientId])

  const url = token ? `${window.location.origin}/upload/${token}` : ''

  function generate() {
    fetch(`/api/clients/${clientId}/upload-link`, { method: 'POST' })
      .then((r) => r.json())
      .then((d) => setToken(d.token))
      .catch(() => {})
  }
  function revoke() {
    if (!token) return
    fetch(`/api/upload-links/${token}/revoke`, { method: 'POST' }).then(() => setToken(null)).catch(() => {})
  }
  function copy() {
    navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
  }

  if (!token) {
    return (
      <button type="button" onClick={generate}
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
        <Link2 size={13} /> {t('docs.generateLink')}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <input readOnly value={url} onFocus={(e) => e.target.select()}
        className="w-48 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600 sm:w-72" />
      <button type="button" onClick={copy} title={t('docs.copyLink')}
        className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-50">
        {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
      </button>
      <button type="button" onClick={revoke} title={t('docs.revokeLink')}
        className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
        <X size={13} />
      </button>
    </div>
  )
}
