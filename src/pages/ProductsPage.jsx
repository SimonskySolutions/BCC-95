import { useLanguage } from '../i18n/useLanguage.js'

/**
 * @param {{ db: import('../data/mockDatabase.js').MockDatabase; onOpenProduct: (id: string) => void }} props
 */
export default function ProductsPage({ db, onOpenProduct }) {
  const { t } = useLanguage()

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">{t('products.hint')}</p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {db.products.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onOpenProduct(p.id)}
              className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-card transition hover:border-blue-200 hover:bg-blue-50/40"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{p.sku}</p>
              <p className="mt-1 font-semibold text-slate-900">{p.name}</p>
              <p className="mt-1 text-xs text-slate-500">{p.status}</p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
