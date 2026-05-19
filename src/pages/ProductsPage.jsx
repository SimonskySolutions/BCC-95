import { useMemo, useReducer, useState } from 'react'
import { X, LayoutGrid, List, Pencil, Trash2, Plus } from 'lucide-react'
import { useLanguage } from '../i18n/useLanguage.js'
import { PRODUCT_STATUSES, PRODUCT_TYPES } from '../domains/products/model.js'
import { deleteProduct } from '../domains/products/mutations.js'
import NewInquiryForm from '../components/erp/offers/NewInquiryForm.jsx'
import ProductFormModal from '../components/erp/ProductFormModal.jsx'

/** @param {'draft'|'active'|'archived'} status */
function statusStyle(status) {
  switch (status) {
    case 'active':   return { badge: 'bg-emerald-100 text-emerald-800', border: 'border-l-emerald-400' }
    case 'archived': return { badge: 'bg-slate-100 text-slate-500',    border: 'border-l-slate-300'   }
    default:         return { badge: 'bg-sky-100 text-sky-700',        border: 'border-l-sky-300'     }
  }
}

function typeStyle(type) {
  switch (type) {
    case 'raw_material':   return 'bg-amber-100 text-amber-800'
    case 'semi_finished':  return 'bg-violet-100 text-violet-800'
    case 'finished_good':  return 'bg-emerald-100 text-emerald-800'
    default:               return 'bg-slate-100 text-slate-600'
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
  const [, refresh] = useReducer((x) => x + 1, 0)
  const [showNewInquiry, setShowNewInquiry] = useState(false)
  const [showProductForm, setShowProductForm] = useState(/** @type {'new'|null} */ (null))
  const [editingProduct, setEditingProduct] = useState(/** @type {import('../domains/products/model.js').Product|null} */ (null))
  const [deleteTarget, setDeleteTarget] = useState(/** @type {import('../domains/products/model.js').Product|null} */ (null))
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [viewMode, setViewMode] = useState(/** @type {'grid'|'list'} */ ('grid'))

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
      if (typeFilter !== 'all' && p.type !== typeFilter) return false
      if (!q) return true
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    })
  }, [db.products, search, statusFilter, typeFilter])

  function handleDelete() {
    if (!deleteTarget) return
    deleteProduct(db, deleteTarget.id)
    setDeleteTarget(null)
    refresh()
  }

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
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="all">{t('products.typeAll')}</option>
            {PRODUCT_TYPES.map((tp) => (
              <option key={tp} value={tp}>{t(`product.type.${tp}`)}</option>
            ))}
          </select>
          <span className="text-xs text-slate-500">
            {t('products.count').replace('{count}', String(filtered.length))}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs transition ${viewMode === 'grid' ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-500 hover:bg-slate-50'}`}
              title={t('products.gridView')}
            >
              <LayoutGrid size={13} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs border-l border-slate-200 transition ${viewMode === 'list' ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-500 hover:bg-slate-50'}`}
              title={t('products.listView')}
            >
              <List size={13} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => { setEditingProduct(null); setShowProductForm('new') }}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Plus size={14} />
            {t('products.newProduct')}
          </button>
          <button
            type="button"
            onClick={() => setShowNewInquiry(true)}
            className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            {t('products.newInquiry')}
          </button>
        </div>
      </div>

      {/* Product grid / list */}
      {viewMode === 'grid' ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {filtered.map((p) => {
            const { badge, border } = statusStyle(p.status)
            const customer = p.customerId ? clientsById[p.customerId] : undefined
            return (
              <li key={p.id}>
                <div className={`group relative w-full rounded-2xl border border-slate-200 border-l-4 ${border} bg-white p-4 shadow-card`}>
                  {/* Action buttons — appear on hover */}
                  <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      title={t('products.editProduct')}
                      onClick={(e) => { e.stopPropagation(); setEditingProduct(p); setShowProductForm('new') }}
                      className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800 shadow-sm"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      type="button"
                      title={t('products.deleteProduct')}
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(p) }}
                      className="rounded-md border border-slate-200 bg-white p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 shadow-sm"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenProduct(p.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-2 pr-14">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{p.sku}</p>
                      <div className="flex shrink-0 gap-1">
                        {p.type ? (
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${typeStyle(p.type)}`}>
                            {t(`product.type.${p.type}`)}
                          </span>
                        ) : null}
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badge}`}>
                          {t(`products.status.${p.status}`)}
                        </span>
                      </div>
                    </div>
                    <p className="mt-1 font-semibold text-slate-900">{p.name}</p>
                    {customer ? (
                      <p className="mt-2 text-xs text-slate-500">
                        <span className="text-slate-400">{t('products.customer')}: </span>
                        <span className="font-medium text-slate-700">{customer.name}</span>
                      </p>
                    ) : null}
                    {p.priceAverage != null ? (
                      <p className="mt-1 text-xs text-slate-400">
                        Avg. cost: <span className="font-medium text-slate-600">{p.priceAverage.toLocaleString()} / {p.uom}</span>
                      </p>
                    ) : null}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        /* List view */
        <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">SKU</th>
                <th className="px-4 py-2.5 text-left font-medium">{t('products.fieldName')}</th>
                <th className="px-4 py-2.5 text-left font-medium">{t('products.fieldType')}</th>
                <th className="px-4 py-2.5 text-left font-medium">{t('products.fieldStatus')}</th>
                <th className="px-4 py-2.5 text-left font-medium">{t('products.fieldUom')}</th>
                <th className="px-4 py-2.5 text-right font-medium">{t('products.fieldPriceAverage')}</th>
                <th className="px-4 py-2.5 text-right font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((p) => {
                const { badge } = statusStyle(p.status)
                return (
                  <tr
                    key={p.id}
                    className="group hover:bg-slate-50 cursor-pointer"
                    onClick={() => onOpenProduct(p.id)}
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{p.sku}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-900">{p.name}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${typeStyle(p.type)}`}>
                        {t(`product.type.${p.type}`)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badge}`}>
                        {t(`products.status.${p.status}`)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{p.uom}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-slate-700">
                      {p.priceAverage != null ? p.priceAverage.toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          title={t('products.editProduct')}
                          onClick={(e) => { e.stopPropagation(); setEditingProduct(p); setShowProductForm('new') }}
                          className="rounded p-1 text-slate-400 hover:text-slate-700"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          type="button"
                          title={t('products.deleteProduct')}
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(p) }}
                          className="rounded p-1 text-red-400 hover:text-red-600"
                        >
                          <Trash2 size={12} />
                        </button>
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">{t('products.hint')}</p>
          ) : null}
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <p className="text-sm font-semibold text-slate-900">{t('products.deleteProduct')}</p>
            <p className="mt-2 text-sm text-slate-600">{t('products.deleteConfirm')}</p>
            <p className="mt-1 text-xs font-medium text-slate-800">{deleteTarget.name}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                {t('common.remove')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Product form modal (create / edit) */}
      {showProductForm ? (
        <ProductFormModal
          db={db}
          product={editingProduct}
          onClose={() => { setShowProductForm(null); setEditingProduct(null) }}
          onSaved={(id) => {
            setShowProductForm(null)
            setEditingProduct(null)
            refresh()
            if (!editingProduct) onOpenProduct(id)
          }}
        />
      ) : null}

      {/* New inquiry modal */}
      {showNewInquiry ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowNewInquiry(false)
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
                onClick={() => setShowNewInquiry(false)}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                aria-label={t('common.close')}
              >
                <X size={14} />
              </button>
            </header>
            <NewInquiryForm
              db={db}
              onCancel={() => setShowNewInquiry(false)}
              onCreated={(productId) => {
                setShowNewInquiry(false)
                refresh()
                onOpenProduct(productId)
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
