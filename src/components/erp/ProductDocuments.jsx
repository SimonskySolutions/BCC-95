import { useEffect, useRef, useState } from 'react'
import { Upload, Download, Trash2, RefreshCw, FileText, Eye } from 'lucide-react'
import { useLanguage } from '../../i18n/useLanguage.js'
import { useConfirm } from '../ui/feedbackContext.js'
import { useCurrentUser } from '../../auth/useCurrentUser.js'

const FOLDERS = ['Schematics', 'Specifications', 'Photos', 'Other']

/**
 * Product-level document store — schematics, specs, photos for a product,
 * independent of any customer. Files live in the relational `files` table
 * (product_id set). Mirrors the customer document manager.
 *
 * @param {{ db: any, productId: string }} props
 */
export default function ProductDocuments({ db, productId }) {
  const { t } = useLanguage()
  const confirmDialog = useConfirm()
  const { user } = useCurrentUser()
  const [files, setFiles] = useState(/** @type {any[]} */ ([]))
  const [folder, setFolder] = useState(FOLDERS[0])
  const [busy, setBusy] = useState(false)
  const fileInput = useRef(/** @type {HTMLInputElement | null} */ (null))
  const replaceInput = useRef(/** @type {HTMLInputElement | null} */ (null))
  const replacingId = useRef(/** @type {string | null} */ (null))

  const refresh = () =>
    fetch(`/api/files?productId=${encodeURIComponent(productId)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setFiles)
      .catch(() => {})

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])

  async function uploadFiles(list) {
    setBusy(true)
    try {
      for (const file of list) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('productId', productId)
        fd.append('folder', folder)
        if (user?.id) fd.append('uploadedBy', user.id)
        await fetch('/api/files', { method: 'POST', body: fd })
      }
      await refresh()
    } finally { setBusy(false) }
  }

  async function replaceFile(id, file) {
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      await fetch(`/api/files/${id}`, { method: 'PUT', body: fd })
      await refresh()
    } finally { setBusy(false) }
  }

  async function remove(id) {
    const ok = await confirmDialog({ message: t('docs.deleteConfirm'), confirmLabel: t('common.delete', 'Delete'), danger: true })
    if (!ok) return
    await fetch(`/api/files/${id}`, { method: 'DELETE' })
    await refresh()
  }

  const userName = (id) => (db.employees ?? []).find((e) => e.id === id)?.name ?? (id === 'customer' ? t('docs.customer') : id ?? '—')
  const byFolder = (f) => files.filter((x) => (x.folder || 'Other') === f)
  const fmtSize = (n) => (n > 1024 * 1024 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)
  const folders = [...new Set([...FOLDERS, ...files.map((f) => f.folder || 'Other')])]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-3">
        <span className="text-xs font-medium text-slate-500">{t('docs.uploadTo')}</span>
        <select value={folder} onChange={(e) => setFolder(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs">
          {FOLDERS.map((f) => <option key={f} value={f}>{t(`pdocs.folder.${f}`, f)}</option>)}
        </select>
        <input ref={fileInput} type="file" multiple className="hidden"
          onChange={(e) => { if (e.target.files?.length) uploadFiles([...e.target.files]); e.target.value = '' }} />
        <button type="button" onClick={() => fileInput.current?.click()} disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
          <Upload size={13} /> {t('docs.upload')}
        </button>
      </div>

      <input ref={replaceInput} type="file" className="hidden"
        onChange={(e) => { if (e.target.files?.[0] && replacingId.current) replaceFile(replacingId.current, e.target.files[0]); e.target.value = '' }} />

      {folders.map((f) => {
        const list = byFolder(f)
        if (list.length === 0 && !FOLDERS.includes(f)) return null
        return (
          <div key={f}>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{t(`pdocs.folder.${f}`, f)} · {list.length}</p>
            {list.length === 0 ? (
              <p className="pl-1 text-xs text-slate-300">{t('docs.emptyFolder')}</p>
            ) : (
              <ul className="space-y-1">
                {list.map((file) => (
                  <li key={file.id} className="flex items-center gap-2 rounded-lg border border-slate-100 px-2 py-1.5 text-sm hover:bg-slate-50">
                    <FileText size={14} className="shrink-0 text-slate-400" />
                    <span className="min-w-0 flex-1 truncate text-slate-800">{file.name}</span>
                    {file.source === 'portal' ? <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">{t('docs.fromCustomer')}</span> : null}
                    <span className="hidden shrink-0 text-[11px] text-slate-400 sm:inline">
                      {fmtSize(file.size)} · {userName(file.uploaded_by)} · {String(file.uploaded_at).slice(0, 10)}
                    </span>
                    <a href={`/api/files/${file.id}`} target="_blank" rel="noreferrer" title={t('docs.preview')}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Eye size={14} /></a>
                    <a href={`/api/files/${file.id}?download=1`} title={t('docs.download')}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Download size={14} /></a>
                    <button type="button" title={t('docs.replace')}
                      onClick={() => { replacingId.current = file.id; replaceInput.current?.click() }}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><RefreshCw size={13} /></button>
                    <button type="button" title={t('docs.delete')} onClick={() => remove(file.id)}
                      className="rounded p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={13} /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}
