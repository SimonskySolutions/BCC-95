import { useEffect, useRef, useState } from 'react'
import { Trash2, ChevronDown } from 'lucide-react'
import { useLanguage } from '../../../i18n/useLanguage.js'
import { GROUP_DRIVERS } from '../../../domains/quotations/model.js'

const fieldCls =
  'w-full rounded-md border border-slate-200 bg-white px-1.5 py-1 text-right text-xs focus:outline-none focus:ring-2 focus:ring-blue-300'

/** Drop leading zeros from an integer string, keeping a single 0. */
function stripLeadingZeros(digits) {
  if (digits === '') return ''
  const s = digits.replace(/^0+(?=\d)/, '')
  return s === '' ? '0' : s
}

/**
 * Sanitise a numeric string: digits + one decimal separator (comma or dot),
 * no leading zeros except a single `0` before the separator. Preserves the
 * separator the user typed so "0,5" stays "0,5".
 */
function sanitizeDecimal(raw) {
  let s = String(raw).replace(/[^\d.,]/g, '')
  const sepIdx = s.search(/[.,]/)
  if (sepIdx >= 0) {
    const sep = s[sepIdx]
    const intPart = s.slice(0, sepIdx).replace(/[.,]/g, '')
    const decPart = s.slice(sepIdx + 1).replace(/[.,]/g, '')
    return `${stripLeadingZeros(intPart)}${sep}${decPart}`
  }
  return stripLeadingZeros(s)
}

const parseDecimal = (s) => {
  const n = Number(String(s).replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}
// Show 0 / empty as a blank field (with a 0 placeholder) so the user can type
// straight in without clearing a pre-filled zero.
const toText = (v) => (v === null || v === undefined || v === '' || Number(v) === 0 ? '' : String(v))

/**
 * One compact labelled numeric input. Uses a text field with decimal input
 * mode so we can forbid leading zeros (e.g. "0200") while still allowing
 * "0,xxx" decimals.
 * @param {{ label: string; value: any; onChange: (n: number) => void; suffix?: string }} props
 */
function NumField({ label, value, onChange, suffix }) {
  const [text, setText] = useState(() => toText(value))

  // Keep in sync when the value changes from outside (catalog autofill, etc.)
  useEffect(() => {
    if (parseDecimal(text) !== (Number(value) || 0)) setText(toText(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <label className="flex items-center gap-1.5">
      <span className="whitespace-nowrap text-[10px] font-medium text-slate-400">{label}</span>
      <input
        type="text"
        inputMode="decimal"
        placeholder="0"
        className={`${fieldCls} w-20`}
        value={text}
        onChange={(e) => {
          const s = sanitizeDecimal(e.target.value)
          setText(s)
          onChange(parseDecimal(s))
        }}
      />
      {suffix ? <span className="-ml-0.5 text-[10px] text-slate-400">{suffix}</span> : null}
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
 *   collapsed?: boolean
 *   onToggleCollapse?: () => void
 * }} props
 */
export default function CostLineRow({ line, amount, currency, catalog = [], onPatch, onRemove, collapsed = false, onToggleCollapse }) {
  const { t } = useLanguage()
  const drivers = GROUP_DRIVERS[line.group] ?? ['count']
  const driverRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const focusOnExpand = useRef(false)

  // After Enter expands a collapsed line, jump into its first driver field.
  useEffect(() => {
    if (!collapsed && focusOnExpand.current) {
      focusOnExpand.current = false
      const first = /** @type {HTMLElement & { select?: () => void } | null} */ (driverRef.current?.querySelector('input, select'))
      if (first) { first.focus(); first.select?.() }
    }
  }, [collapsed])

  // Pick the catalog entry whose label matches → apply its driver + defaults.
  function onDescription(value) {
    const entry = catalog.find((c) => c.label === value)
    if (entry) onPatch({ description: value, driver: entry.driver, catalogRefId: entry.id, ...entry.defaults })
    else onPatch({ description: value })
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 transition-colors hover:border-slate-300">
      <div className="flex flex-wrap items-center gap-2">
        {/* Collapse toggle */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          title={collapsed ? t('cost.line.expand') : t('cost.line.collapse')}
        >
          <ChevronDown size={14} className={`transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`} />
        </button>
        {/* Description — combobox: pick from the part's nomenclature or type freely */}
        <input
          list={`cat-${line.id}`}
          className="min-w-[140px] flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
          value={line.description}
          placeholder={t('cost.line.describe')}
          onChange={(e) => onDescription(e.target.value)}
          onKeyDown={(e) => {
            // On a collapsed line, Enter expands it and steps into its own fields
            // instead of jumping to the next record.
            if (e.key === 'Enter' && collapsed) {
              e.preventDefault()
              e.stopPropagation()
              focusOnExpand.current = true
              onToggleCollapse?.()
            }
          }}
        />
        {catalog.length ? (
          <datalist id={`cat-${line.id}`}>
            {catalog.map((c) => <option key={c.id} value={c.label} />)}
          </datalist>
        ) : null}
        {/* Free-text clarification next to the item (бланка col. B) */}
        {collapsed ? (
          line.note ? <span className="min-w-0 flex-1 truncate text-xs italic text-slate-400">{line.note}</span> : <span className="flex-1" />
        ) : (
          <input
            className="min-w-[120px] flex-1 rounded-md border border-dashed border-slate-200 bg-slate-50/60 px-2 py-1 text-xs italic text-slate-600 focus:not-italic focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={line.note ?? ''}
            placeholder={t('cost.line.note')}
            onChange={(e) => onPatch({ note: e.target.value })}
          />
        )}
        {/* Driver selector (only if the group allows more than one) */}
        {!collapsed && drivers.length > 1 ? (
          <select
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
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
          <span className="text-sm font-semibold text-slate-800">
            {amount.toFixed(4)} <span className="text-[10px] font-normal text-slate-400">{currency}</span>
          </span>
          <button
            type="button"
            onClick={onRemove}
            className="flex h-6 w-6 items-center justify-center rounded-md text-slate-300 hover:bg-rose-50 hover:text-rose-600"
            title={t('cost.line.remove')}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Driver-specific inputs — hidden when the line is collapsed */}
      {collapsed ? null : (
      <div ref={driverRef} className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {line.driver === 'count' ? (
          <>
            <NumField label={t('cost.f.qty')} value={line.qty} onChange={(n) => onPatch({ qty: n })} />
            <NumField label={`${t('cost.f.unitCost')} (${currency})`} value={line.unitCost} onChange={(n) => onPatch({ unitCost: n })} />
          </>
        ) : null}

        {line.driver === 'weight' ? (
          line.linkNetKg ? (
            <>
              <span className="flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700">
                <span aria-hidden="true">↳</span> {t('cost.f.linkedNetKg')}
              </span>
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
      )}
    </div>
  )
}
