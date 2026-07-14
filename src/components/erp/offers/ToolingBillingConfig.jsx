import { useLanguage } from '../../../i18n/useLanguage.js'
import { groupAmount } from '../../../lib/money.js'

/** Read the chosen billing scenario from the sheet's raw fields. */
function scenarioOf(sheet) {
  if (sheet.toolingMode === 'separate') return 'separate_offer'
  const d = sheet.amortiseDisplay ?? 'blended'
  if (d === 'line') return 'separate_line'
  if (d === 'first_batch') return 'first_batch'
  return 'in_price'
}

/** Each scenario maps to the underlying cost-sheet fields (the amortise-by
 *  choice is orthogonal and survives scenario switches). */
const SCENARIO_PATCH = {
  in_price: { toolingMode: 'amortise', amortiseDisplay: 'blended' },
  separate_line: { toolingMode: 'amortise', amortiseDisplay: 'line' },
  first_batch: { toolingMode: 'amortise', amortiseDisplay: 'first_batch' },
  separate_offer: { toolingMode: 'separate', amortiseDisplay: 'blended' },
}

/**
 * How the tooling/амортизация cost is billed — configured right in the Tooling
 * cost section. Three scenarios + a separate-offer variant.
 *
 * @param {{
 *   sheet: import('../../../domains/quotations/model.js').CostSheet
 *   rollup: ReturnType<import('../../../domains/quotations/selectors.js').computeCostRollup>
 *   currency: string
 *   onPatchSheet: (patch: Partial<import('../../../domains/quotations/model.js').CostSheet>) => void
 * }} props
 */
export default function ToolingBillingConfig({ sheet, rollup, currency, onPatchSheet }) {
  const { t } = useLanguage()
  const scenario = scenarioOf(sheet)
  const amortiseIntoPrice = scenario === 'in_price' || scenario === 'first_batch'
  const amortMode = sheet.amortisationMode === 'cost' ? 'cost' : 'units'
  const inputCls = 'mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm'

  return (
    <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3">
      <p className="mb-2 text-xs font-semibold text-slate-700">{t('cost.tooling.billing', 'Tooling billing')}</p>
      <div className={`grid grid-cols-1 gap-3 ${amortiseIntoPrice ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
        <label className="block text-xs font-medium text-slate-600">
          {t('cost.tooling.billing.how', 'How is the tooling billed?')}
          <select className={inputCls} value={scenario} onChange={(e) => onPatchSheet(SCENARIO_PATCH[e.target.value])}>
            <option value="in_price">{t('cost.tooling.inPrice', 'Included in the product price')}</option>
            <option value="separate_line">{t('cost.tooling.separateLine', 'Separate line in the offer')}</option>
            <option value="first_batch">{t('cost.tooling.firstBatch', 'First batch separate, then in price')}</option>
            <option value="separate_offer">{t('cost.tooling.separateOffer', 'Separate tooling offer')}</option>
          </select>
        </label>
        {amortiseIntoPrice ? (
          <label className="block text-xs font-medium text-slate-600">
            {t('cost.tooling.amortiseBy', 'Amortise by')}
            <select className={inputCls} value={amortMode} onChange={(e) => onPatchSheet({ amortisationMode: e.target.value })}>
              <option value="units">{t('cost.tooling.amortiseBy.units', 'Number of finished goods')}</option>
              <option value="cost">{t('cost.tooling.amortiseBy.cost', 'Production cost (value)')}</option>
            </select>
          </label>
        ) : null}
        {amortiseIntoPrice ? (
          amortMode === 'cost' ? (
            <label className="block text-xs font-medium text-slate-600">
              {t('cost.tooling.amortiseOverCost', 'Amortise over (production cost)')} · {currency}
              <input
                type="number"
                min={0}
                step="any"
                className={inputCls}
                placeholder={t('cost.tooling.amortiseOverCost.ph', 'e.g. 200000')}
                value={sheet.amortisationCost ?? ''}
                onChange={(e) => onPatchSheet({ amortisationCost: Number(e.target.value) })}
              />
            </label>
          ) : (
            <label className="block text-xs font-medium text-slate-600">
              {t('cost.tooling.amortiseOver', 'Amortise over (finished goods)')}
              <input
                type="number"
                min={1}
                className={inputCls}
                placeholder={t('cost.tooling.amortiseOver.ph', 'e.g. 1000')}
                value={sheet.amortisationUnits ?? ''}
                onChange={(e) => onPatchSheet({ amortisationUnits: Number(e.target.value) })}
              />
            </label>
          )
        ) : null}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        {t('cost.combined.toolingTotal', 'Tooling total')}: <span className="font-semibold text-slate-700">{groupAmount(rollup.toolingTotal)} {currency}</span>
        {amortiseIntoPrice && rollup.toolingPerUnit > 0
          ? <> · {t('cost.combined.toolingPerUnit', 'Per unit')}: <span className="font-semibold text-slate-700">{groupAmount(rollup.toolingPerUnit)} {currency}</span></>
          : null}
      </p>
      {amortiseIntoPrice && amortMode === 'cost' ? (
        <p className="mt-1 text-[11px] text-slate-500">
          {t('cost.tooling.costMode.hint', 'Each unit carries tooling in proportion to its cost: tooling total × unit cost ÷ cost base.')}
        </p>
      ) : null}
      {scenario === 'first_batch' ? (
        <p className="mt-1 rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] font-normal text-amber-700">
          {t('cost.tooling.firstBatch.hint', 'Tooling is a separate line on the first offer to this client; on later offers it is amortised into the unit price.')}
        </p>
      ) : null}
      {scenario === 'separate_offer' ? (
        <p className="mt-1 rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] font-normal text-amber-700">
          {t('cost.combined.separateHint', 'Tooling is billed as its own separate offer.')}
        </p>
      ) : null}
    </div>
  )
}
