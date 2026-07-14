import { useLanguage } from '../../../i18n/useLanguage.js'
import { selectOffersByClient } from '../../../domains/quotations/selectors.js'
import OfferStatusBadge from '../offers/OfferStatusBadge.jsx'

/**
 * Every offer raised for a customer, shown on the CRM profile. Each row opens
 * the offer (full preview / version history live in the offer workspace).
 *
 * @param {{
 *   db: import('../../../data/mockDatabase.js').MockDatabase
 *   clientId: string
 *   onOpenOffer?: (quoteId: string) => void
 * }} props
 */
export default function ClientOffers({ db, clientId, onOpenOffer }) {
  const { t } = useLanguage()
  const offers = selectOffersByClient(db, clientId)

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <h3 className="mb-2 text-sm font-semibold text-slate-900">{t('client.offers')}</h3>
      {offers.length === 0 ? (
        <p className="text-xs text-slate-400">{t('client.offers.empty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="py-1 pr-3 font-medium">{t('client.offers.offer')}</th>
                <th className="py-1 pr-3 font-medium">{t('client.offers.product')}</th>
                <th className="py-1 pr-3 font-medium">{t('client.offers.status')}</th>
                <th className="py-1 pr-3 font-medium">{t('client.offers.date')}</th>
                <th className="py-1 pl-3 text-right font-medium">{t('client.offers.total')}</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((o) => (
                <tr
                  key={o.versionId}
                  onClick={() => onOpenOffer?.(o.quoteId)}
                  className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                >
                  <td className="py-1.5 pr-3 font-medium text-slate-800">{o.offerNo} · v{o.versionNo}</td>
                  <td className="py-1.5 pr-3 text-slate-600">{o.productName}</td>
                  <td className="py-1.5 pr-3"><OfferStatusBadge status={o.status} /></td>
                  <td className="py-1.5 pr-3 text-slate-500">{o.date || '—'}</td>
                  <td className="py-1.5 pl-3 text-right tabular-nums text-slate-800">
                    {o.total.toFixed(2)} {o.currency}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
