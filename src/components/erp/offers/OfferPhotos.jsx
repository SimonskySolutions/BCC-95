import { useRef, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useLanguage } from '../../../i18n/useLanguage.js'
import { selectQuoteDocuments } from '../../../domains/quotations/selectors.js'
import { appendQuoteDocument, patchQuoteDocument, removeQuoteDocument } from '../../../domains/quotations/mutations.js'

/**
 * Read an image file and return a downscaled JPEG data URL so it fits the
 * persistent local store. Resolves to null if the file can't be decoded.
 */
function downscaleImage(file, maxDim = 1000, quality = 0.72) {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) { resolve(null); return }
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      try { resolve(canvas.toDataURL('image/jpeg', quality)) } catch { resolve(null) }
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
    img.src = url
  })
}

/**
 * Photo attachments for an offer version — stored in the system (data URLs in
 * the persistent store) and shown in the offer preview / printed PDF.
 *
 * @param {{
 *   db: import('../../../data/mockDatabase.js').MockDatabase
 *   versionId: string
 *   isLocked?: boolean
 *   onChange?: () => void
 * }} props
 */
export default function OfferPhotos({ db, versionId, isLocked, actorId, onChange }) {
  const { t } = useLanguage()
  const fileRef = useRef(/** @type {HTMLInputElement | null} */ (null))
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(/** @type {{ storageRef: string; name: string; caption?: string } | null} */ (null))
  const photos = selectQuoteDocuments(db, versionId).filter((d) => d.kind === 'photo')

  async function onPick(e) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return
    setBusy(true)
    for (const f of files) {
      const dataUrl = await downscaleImage(f)
      if (dataUrl) appendQuoteDocument(db, { quoteVersionId: versionId, kind: 'photo', name: f.name, storageRef: dataUrl, uploadedById: actorId })
    }
    setBusy(false)
    onChange?.()
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-900">
          {t('offer.photos')} {photos.length > 0 ? <span className="text-slate-400">({photos.length})</span> : null}
        </h4>
        {!isLocked ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-700 disabled:opacity-50"
          >
            <Plus size={12} /> {busy ? t('offer.photos.adding') : t('offer.photos.add')}
          </button>
        ) : null}
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onPick} />
      </div>

      {photos.length === 0 ? (
        <p className="text-xs text-slate-400">{t('offer.photos.empty')}</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((p) => (
            <figure key={p.id} className="group relative overflow-hidden rounded-lg border border-slate-200">
              <div className="relative">
                <img
                  src={p.storageRef}
                  alt={p.name}
                  onClick={() => setPreview(p)}
                  className="h-48 w-full cursor-zoom-in object-cover transition hover:opacity-90"
                />
                {!isLocked ? (
                  <button
                    type="button"
                    onClick={() => { removeQuoteDocument(db, p.id); onChange?.() }}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-md bg-white/90 text-slate-500 opacity-0 ring-1 ring-slate-200 transition-opacity hover:text-rose-600 group-hover:opacity-100"
                    title={t('offer.photos.remove')}
                  >
                    <Trash2 size={12} />
                  </button>
                ) : null}
              </div>
              <figcaption className="bg-slate-50 p-1.5">
                {isLocked ? (
                  <span className="block truncate text-[11px] text-slate-600">{p.caption || p.name}</span>
                ) : (
                  <input
                    className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    value={p.caption ?? ''}
                    placeholder={t('offer.photos.caption')}
                    onChange={(e) => { patchQuoteDocument(db, p.id, { caption: e.target.value }); onChange?.() }}
                  />
                )}
                <span className="mt-1 block truncate text-[10px] text-slate-400">
                  {(db.employees ?? []).find((e) => e.id === p.uploadedById)?.name ?? '—'} · {String(p.createdAt ?? '').slice(0, 10)}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
      <p className="mt-2 text-[10px] text-slate-400">{t('offer.photos.hint')}</p>

      {/* Full-size lightbox */}
      {preview ? (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-slate-900/80 p-6"
          onClick={() => setPreview(null)}
        >
          <img src={preview.storageRef} alt={preview.name} className="max-h-[80vh] max-w-[90vw] rounded-lg object-contain shadow-2xl" />
          {preview.caption || preview.name ? (
            <p className="max-w-[90vw] text-center text-sm text-white">{preview.caption || preview.name}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
