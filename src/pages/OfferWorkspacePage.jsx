import { ArrowLeft, Package } from 'lucide-react'
import OfferWizard from '../components/erp/offers/OfferWizard.jsx'
import OfferStatusBadge from '../components/erp/offers/OfferStatusBadge.jsx'
import { useLanguage } from '../i18n/useLanguage.js'

/**
 * Offer-centric workspace: the offer is the anchor (customer first), reached
 * directly from the Оферти board. The product workspace's Offer tab remains a
 * secondary entry point to the same flow.
 *
 * @param {{
 *   db: import('../data/mockDatabase.js').MockDatabase
 *   quoteId: string
 *   onBack: () => void
 *   onOpenProduct?: (id: string) => void
 *   onOpenReports?: () => void
 * }} props
 */
export default function OfferWorkspacePage({ db, quoteId, onBack, onOpenProduct, onOpenReports }) {
  const { t } = useLanguage()
  const quote = db.quoteDrafts.find((q) => q.id === quoteId)

  if (!quote) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900 transition"
        >
          <ArrowLeft size={14} />
          {t('offerWs.back')}
        </button>
        <p className="text-sm text-slate-500">{t('offerWs.notFound')}</p>
      </div>
    )
  }

  const client = db.clients.find((c) => c.id === quote.clientId)
  const product = db.products.find((p) => p.id === quote.productId)

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900 transition"
      >
        <ArrowLeft size={14} />
        {t('offerWs.back')}
      </button>

      {/* Customer-first header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-lg font-bold text-slate-900">{client?.companyName ?? client?.name ?? '—'}</h2>
              <OfferStatusBadge status={quote.status} />
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {quote.id}
              {client?.vat ? <> · {client.vat}</> : null}
              {client?.city ? <> · {client.city}{client.country ? `, ${client.country}` : ''}</> : null}
            </p>
          </div>
          {product ? (
            <button
              type="button"
              onClick={onOpenProduct ? () => onOpenProduct(product.id) : undefined}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white hover:border-blue-300 hover:text-blue-700 transition"
              title={t('offerWs.openProduct')}
            >
              <Package size={13} />
              {product.name}
            </button>
          ) : null}
        </div>
      </div>

      <OfferWizard
        db={db}
        productId={quote.productId}
        actorId={db.employees[0]?.id}
        onOpenReports={onOpenReports}
      />
    </div>
  )
}
