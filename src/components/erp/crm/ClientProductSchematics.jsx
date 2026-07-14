import { useEffect, useMemo, useState } from 'react'
import { FileText, Eye, Download, Package } from 'lucide-react'
import { useLanguage } from '../../../i18n/useLanguage.js'
import { selectOffersByClient } from '../../../domains/quotations/selectors.js'

/**
 * Live "Продуктови схеми" panel on the customer profile: the product-level
 * documents (schematics/specs) for every product this customer is quoted, read
 * from the same `files` store managed in the Product Workspace → Documents tab.
 *
 * @param {{ db: any, clientId: string, onOpenProduct?: (productId: string) => void }} props
 */
export default function ClientProductSchematics({ db, clientId, onOpenProduct }) {
  const { t } = useLanguage()
  const [filesByProduct, setFilesByProduct] = useState(/** @type {Record<string, any[]>} */ ({}))

  const products = useMemo(() => {
    const map = new Map()
    for (const o of selectOffersByClient(db, clientId)) if (o.productId) map.set(o.productId, o.productName)
    for (const co of db.clientOrders ?? []) {
      if (co.clientId === clientId && co.productId) {
        const p = (db.products ?? []).find((pr) => pr.id === co.productId)
        map.set(co.productId, p?.name ?? co.productId)
      }
    }
    return [...map].map(([id, name]) => ({ id, name }))
  }, [db, clientId])

  const productsKey = products.map((p) => p.id).join(',')

  useEffect(() => {
    let cancelled = false
    Promise.all(
      products.map((p) =>
        fetch(`/api/files?productId=${encodeURIComponent(p.id)}`)
          .then((r) => (r.ok ? r.json() : []))
          .then((files) => [p.id, files])
          .catch(() => [p.id, []])),
    ).then((entries) => { if (!cancelled) setFilesByProduct(Object.fromEntries(entries)) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productsKey])

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <h3 className="mb-2 text-sm font-semibold text-slate-900">{t('client.schematics')}</h3>
      {products.length === 0 ? (
        <p className="text-xs text-slate-400">{t('client.schematics.empty')}</p>
      ) : (
        <div className="space-y-3">
          {products.map((p) => {
            const files = filesByProduct[p.id] ?? []
            return (
              <div key={p.id}>
                <button type="button" onClick={() => onOpenProduct?.(p.id)}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:underline">
                  <Package size={13} /> {p.name}
                </button>
                {files.length === 0 ? (
                  <p className="pl-5 text-xs text-slate-300">{t('client.schematics.none')}</p>
                ) : (
                  <ul className="mt-1 space-y-1 pl-5">
                    {files.map((f) => (
                      <li key={f.id} className="flex items-center gap-2 text-sm">
                        <FileText size={13} className="shrink-0 text-slate-400" />
                        <span className="min-w-0 flex-1 truncate text-slate-700">{f.name}</span>
                        <span className="hidden text-[11px] text-slate-400 sm:inline">{f.folder}</span>
                        <a href={`/api/files/${f.id}`} target="_blank" rel="noreferrer" title={t('docs.preview')}
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Eye size={13} /></a>
                        <a href={`/api/files/${f.id}?download=1`} title={t('docs.download')}
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Download size={13} /></a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
