import { ArrowLeft, Package } from 'lucide-react'
import OfferWizard from '../components/erp/offers/OfferWizard.jsx'
import OfferStatusBadge from '../components/erp/offers/OfferStatusBadge.jsx'
import OfferActions from '../components/erp/offers/OfferActions.jsx'
import { useLanguage } from '../i18n/useLanguage.js'
import { useCurrentUser } from '../auth/useCurrentUser.js'

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
  const { user } = useCurrentUser()
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

  // All products in this offer's inquiry, with per-product feasibility.
  const inquiry = db.inquiries.find((i) => i.id === quote.inquiryId)
  const pf = inquiry?.productFeasibility ?? {}
  const products = inquiry
    ? [
        { id: inquiry.productId, name: db.products.find((p) => p.id === inquiry.productId)?.name ?? inquiry.productId },
        ...((inquiry.extraProducts ?? []).filter((e) => e.productId).map((e) => ({ id: e.productId, name: e.name }))),
      ]
    : product
      ? [{ id: product.id, name: product.name }]
      : []
  const feasStyle = {
    feasible: 'bg-emerald-100 text-emerald-700',
    feasible_with_conditions: 'bg-amber-100 text-amber-700',
    blocked: 'bg-rose-100 text-rose-700 line-through',
    not_assessed: 'bg-slate-100 text-slate-500',
  }

  return (
    <div className="animate-fade-in space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition hover:-translate-x-0.5 hover:bg-slate-50 hover:text-slate-900"
      >
        <ArrowLeft size={14} />
        {t('offerWs.back')}
      </button>

      {/* Customer-first header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition-shadow hover:shadow-cardHover">
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
          {products.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {products.map((p) => {
                const result = pf[p.id] ?? 'not_assessed'
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={onOpenProduct ? () => onOpenProduct(p.id) : undefined}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-blue-300 hover:bg-white hover:text-blue-700"
                    title={t('offerWs.openProduct')}
                  >
                    <Package size={13} />
                    {p.name}
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${feasStyle[result] ?? feasStyle.not_assessed}`}>
                      {t(`feasibility.result.${result}`, result)}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>
        <div className="mt-3 border-t border-slate-100 pt-3">
          <OfferActions db={db} quote={quote} actorId={user?.id} />
        </div>
      </div>

      <OfferWizard
        db={db}
        productId={quote.productId}
        actorId={user?.id}
        onOpenReports={onOpenReports}
      />
    </div>
  )
}
