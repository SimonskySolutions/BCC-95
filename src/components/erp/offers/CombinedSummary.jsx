import { Layers } from 'lucide-react'
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

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-card">
      <header className="mb-3 flex items-center gap-2">
        <Layers size={16} className="text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-900">{t('cost.combined.title')}</h3>
      </header>

      {/* Per-group subtotals */}
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Metric label={t('cost.group.material')} value={rollup.groups.material} currency={currency} />
        <Metric label={t('cost.group.labor')} value={rollup.groups.labor} currency={currency} />
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
    </div>
  )
}
