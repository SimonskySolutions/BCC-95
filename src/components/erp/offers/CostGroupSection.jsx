import { useEffect, useRef, useState } from 'react'
import { Plus, ChevronDown } from 'lucide-react'
import { useLanguage } from '../../../i18n/useLanguage.js'
import { computeLineAmount } from '../../../domains/quotations/selectors.js'
import CostLineRow from './CostLineRow.jsx'

const ACCENTS = {
  emerald: 'bg-emerald-100 text-emerald-700',
  violet: 'bg-violet-100 text-violet-700',
  blue: 'bg-blue-100 text-blue-700',
  amber: 'bg-amber-100 text-amber-700',
  slate: 'bg-slate-100 text-slate-600',
}

/**
 * One cost group rendered as an independent card: its own line list, a catalog
 * picker to add standard lines, and a running subtotal. Each group computes its
 * subtotal independently — the combined panel just sums them.
 *
 * @param {{
 *   index: number | string
 *   title: string
 *   hint?: string
 *   accent?: keyof typeof ACCENTS
 *   group: import('../../../domains/quotations/model.js').CostGroup
 *   lines: import('../../../domains/quotations/model.js').CostSheetLine[]
 *   ctx: { netKg: number; costBase: number }
 *   subtotal: number
 *   currency: string
 *   catalog: import('../../../domains/quotations/model.js').CostCatalogEntry[]
 *   onAdd: (entry: import('../../../domains/quotations/model.js').CostCatalogEntry | null) => void
 *   onPatchLine: (id: string, patch: any) => void
 *   onRemoveLine: (id: string) => void
 *   children?: import('react').ReactNode
 * }} props
 */
export default function CostGroupSection({
  index, title, hint, accent = 'slate', group, lines, ctx, subtotal, currency, catalog,
  onAdd, onPatchLine, onRemoveLine, children,
}) {
  const { t } = useLanguage()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [open, setOpen] = useState(true)
  // Which lines are expanded. Seeded lines start collapsed (overview); a newly
  // added line auto-expands so it's ready to edit.
  const [expanded, setExpanded] = useState(() => new Set())
  const prevIds = useRef(/** @type {string[] | null} */ (null))

  useEffect(() => {
    const ids = lines.map((l) => l.id)
    if (prevIds.current) {
      const added = ids.filter((id) => !prevIds.current.includes(id))
      if (added.length) setExpanded((s) => { const n = new Set(s); added.forEach((id) => n.add(id)); return n })
    }
    prevIds.current = ids
  }, [lines])

  const toggleLine = (id) =>
    setExpanded((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 rounded-lg px-1 py-0.5 text-left transition-colors hover:bg-slate-50"
      >
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${ACCENTS[accent]}`}>
          {index}
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
          {hint && open ? <p className="truncate text-[11px] text-slate-400">{hint}</p> : null}
        </div>
        <div className="text-right">
          <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">{t('cost.group.subtotal')}</span>
          <span className="text-sm font-bold text-slate-800">{subtotal.toFixed(4)} <span className="text-[10px] font-normal text-slate-400">{currency}</span></span>
        </div>
        <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {!open ? null : (
      <div className="mt-1.5">
      <div className="space-y-1.5">
        {lines.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-center text-[11px] text-slate-400">
            {t('cost.group.empty')}
          </p>
        ) : null}
        {lines.map((line) => (
          <CostLineRow
            key={line.id}
            line={line}
            amount={computeLineAmount(line, ctx)}
            currency={currency}
            collapsed={!expanded.has(line.id)}
            onToggleCollapse={() => toggleLine(line.id)}
            onPatch={(patch) => onPatchLine(line.id, patch)}
            onRemove={() => onRemoveLine(line.id)}
          />
        ))}
      </div>

      {children}

      {/* Add-line affordance with catalog picker */}
      <div className="relative mt-2">
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-2 text-xs font-medium text-slate-500 hover:border-blue-300 hover:bg-slate-50 hover:text-blue-700"
        >
          <Plus size={13} /> {t('cost.group.addLine')} <ChevronDown size={12} />
        </button>
        {pickerOpen ? (
          <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            <p className="border-b border-slate-100 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {t('cost.group.fromCatalog')}
            </p>
            <div className="max-h-56 overflow-y-auto">
              {catalog.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => { onAdd(entry); setPickerOpen(false) }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-blue-50"
                >
                  <span className="font-medium text-slate-700">{entry.label}</span>
                  <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium uppercase text-slate-500">
                    {t(`cost.driver.${entry.driver}`, entry.driver)}
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => { onAdd(null); setPickerOpen(false) }}
              className="w-full border-t border-slate-100 px-3 py-2 text-left text-xs font-medium text-slate-500 hover:bg-slate-50"
            >
              + {t('cost.group.blankLine')}
            </button>
          </div>
        ) : null}
      </div>
      </div>
      )}
    </div>
  )
}
