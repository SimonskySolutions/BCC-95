import { useEffect, useRef, useState } from 'react'
import { Upload, FileText, CheckCircle2, FolderUp } from 'lucide-react'
import { useLanguage } from '../../i18n/useLanguage.js'

/**
 * Public, unauthenticated customer upload portal reached via a tokenised link
 * (`/upload/:token`). The customer picks a folder (General + their products)
 * and uploads documents straight into their CRM profile. Mirrors the standalone
 * pattern of the offer-acceptance page.
 *
 * @param {{ token: string }} props
 */
export default function UploadPortalPage({ token }) {
  const { t } = useLanguage()
  const [info, setInfo] = useState(/** @type {null | { clientName: string, folders: string[] }} */ (null))
  const [error, setError] = useState(false)
  const [folder, setFolder] = useState('General')
  const [uploaded, setUploaded] = useState(/** @type {any[]} */ ([]))
  const [busy, setBusy] = useState(false)
  const input = useRef(/** @type {HTMLInputElement | null} */ (null))

  function loadList() {
    fetch(`/api/portal/${token}/files`).then((r) => (r.ok ? r.json() : [])).then(setUploaded).catch(() => {})
  }
  useEffect(() => {
    fetch(`/api/portal/${token}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { setInfo(d); setFolder(d.folders?.[0] ?? 'General') })
      .catch(() => setError(true))
    loadList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function upload(fileList) {
    setBusy(true)
    try {
      for (const file of fileList) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('folder', folder)
        await fetch(`/api/portal/${token}/files`, { method: 'POST', body: fd })
      }
      loadList()
    } finally { setBusy(false) }
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <p className="rounded-2xl border border-rose-200 bg-white px-6 py-5 text-sm text-rose-700 shadow">{t('portal.invalid')}</p>
      </div>
    )
  }
  if (!info) return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-400">…</div>

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-blue-600">
            <FolderUp size={20} />
            <h1 className="text-lg font-bold">{t('portal.title')}</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">{t('portal.subtitle').replace('{client}', info.clientName)}</p>

          {/* Folder + upload */}
          <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-4">
            <label className="block text-xs font-medium text-slate-500">{t('portal.chooseFolder')}</label>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <select value={folder} onChange={(e) => setFolder(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                {info.folders.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
              <input ref={input} type="file" multiple className="hidden"
                onChange={(e) => { if (e.target.files?.length) upload([...e.target.files]); e.target.value = '' }} />
              <button type="button" onClick={() => input.current?.click()} disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                <Upload size={15} /> {busy ? t('portal.uploading') : t('portal.upload')}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">{t('portal.hint')}</p>
          </div>
        </div>

        {/* Previously uploaded */}
        {uploaded.length > 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <CheckCircle2 size={15} className="text-emerald-600" /> {t('portal.yourFiles')}
            </p>
            <ul className="space-y-1 text-sm">
              {uploaded.map((f) => (
                <li key={f.id} className="flex items-center gap-2 text-slate-700">
                  <FileText size={13} className="text-slate-400" />
                  <span className="min-w-0 flex-1 truncate">{f.name}</span>
                  <span className="text-[11px] text-slate-400">{f.folder} · {String(f.uploaded_at).slice(0, 10)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  )
}
