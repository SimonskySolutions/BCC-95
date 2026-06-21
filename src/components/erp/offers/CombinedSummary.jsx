import { Layers, Plus, Trash2 } from 'lucide-react'
import { useLanguage } from '../../../i18n/useLanguage.js'

/**
 * @param {{ label: string; value: number; currency: string; strong?: boolean; highlight?: boolean }} props
 */
function Metric({ label, value, currency, strong, highlight }) {
  return (
    <div className={`rounded-lg p-3 ${highlight ? 'bg-blue-50' : 'bg-white'}`}>
      <p className={`text-[11px] ${highlight ? 'text-blue-700' : 'text-slate-500'}`}>{label}</p>
      <p className={`mt-1 font-semibold ${strong || highlight ? 'text-xl' : 'text-base'} ${highlight ? 'text-blue-900' : 'text-slate-900'}`}>
        {value.toFixed(4)} <span className="text-[11px] font-normal text-slate-400">{currency}</span>
      </p>
    </div>
  )
}

/**
 * The combined rollup — sums the four cost groups into the cost price, applies
 * profit to reach EXW, then adds logistics to reach DAP. Also hosts the inputs
 * that drive the combination: profit %, tooling mode and amortisation units.
 *
 * @param {{
 *   rollup: ReturnType<import('../../../domains/quotations/selectors.js').computeCostRollup>
 *   sheet: import('../../../domains/quotations/model.js').CostSheet
 *   currency: string
 *   onPatchSheet: (patch: Partial<import('../../../domains/quotations/model.js').CostSheet>) => void
 * }} props
 */
export default function CombinedSummary({ rollup, sheet, currency, onPatchSheet }) {
  const { t } = useLanguage()
  const inputCls = 'mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm'

  const breaks = sheet.priceBreaks ?? []
  const priceAt = (margin) => {
    const exw = rollup.costPrice * (1 + (Number(margin) || 0) / 100)
    return { exw, dap: exw + rollup.logistics }
  }
  const addBreak = () =>
    onPatchSheet({ priceBreaks: [...breaks, { id: `qb-${Date.now()}`, qty: 100, marginPercent: sheet.marginPercent ?? 10 }] })
  const patchBreak = (id, patch) =>
    onPatchSheet({ priceBreaks: breaks.map((b) => (b.id === id ? { ...b, ...patch } : b)) })
  const removeBreak = (id) =>
    onPatchSheet({ priceBreaks: breaks.filter((b) => b.id !== id) })

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-card">
      <header className="mb-3 flex items-center gap-2">
        <Layers size={16} className="text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-900">{t('cost.combined.title')}</h3>
      </header>

      {/* Per-group subtotals */}
      <div className="mb-3 grid grid-cols-3 gap-2">
        <Metric label={t('cost.group.material')} value={rollup.groups.material} currency={currency} />
        <Metric label={t('cost.group.operation')} value={rollup.groups.operation} currency={currency} />
        <Metric label={t('cost.group.other')} value={rollup.groups.other} currency={currency} />
      </div>

      {/* Drivers of the combination */}
      <div className="mb-3 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-3">
        <label className="block text-xs font-medium text-slate-600">
          {t('cost.combined.profitPct')}
          <input
            type="number"
            className={inputCls}
            value={sheet.marginPercent ?? 0}
            onChange={(e) => onPatchSheet({ marginPercent: Number(e.target.value) })}
          />
        </label>
        <label className="block text-xs font-medium text-slate-600">
          {t('cost.combined.toolingMode')}
          <select
            className={inputCls}
            value={sheet.toolingMode}
            onChange={(e) => onPatchSheet({ toolingMode: e.target.value })}
          >
            <option value="amortise">{t('cost.combined.toolingAmortise')}</option>
            <option value="separate">{t('cost.combined.toolingSeparate')}</option>
          </select>
        </label>
        <label className="block text-xs font-medium text-slate-600">
          {t('cost.combined.amortUnits')}
          <input
            type="number"
            min={1}
            className={inputCls}
            value={sheet.amortisationUnits ?? ''}
            disabled={sheet.toolingMode !== 'amortise'}
            onChange={(e) => onPatchSheet({ amortisationUnits: Number(e.target.value) })}
          />
        </label>
      </div>

      {/* Tooling line */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
        <span className="font-medium text-slate-600">{t('cost.combined.toolingTotal')}: <span className="font-bold text-slate-800">{rollup.toolingTotal.toFixed(2)} {currency}</span></span>
        <span className="text-slate-500">
          {sheet.toolingMode === 'amortise'
            ? <>{t('cost.combined.toolingPerUnit')}: <span className="font-semibold text-slate-700">{rollup.toolingPerUnit.toFixed(4)} {currency}</span></>
            : <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">{t('cost.combined.toolingBilledSeparately')}</span>}
        </span>
      </div>

      {/* The combined chain */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Metric label={t('cost.combined.costPrice')} value={rollup.costPrice} currency={currency} strong />
        <Metric label={`${t('cost.combined.profit')} (${sheet.marginPercent ?? 0}%)`} value={rollup.profit} currency={currency} />
        <Metric label={t('cost.combined.exw')} value={rollup.exw} currency={currency} strong />
        <Metric label={t('cost.combined.dap')} value={rollup.dap} currency={currency} highlight />
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        {t('cost.combined.formula')}
      </p>

      {/* Quantity price breaks — different margin per quantity tier */}
      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-slate-800">{t('cost.breaks.title')}</h4>
            <p className="text-[11px] text-slate-400">{t('cost.breaks.hint')}</p>
          </div>
          <button
            type="button"
            onClick={addBreak}
            className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-700"
          >
            <Plus size={12} /> {t('cost.breaks.add')}
          </button>
        </div>

        {breaks.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-center text-[11px] text-slate-400">
            {t('cost.breaks.empty')}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-xs">
              <thead className="text-[10px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-2 py-1 text-left">{t('cost.breaks.qty')}</th>
                  <th className="px-2 py-1 text-left">{t('cost.breaks.margin')}</th>
                  <th className="px-2 py-1 text-right">{t('cost.combined.exw')}</th>
                  <th className="px-2 py-1 text-right">{t('cost.combined.dap')}</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {breaks.map((b) => {
                  const p = priceAt(b.marginPercent)
                  return (
                    <tr key={b.id} className="border-t border-slate-100">
                      <td className="px-2 py-1.5">
                        <input
                          type="number" min={1}
                          className="w-24 rounded-md border border-slate-200 px-2 py-1 text-xs"
                          value={b.qty}
                          onChange={(e) => patchBreak(b.id, { qty: Number(e.target.value) })}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            className="w-20 rounded-md border border-slate-200 px-2 py-1 text-right text-xs"
                            value={b.marginPercent}
                            onChange={(e) => patchBreak(b.id, { marginPercent: Number(e.target.value) })}
                          />
                          <span className="text-[10px] text-slate-400">%</span>
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-right font-medium text-slate-700">{p.exw.toFixed(4)}</td>
                      <td className="px-2 py-1.5 text-right font-semibold text-blue-700">{p.dap.toFixed(4)}</td>
                      <td className="px-2 py-1.5 text-right">
                        <button
                          type="button"
                          onClick={() => removeBreak(b.id)}
                          className="text-slate-300 hover:text-rose-600"
                          title={t('cost.breaks.remove')}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
