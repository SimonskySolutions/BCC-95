import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { useLanguage } from '../../../i18n/useLanguage.js'

export const inputCls = 'mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm'
export const labelCls = 'block text-xs font-medium text-slate-600'

/** Clickable, sort-aware table header cell. */
export function SortTh({ label, k, sort, onSort, align = 'left' }) {
  const active = sort.key === k
  return (
    <th
      className={`cursor-pointer select-none px-4 py-3 transition-colors hover:text-slate-700 ${align === 'right' ? 'text-right' : ''}`}
      onClick={() => onSort(k)}
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <span className={`inline-flex items-center gap-1 ${active ? 'text-slate-800' : ''}`}>
        {label}
        {active
          ? (sort.dir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />)
          : <ArrowUpDown size={11} className="opacity-30" />}
      </span>
    </th>
  )
}

const PO_STATUS_STYLE = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
  confirmed: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100',
  partial: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
  received: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  closed: 'bg-slate-200 text-slate-700',
  cancelled: 'bg-rose-50 text-rose-600 ring-1 ring-rose-100',
}

/** Colored chip for a purchase-order status. */
export function PoStatusBadge({ status }) {
  const { t } = useLanguage()
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PO_STATUS_STYLE[status] ?? PO_STATUS_STYLE.draft}`}>
      {t(`purchase.status.${status}`, status)}
    </span>
  )
}

const CONTRACT_STATUS_STYLE = {
  active: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  expiring: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
  expired: 'bg-rose-50 text-rose-600 ring-1 ring-rose-100',
  upcoming: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
}

/** Colored chip for contract validity. */
export function ContractStatusBadge({ status }) {
  const { t } = useLanguage()
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${CONTRACT_STATUS_STYLE[status] ?? CONTRACT_STATUS_STYLE.active}`}>
      {t(`purchase.contract.${status}`, status)}
    </span>
  )
}
