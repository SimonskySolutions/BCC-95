import { Trash2, Link2 } from 'lucide-react'
import { useLanguage } from '../../../i18n/useLanguage.js'
import { GROUP_DRIVERS } from '../../../domains/quotations/model.js'

const fieldCls =
  'w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-right text-xs focus:outline-none focus:ring-2 focus:ring-blue-300'

/**
 * One labelled numeric input.
 * @param {{ label: string; value: any; onChange: (n: number) => void; step?: string; suffix?: string }} props
 */
function NumField({ label, value, onChange, step = 'any', suffix }) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-[10px] font-medium text-slate-400">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          step={step}
          className={fieldCls}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        />
        {suffix ? <span className="text-[10px] text-slate-400">{suffix}</span> : null}
      </div>
    </label>
  )
}

/**
 * A single, always-editable cost line. The columns shown depend on the line's
 * `driver` — weight, surface, percent, allocation, pack or count — so every
 * group reuses the same component but only surfaces the inputs it needs.
 *
 * @param {{
 *   line: import('../../../domains/quotations/model.js').CostSheetLine
 *   amount: number
 *   currency: string
 *   onPatch: (patch: Partial<import('../../../domains/quotations/model.js').CostSheetLine>) => void
 *   onRemove: () => void
 * }} props
 */
export default function CostLineRow({ line, amount, currency, onPatch, onRemove }) {
  const { t } = useLanguage()
  const drivers = GROUP_DRIVERS[line.group] ?? ['count']

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2.5">
      <div className="flex flex-wrap items-start gap-2">
        {/* Description */}
        <input
          className="min-w-[140px] flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
          value={line.description}
          placeholder={t('cost.line.describe')}
          onChange={(e) => onPatch({ description: e.target.value })}
        />
        {/* Driver selector (only if the group allows more than one) */}
        {drivers.length > 1 ? (
          <select
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
            value={line.driver}
            onChange={(e) => onPatch({ driver: e.target.value })}
            title={t('cost.line.driver')}
          >
            {drivers.map((d) => (
              <option key={d} value={d}>
                {t(`cost.driver.${d}`, d)}
              </option>
            ))}
          </select>
        ) : null}
        {/* Amount + remove */}
        <div className="ml-auto flex items-center gap-2">
          <div className="text-right">
            <span className="block text-[10px] font-medium text-slate-400">{t('cost.line.amount')}</span>
            <span className="text-sm font-semibold text-slate-800">
              {amount.toFixed(4)} <span className="text-[10px] font-normal text-slate-400">{currency}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-600"
            title={t('cost.line.remove')}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Driver-specific inputs */}
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {line.driver === 'count' ? (
          <>
            <NumField label={t('cost.f.qty')} value={line.qty} onChange={(n) => onPatch({ qty: n })} />
            <NumField label={`${t('cost.f.unitCost')} (${currency})`} value={line.unitCost} onChange={(n) => onPatch({ unitCost: n })} />
          </>
        ) : null}

        {line.driver === 'weight' ? (
          line.linkNetKg ? (
            <>
              <div className="col-span-2 flex items-center gap-1.5 self-end rounded-lg bg-blue-50 px-2 py-1.5 text-[10px] font-medium text-blue-700">
                <Link2 size={11} /> {t('cost.f.linkedNetKg')}
              </div>
              <NumField label={`${t('cost.f.costPerKg')} (${currency})`} value={line.costPerKg} onChange={(n) => onPatch({ costPerKg: n })} />
            </>
          ) : (
            <>
              <NumField label={t('cost.f.netKg')} value={line.netKg} onChange={(n) => onPatch({ netKg: n })} suffix="kg" />
              <NumField label={t('cost.f.scrapPct')} value={line.scrapPct} onChange={(n) => onPatch({ scrapPct: n })} suffix="%" />
              <NumField label={`${t('cost.f.costPerKg')} (${currency})`} value={line.costPerKg} onChange={(n) => onPatch({ costPerKg: n })} />
            </>
          )
        ) : null}

        {line.driver === 'surface' ? (
          <>
            <NumField label={t('cost.f.areaDm2')} value={line.areaDm2} onChange={(n) => onPatch({ areaDm2: n })} suffix="dm²" />
            <NumField label={t('cost.f.gPerDm2')} value={line.gPerDm2} onChange={(n) => onPatch({ gPerDm2: n })} suffix="g/dm²" />
            <NumField label={`${t('cost.f.costPerKg')} (${currency})`} value={line.costPerKg} onChange={(n) => onPatch({ costPerKg: n })} />
          </>
        ) : null}

        {line.driver === 'percent' ? (
          <NumField label={t('cost.f.percentOfBase')} value={line.percent} onChange={(n) => onPatch({ percent: n })} suffix="%" />
        ) : null}

        {line.driver === 'allocation' ? (
          <>
            <NumField label={`${t('cost.f.fixedTotal')} (${currency})`} value={line.fixedTotal} onChange={(n) => onPatch({ fixedTotal: n })} />
            <NumField label={t('cost.f.allocationUnits')} value={line.allocationUnits} onChange={(n) => onPatch({ allocationUnits: n })} suffix={t('cost.f.units')} />
          </>
        ) : null}

        {line.driver === 'pack' ? (
          <>
            <NumField label={`${t('cost.f.costPerPack')} (${currency})`} value={line.costPerPack} onChange={(n) => onPatch({ costPerPack: n })} />
            <NumField label={t('cost.f.unitsPerPack')} value={line.unitsPerPack} onChange={(n) => onPatch({ unitsPerPack: n })} suffix={t('cost.f.units')} />
          </>
        ) : null}
      </div>
    </div>
  )
}
