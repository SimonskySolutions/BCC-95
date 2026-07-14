import { useLanguage } from '../../../i18n/useLanguage.js'
import { selectOffersByProduct } from '../../../domains/quotations/selectors.js'
import { groupAmount } from '../../../lib/money.js'
import OfferStatusBadge from './OfferStatusBadge.jsx'

/**
 * Every offer (quote version) ever raised for a product, across all clients —
 * the per-product offer history. Each row opens that offer.
 *
 * @param {{
 *   db: import('../../../data/mockDatabase.js').MockDatabase
 *   productId: string
 *   onOpenOffer?: (quoteId: string) => void
 * }} props
 */
export default function OfferHistory({ db, productId, onOpenOffer }) {
  const { t } = useLanguage()
  const offers = selectOffersByProduct(db, productId)
  if (!offers.length) return null

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">{t('pw.offer.history')}</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-1 pr-3 font-medium">{t('pw.offer.history.offer')}</th>
              <th className="py-1 pr-3 font-medium">{t('pw.offer.history.client')}</th>
              <th className="py-1 pr-3 font-medium">{t('pw.offer.history.status')}</th>
              <th className="py-1 pr-3 font-medium">{t('pw.offer.history.date')}</th>
              <th className="py-1 pl-3 text-right font-medium">{t('pw.offer.history.total')}</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((o) => (
              <tr
                key={o.versionId}
                onClick={() => onOpenOffer?.(o.quoteId)}
                className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
              >
                <td className="py-1.5 pr-3 font-medium text-slate-800">
                  {o.offerNo} · v{o.versionNo}
                  {o.kind === 'tooling' ? (
                    <span className="ml-1.5 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">{t('pw.offer.toolingBadge')}</span>
                  ) : null}
                </td>
                <td className="py-1.5 pr-3 text-slate-600">{o.clientName}</td>
                <td className="py-1.5 pr-3">
                  <OfferStatusBadge status={o.status} />
                </td>
                <td className="py-1.5 pr-3 text-slate-500">{o.date || '—'}</td>
                <td className="py-1.5 pl-3 text-right tabular-nums text-slate-800">
                  {groupAmount(o.total)} {o.currency}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
