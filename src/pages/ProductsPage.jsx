import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { useLanguage } from '../i18n/useLanguage.js'
import { PRODUCT_STATUSES } from '../domains/products/model.js'
import NewInquiryForm from '../components/erp/offers/NewInquiryForm.jsx'

/** @param {'draft'|'active'|'archived'} status */
function statusStyle(status) {
  switch (status) {
    case 'active':   return { badge: 'bg-emerald-100 text-emerald-800', border: 'border-l-emerald-400' }
    case 'archived': return { badge: 'bg-slate-100 text-slate-500',    border: 'border-l-slate-300'   }
    default:         return { badge: 'bg-sky-100 text-sky-700',        border: 'border-l-sky-300'     }
  }
}

/**
 * @param {{
 *   db: import('../data/mockDatabase.js').MockDatabase
 *   onOpenProduct: (id: string) => void
 * }} props
 */
export default function ProductsPage({ db, onOpenProduct }) {
  const { t } = useLanguage()
  const [showForm, setShowForm] = useState(false)
  const [, forceRerender] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const clientsById = useMemo(() => {
    /** @type {Record<string, import('../domains/crm/model.js').Client>} */
    const map = {}
    for (const c of db.clients) map[c.id] = c
    return map
  }, [db.clients])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return db.products.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (!q) return true
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    })
  }, [db.products, search, statusFilter])

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('products.searchPlaceholder')}
            className="h-9 w-56 rounded-lg border border-slate-300 bg-white px-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="all">{t('products.statusAll')}</option>
            {PRODUCT_STATUSES.map((s) => (
              <option key={s} value={s}>{t(`products.status.${s}`)}</option>
            ))}
          </select>
          <span className="text-xs text-slate-500">
            {t('products.count').replace('{count}', String(filtered.length))}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          {t('products.newInquiry')}
        </button>
      </div>

      {/* Product grid */}
      <ul className="grid gap-3 sm:grid-cols-2">
        {filtered.map((p) => {
          const { badge, border } = statusStyle(p.status)
          const customer = p.customerId ? clientsById[p.customerId] : undefined
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onOpenProduct(p.id)}
                className={`group w-full rounded-2xl border border-slate-200 border-l-4 ${border} bg-white p-4 text-left shadow-card transition hover:border-blue-200 hover:bg-blue-50/40`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{p.sku}</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${badge}`}>
                    {t(`products.status.${p.status}`)}
                  </span>
                </div>
                <p className="mt-1 font-semibold text-slate-900">{p.name}</p>
                {customer ? (
                  <p className="mt-2 text-xs text-slate-500">
                    <span className="text-slate-400">{t('products.customer')}: </span>
                    <span className="font-medium text-slate-700">{customer.name}</span>
                  </p>
                ) : null}
              </button>
            </li>
          )
        })}
      </ul>

      {/* New inquiry modal */}
      {showForm ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowForm(false)
          }}
        >
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <header className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">{t('newInquiry.title')}</h2>
                <p className="mt-1 text-xs text-slate-500">{t('newInquiry.subtitle')}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                aria-label={t('common.close')}
              >
                <X size={14} />
              </button>
            </header>
            <NewInquiryForm
              db={db}
              onCancel={() => setShowForm(false)}
              onCreated={(productId) => {
                setShowForm(false)
                forceRerender((v) => v + 1)
                onOpenProduct(productId)
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
