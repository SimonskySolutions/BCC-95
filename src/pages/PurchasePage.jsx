import {
  selectLinesByPurchaseOrder,
  selectOpenPurchaseOrders,
  selectVendorById,
} from '../domains/purchase/selectors.js'
import { useLanguage } from '../i18n/useLanguage.js'

/**
 * @param {{ db: import('../data/mockDatabase.js').MockDatabase }} props
 */
export default function PurchasePage({ db }) {
  const { t } = useLanguage()
  const open = selectOpenPurchaseOrders(db)
  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">{t('purchase.poTitle')}</h3>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">{t('purchase.colPO')}</th>
                <th className="px-4 py-3">{t('purchase.colVendor')}</th>
                <th className="px-4 py-3">{t('purchase.colOrdered')}</th>
                <th className="px-4 py-3">{t('common.status')}</th>
                <th className="px-4 py-3">{t('purchase.colLines')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {db.purchaseOrders.map((po) => {
                const v = selectVendorById(db, po.vendorId)
                const lines = selectLinesByPurchaseOrder(db, po.id)
                return (
                  <tr key={po.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-medium text-slate-900">{po.id}</td>
                    <td className="px-4 py-3 text-slate-600">{v?.name ?? po.vendorId}</td>
                    <td className="px-4 py-3 text-slate-600">{po.orderedAt}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {po.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{lines.length}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {t('purchase.openCount')} {open.length}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <h4 className="mb-2 text-sm font-semibold text-slate-900">{t('purchase.vendors')}</h4>
          <ul className="space-y-2 text-sm text-slate-600">
            {db.vendors.map((v) => (
              <li key={v.id} className="flex justify-between gap-2">
                <span className="font-medium text-slate-800">{v.name}</span>
                <span className="text-xs uppercase text-slate-500">{v.status}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <h4 className="mb-2 text-sm font-semibold text-slate-900">{t('purchase.materials')}</h4>
          <ul className="space-y-2 text-sm text-slate-600">
            {db.materials.map((m) => (
              <li key={m.id}>
                <span className="font-medium text-slate-800">{m.sku}</span> — {m.name} ({m.uom})
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}
