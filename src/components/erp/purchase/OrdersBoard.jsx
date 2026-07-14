import { useState } from 'react'
import { useLanguage } from '../../../i18n/useLanguage.js'
import { groupAmount } from '../../../lib/money.js'
import { patchPurchaseOrder, receivePurchaseOrderLine } from '../../../domains/purchase/mutations.js'
import {
  selectLinesByPurchaseOrder,
  selectPurchaseOrderTotal,
  selectPurchaseOrdersSorted,
  selectVendorById,
} from '../../../domains/purchase/selectors.js'

const COLUMNS = ['draft', 'sent', 'confirmed', 'partial', 'received', 'closed', 'cancelled']

const COLUMN_ACCENT = {
  draft: 'border-t-slate-300',
  sent: 'border-t-blue-400',
  confirmed: 'border-t-indigo-400',
  partial: 'border-t-amber-400',
  received: 'border-t-emerald-400',
  closed: 'border-t-slate-500',
  cancelled: 'border-t-rose-400',
}

/** Which drops are meaningful; receiving flows through goods receipts. */
function canDrop(po, lines, target) {
  if (!po || po.status === target) return false
  const nothingReceived = lines.every((l) => !(l.receivedQty > 0))
  switch (target) {
    case 'draft':
    case 'sent':
    case 'confirmed':
      return ['draft', 'sent', 'confirmed'].includes(po.status)
    case 'received':
      return ['sent', 'confirmed', 'partial'].includes(po.status) && lines.length > 0
    case 'closed':
      return po.status === 'received'
    case 'cancelled':
      return ['draft', 'sent', 'confirmed'].includes(po.status) && nothingReceived
    default:
      return false // 'partial' is computed from receipts, not a drop target
  }
}

/** Kanban view of purchase orders — drag a card to move it through the lifecycle. */
export default function OrdersBoard({ db, commit, currency, onOpen }) {
  const { t } = useLanguage()
  const [dragId, setDragId] = useState(/** @type {string | null} */ (null))
  const [overCol, setOverCol] = useState(/** @type {string | null} */ (null))

  const orders = selectPurchaseOrdersSorted(db)
  const dragPo = dragId ? orders.find((p) => p.id === dragId) : null
  const dragLines = dragPo ? selectLinesByPurchaseOrder(db, dragPo.id) : []

  function drop(target) {
    if (!dragPo || !canDrop(dragPo, dragLines, target)) { setDragId(null); setOverCol(null); return }
    commit(() => {
      if (target === 'received') {
        for (const l of selectLinesByPurchaseOrder(db, dragPo.id)) {
          if ((l.receivedQty ?? 0) < l.qty) receivePurchaseOrderLine(db, l.id)
        }
      } else {
        patchPurchaseOrder(db, dragPo.id, { status: target })
      }
    })
    setDragId(null)
    setOverCol(null)
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {COLUMNS.map((col) => {
        const cards = orders.filter((p) => p.status === col)
        const droppable = dragPo ? canDrop(dragPo, dragLines, col) : false
        return (
          <div
            key={col}
            onDragOver={(e) => { if (droppable) { e.preventDefault(); setOverCol(col) } }}
            onDragLeave={() => setOverCol((c) => (c === col ? null : c))}
            onDrop={() => drop(col)}
            className={`min-h-[16rem] w-60 shrink-0 rounded-xl border border-t-4 bg-slate-50/70 p-2 transition ${COLUMN_ACCENT[col]} ${
              overCol === col && droppable ? 'border-blue-300 bg-blue-50/70 ring-2 ring-blue-200' : 'border-slate-200'
            } ${dragPo && !droppable && col !== dragPo.status ? 'opacity-50' : ''}`}
          >
            <p className="mb-2 flex items-center justify-between px-1 text-xs font-semibold text-slate-700">
              {t(`purchase.status.${col}`, col)}
              <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">{cards.length}</span>
            </p>
            <div className="space-y-2">
              {cards.map((po) => {
                const vendor = selectVendorById(db, po.vendorId)
                const draggable = !['closed', 'cancelled'].includes(po.status)
                return (
                  <button
                    key={po.id}
                    type="button"
                    draggable={draggable}
                    onDragStart={() => setDragId(po.id)}
                    onDragEnd={() => { setDragId(null); setOverCol(null) }}
                    onClick={() => onOpen(po.id)}
                    className={`block w-full rounded-lg border border-slate-200 bg-white p-2.5 text-left shadow-sm transition hover:border-blue-300 hover:shadow ${
                      draggable ? 'cursor-grab active:cursor-grabbing' : ''
                    } ${dragId === po.id ? 'opacity-40' : ''}`}
                  >
                    <p className="text-xs font-semibold text-slate-900">{po.no ?? po.id}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-600">{vendor?.name ?? po.vendorId}</p>
                    <p className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                      <span>{po.expectedAt ?? po.orderedAt}</span>
                      <span className="font-semibold text-slate-700">{groupAmount(selectPurchaseOrderTotal(db, po.id))} {po.currency ?? currency}</span>
                    </p>
                  </button>
                )
              })}
              {cards.length === 0 ? <p className="px-1 py-3 text-center text-[11px] text-slate-300">—</p> : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}
