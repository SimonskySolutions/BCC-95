import { useMemo, useState } from 'react'
import { useLanguage } from '../i18n/useLanguage.js'
import NewInquiryForm from '../components/erp/offers/NewInquiryForm.jsx'

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

  const clientsById = useMemo(() => {
    /** @type {Record<string, import('../domains/crm/model.js').Client>} */
    const map = {}
    for (const c of db.clients) map[c.id] = c
    return map
  }, [db.clients])

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-slate-600">{t('products.hint')}</p>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          {t('products.newInquiry')}
        </button>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {db.products.map((p) => {
          const customer = p.customerId ? clientsById[p.customerId] : undefined
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onOpenProduct(p.id)}
                className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-card transition hover:border-blue-200 hover:bg-blue-50/40"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{p.sku}</p>
                <p className="mt-1 font-semibold text-slate-900">{p.name}</p>
                <p className="mt-1 text-xs text-slate-500">{p.status}</p>
                {customer ? (
                  <p className="mt-2 text-xs text-slate-600">
                    <span className="text-slate-400">{t('products.customer')}: </span>
                    <span className="font-medium text-slate-700">{customer.name}</span>
                  </p>
                ) : null}
              </button>
            </li>
          )
        })}
      </ul>

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
                <h2 className="text-base font-semibold text-slate-900">
                  {t('newInquiry.title')}
                </h2>
                <p className="mt-1 text-xs text-slate-500">{t('newInquiry.subtitle')}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                aria-label={t('common.close')}
              >
                x
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
