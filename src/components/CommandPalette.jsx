import { useEffect, useRef, useState, useMemo } from 'react'
import { Search, Package, Users, FileText, X } from 'lucide-react'
import { useLanguage } from '../i18n/useLanguage.js'

/**
 * Global ⌘K / Ctrl+K command palette.
 * @param {{
 *   db: import('../data/mockDatabase.js').MockDatabase
 *   open: boolean
 *   onClose: () => void
 *   onOpenProduct: (id: string) => void
 *   onOpenClient: (id: string) => void
 *   onNavigate: (page: string) => void
 * }} props
 */
export default function CommandPalette({ db, open, onClose, onOpenProduct, onOpenClient }) {
  const { t } = useLanguage()
  const inputRef = useRef(/** @type {HTMLInputElement|null} */ (null))
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)

  useEffect(() => {
    if (open) {
      setQuery('')
      setCursor(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []

    /** @type {{ group: string; icon: JSX.Element; label: string; sub: string; action: () => void }[]} */
    const items = []

    for (const p of db.products) {
      if (p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)) {
        items.push({
          group: t('cmd.group.products'),
          icon: <Package size={14} className="text-emerald-600" />,
          label: p.name,
          sub: p.sku,
          action: () => { onOpenProduct(p.id); onClose() },
        })
      }
    }

    for (const c of db.clients) {
      if (c.name.toLowerCase().includes(q)) {
        items.push({
          group: t('cmd.group.clients'),
          icon: <Users size={14} className="text-blue-600" />,
          label: c.name,
          sub: c.industry ?? '',
          action: () => { onOpenClient(c.id); onClose() },
        })
      }
    }

    for (const quote of db.quoteDrafts) {
      const product = db.products.find((p) => p.id === quote.productId)
      const client  = db.clients.find((c) => c.id === quote.clientId)
      const pName   = product?.name ?? quote.productId
      const cName   = client?.name  ?? ''
      if (pName.toLowerCase().includes(q) || cName.toLowerCase().includes(q) || quote.id.includes(q)) {
        items.push({
          group: t('cmd.group.quotes'),
          icon: <FileText size={14} className="text-violet-600" />,
          label: pName,
          sub: `${cName} · ${quote.status}`,
          action: () => { onOpenProduct(quote.productId); onClose() },
        })
      }
    }

    return items.slice(0, 12)
  }, [query, db, t, onOpenProduct, onOpenClient, onClose])

  function handleKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)) }
    if (e.key === 'Enter'  && results[cursor]) results[cursor].action()
    if (e.key === 'Escape') onClose()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] bg-slate-900/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
          <Search size={16} className="shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCursor(0) }}
            onKeyDown={handleKey}
            placeholder={t('cmd.placeholder')}
            className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
          {query ? (
            <button type="button" onClick={() => setQuery('')} className="rounded p-1 text-slate-400 hover:text-slate-600">
              <X size={13} />
            </button>
          ) : (
            <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">Esc</kbd>
          )}
        </div>

        {/* Results */}
        {results.length > 0 ? (
          <ul className="max-h-80 overflow-y-auto py-1">
            {results.map((item, idx) => (
              <li key={idx}>
                <button
                  type="button"
                  onClick={item.action}
                  onMouseEnter={() => setCursor(idx)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${
                    cursor === idx ? 'bg-blue-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className="shrink-0 rounded-md border border-slate-100 bg-white p-1 shadow-sm">
                    {item.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{item.label}</p>
                    {item.sub ? <p className="truncate text-xs text-slate-500">{item.sub}</p> : null}
                  </span>
                  <span className="shrink-0 rounded border border-slate-100 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-400">
                    {item.group}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : query ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">{t('cmd.noResults')}</p>
        ) : (
          <p className="px-4 py-8 text-center text-sm text-slate-400">{t('cmd.placeholder')}</p>
        )}

        {/* Footer hint */}
        <div className="border-t border-slate-100 px-4 py-2">
          <p className="text-[10px] text-slate-400">{t('cmd.hint')}</p>
        </div>
      </div>
    </div>
  )
}
