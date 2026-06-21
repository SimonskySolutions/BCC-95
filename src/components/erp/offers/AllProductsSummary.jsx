import { useLanguage } from '../../../i18n/useLanguage.js'
import { computeCostRollup, selectCostSheetLines, priceBreakRows } from '../../../domains/quotations/selectors.js'

function group(n) {
  const [int, dec] = (Number(n) || 0).toFixed(2).split('.')
  return `${int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}.${dec}`
}
const groupInt = (n) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

/**
 * Combined calculation across every feasible product in the offer: each product
 * with its cost price and its quantity → price tiers (margins identified per
 * product). This is the cross-product roll-up that feeds the offer.
 *
 * @param {{
 *   db: import('../../../data/mockDatabase.js').MockDatabase
 *   sheets: import('../../../domains/quotations/model.js').CostSheet[]
 *   currency: string
 * }} props
 */
export default function AllProductsSummary({ db, sheets, currency }) {
  const { t } = useLanguage()
  if (!sheets || sheets.length < 2) return null

  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 shadow-card">
      <h3 className="mb-1 text-sm font-semibold text-slate-900">{t('cost.allProducts.title')}</h3>
      <p className="mb-3 text-[11px] text-slate-500">{t('cost.allProducts.hint')}</p>

      <div className="space-y-3">
        {sheets.map((s) => {
          const rollup = computeCostRollup(s, selectCostSheetLines(db, s.id))
          let rows = priceBreakRows(rollup, s.priceBreaks)
          if (!rows.length) rows = [{ id: s.id, qty: s.amortisationUnits || 1, marginPercent: s.marginPercent, exw: rollup.exw, dap: rollup.dap }]
          return (
            <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-800">{s.productLabel || t('cost.untitledProduct')}</span>
                <span className="text-[11px] text-slate-500">{t('cost.combined.costPrice')}: <span className="font-semibold text-slate-700">{group(rollup.costPrice)} {currency}</span></span>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] uppercase text-slate-400">
                    <th className="py-1 pr-2 text-left font-medium">{t('cost.breaks.qty')}</th>
                    <th className="py-1 pr-2 text-left font-medium">{t('cost.breaks.margin')}</th>
                    <th className="py-1 pr-2 text-right font-medium">{t('cost.combined.exw')} {currency}</th>
                    <th className="py-1 text-right font-medium">{t('cost.combined.dap')} {currency}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r) => (
                    <tr key={r.id} className="text-slate-700">
                      <td className="py-1 pr-2 font-medium">{groupInt(r.qty)}</td>
                      <td className="py-1 pr-2">{r.marginPercent}%</td>
                      <td className="py-1 pr-2 text-right">{group(r.exw)}</td>
                      <td className="py-1 text-right font-semibold text-blue-700">{group(r.dap)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>
    </div>
  )
}
