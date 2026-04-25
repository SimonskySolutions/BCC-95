import { useMemo, useState } from 'react'
import { selectOrdersByClient } from '../domains/crm/selectors.js'
import { selectProductById } from '../domains/products/selectors.js'
import { useLanguage } from '../i18n/useLanguage.js'

/**
 * @param {{
 *   db: import('../data/mockDatabase.js').MockDatabase
 *   onOpenClient: (id: string) => void
 * }} props
 */
export default function CRMPage({ db, onOpenClient }) {
  const { t } = useLanguage()
  const [q, setQ] = useState('')
  const clients = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return db.clients
    return db.clients.filter(
      (c) => c.name.toLowerCase().includes(needle) || c.region.toLowerCase().includes(needle),
    )
  }, [db.clients, q])

  const openOrders = db.clientOrders.filter((o) => o.status !== 'closed' && o.status !== 'shipped').length
  const avgPaymentDelay =
    db.paymentRecords.length === 0
      ? 0
      : Math.round(
          (db.paymentRecords.reduce((a, p) => a + p.daysLate, 0) / db.paymentRecords.length) * 10,
        ) / 10

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <p className="text-xs font-semibold uppercase text-slate-500">{t('crm.statClients')}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{db.clients.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <p className="text-xs font-semibold uppercase text-slate-500">{t('crm.statOpenOrders')}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{openOrders}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <p className="text-xs font-semibold uppercase text-slate-500">{t('crm.statAvgDelay')}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{avgPaymentDelay}</p>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">
          {t('common.search')}
          <input
            className="mt-1 w-full max-w-md rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder={t('crm.searchPlaceholder')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
      </div>

      <ul className="grid gap-3 md:grid-cols-2">
        {clients.map((c) => {
          const orders = selectOrdersByClient(db, c.id)
          const orderWord = orders.length === 1 ? t('common.order') : t('common.ordersPlural')
          return (
            <li key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{c.name}</p>
                  <p className="text-xs text-slate-500">
                    {c.segment} · {c.region}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenClient(c.id)}
                  className="shrink-0 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  {t('common.profile')}
                </button>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                {orders.length} {orderWord} {t('crm.ordersLine')}{' '}
                {orders
                  .map((o) => selectProductById(db, o.productId)?.sku ?? o.productId)
                  .join(', ')}
              </p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
