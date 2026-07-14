import { useEffect, useState } from 'react'
import { ClipboardCheck, FileUp, ChevronRight } from 'lucide-react'
import { useLanguage } from '../../../i18n/useLanguage.js'
import { useCurrentUser } from '../../../auth/useCurrentUser.js'
import { selectQuoteVersionById, selectOfferLinesTotal } from '../../../domains/quotations/selectors.js'

/**
 * Dashboard "Action Center": priced offers ready to review (for approvers) and
 * recent customer uploads from the portal — the notification surface tying
 * together approvals (Phase 1) and customer documents (Phases 3–4).
 *
 * @param {{ db: any, onOpenOffer?: (quoteId: string) => void, onOpenClient?: (clientId: string) => void }} props
 */
export default function ActionCenter({ db, onOpenOffer, onOpenClient }) {
  const { t } = useLanguage()
  const { can } = useCurrentUser()
  const [uploads, setUploads] = useState(/** @type {any[]} */ ([]))

  useEffect(() => {
    fetch('/api/files/recent?source=portal&limit=6')
      .then((r) => (r.ok ? r.json() : []))
      .then(setUploads)
      .catch(() => {})
  }, [])

  // Offers whose current version is a priced draft → ready for review.
  const toReview = (db.quoteDrafts ?? [])
    .map((q) => {
      const v = q.currentVersionId ? selectQuoteVersionById(db, q.currentVersionId) : null
      if (!v || v.status !== 'draft') return null
      const total = selectOfferLinesTotal(db, v.id)
      if (total <= 0) return null
      const client = (db.clients ?? []).find((c) => c.id === q.clientId)
      const product = (db.products ?? []).find((p) => p.id === q.productId)
      return { quoteId: q.id, offerNo: q.offerNo ?? q.id, versionNo: v.versionNo, total,
        currency: v.currency ?? 'EUR', clientName: client?.companyName ?? client?.name ?? '—', productName: product?.name ?? '' }
    })
    .filter(Boolean)

  const clientName = (id) => (db.clients ?? []).find((c) => c.id === id)?.name ?? id ?? '—'
  const showApprovals = can('offer.approve')

  if (!showApprovals && uploads.length === 0) return null

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      {showApprovals ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ClipboardCheck size={15} className="text-blue-600" /> {t('action.toReview')}
            </h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{toReview.length}</span>
          </div>
          {toReview.length === 0 ? (
            <p className="text-xs text-slate-400">{t('action.toReview.empty')}</p>
          ) : (
            <ul className="space-y-1">
              {toReview.map((o) => (
                <li key={o.quoteId}>
                  <button type="button" onClick={() => onOpenOffer?.(o.quoteId)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-50">
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-medium text-slate-800">{o.offerNo} · v{o.versionNo}</span>
                      <span className="text-slate-400"> · {o.clientName}{o.productName ? ` · ${o.productName}` : ''}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-slate-600">{o.total.toFixed(2)} {o.currency}</span>
                    <ChevronRight size={14} className="shrink-0 text-slate-300" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <FileUp size={15} className="text-emerald-600" /> {t('action.uploads')}
          </h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{uploads.length}</span>
        </div>
        {uploads.length === 0 ? (
          <p className="text-xs text-slate-400">{t('action.uploads.empty')}</p>
        ) : (
          <ul className="space-y-1">
            {uploads.map((f) => (
              <li key={f.id}>
                <button type="button" onClick={() => onOpenClient?.(f.client_id)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-50">
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium text-slate-800">{f.name}</span>
                    <span className="text-slate-400"> · {clientName(f.client_id)} · {f.folder}</span>
                  </span>
                  <span className="shrink-0 text-[11px] text-slate-400">{String(f.uploaded_at).slice(0, 10)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
