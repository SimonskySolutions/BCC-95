import { useState } from 'react'
import { ArrowLeft, Check, Columns3, List, Mail, Plus, Printer, Send, Trash2, Truck, X } from 'lucide-react'
import OrdersBoard from './OrdersBoard.jsx'
import { useLanguage } from '../../../i18n/useLanguage.js'
import { groupAmount } from '../../../lib/money.js'
import DatePicker from '../../DatePicker.jsx'
import { emailPurchaseOrder, printPurchaseOrder } from '../../../services/purchase/poDocumentService.js'
import { PoStatusBadge, SortTh, inputCls, labelCls } from './shared.jsx'
import { sortRows, toggleSort } from './tableSort.js'
import { useToast } from '../../ui/feedbackContext.js'
import {
  appendPurchaseOrder,
  appendPurchaseOrderLine,
  patchPurchaseOrder,
  receivePurchaseOrderLine,
  removePurchaseOrderLine,
} from '../../../domains/purchase/mutations.js'
import {
  poLineAmount,
  selectLinesByPurchaseOrder,
  selectPurchaseOrderTotal,
  selectPurchaseOrdersSorted,
  selectVendorById,
} from '../../../domains/purchase/selectors.js'

const emptyLine = () => ({ materialId: '', description: '', qty: '', unitCost: '', discountPercent: '' })

/** Purchase orders: list, creation with lines, lifecycle + per-line receiving. */
export default function OrdersTab({ db, commit, currency, actorId, companyName }) {
  const { t, language } = useLanguage()
  const toast = useToast()
  const [selId, setSelId] = useState(/** @type {string | null} */ (null))
  const [creating, setCreating] = useState(false)
  const [view, setView] = useState(/** @type {'list' | 'board'} */ ('list'))
  const [sort, setSort] = useState({ key: 'orderedAt', dir: 'desc' })
  const [form, setForm] = useState({ vendorId: '', expectedAt: '', notes: '', lines: [emptyLine()] })

  const vendors = [...(db.vendors ?? [])].sort((a, b) => a.name.localeCompare(b.name))
  const materials = db.materials ?? []
  const selPo = selId ? (db.purchaseOrders ?? []).find((p) => p.id === selId) : null

  const setLine = (i, patch) =>
    setForm((f) => ({ ...f, lines: f.lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) }))

  function createOrder() {
    if (!form.vendorId) return
    const lines = form.lines.filter((l) => (Number(l.qty) > 0 && Number(l.unitCost) >= 0) && (l.materialId || l.description.trim()))
    let poId = null
    commit(() => {
      const po = appendPurchaseOrder(db, {
        vendorId: form.vendorId,
        expectedAt: form.expectedAt || undefined,
        currency,
        notes: form.notes.trim() || undefined,
        createdById: actorId,
      })
      poId = po.id
      for (const l of lines) {
        const mat = materials.find((m) => m.id === l.materialId)
        appendPurchaseOrderLine(db, {
          purchaseOrderId: po.id,
          materialId: l.materialId || undefined,
          description: l.materialId ? undefined : l.description.trim(),
          qty: Number(l.qty),
          uom: mat?.uom,
          unitCost: Number(l.unitCost),
          discountPercent: Number(l.discountPercent) || 0,
        })
      }
    })
    setCreating(false)
    setForm({ vendorId: '', expectedAt: '', notes: '', lines: [emptyLine()] })
    setSelId(poId)
  }

  const lineLabel = (l) => {
    const mat = l.materialId ? materials.find((m) => m.id === l.materialId) : null
    return mat ? `${mat.sku} — ${mat.name}` : (l.description ?? '')
  }

  // ── Detail view ─────────────────────────────────────────────────────────
  if (selPo) {
    const vendor = selectVendorById(db, selPo.vendorId)
    const lines = selectLinesByPurchaseOrder(db, selPo.id)
    const total = selectPurchaseOrderTotal(db, selPo.id)
    const canReceive = ['sent', 'confirmed', 'partial'].includes(selPo.status)
    const nothingReceived = lines.every((l) => !(l.receivedQty > 0))
    const setStatus = (status) => commit(() => patchPurchaseOrder(db, selPo.id, { status }))
    const docOpts = { language, currency, companyName }
    const sendOrder = () => {
      let email = null
      commit(() => {
        patchPurchaseOrder(db, selPo.id, { status: 'sent' })
        email = emailPurchaseOrder(db, selPo.id, docOpts)
      })
      if (email) toast(`${t('purchase.emailRecorded', 'Email recorded to')} ${email.to.join(', ')}`)
      else toast(t('purchase.noVendorEmail', 'Vendor has no email address — order marked sent, print it instead.'), { type: 'warning' })
    }
    return (
      <div className="space-y-4">
        <button type="button" onClick={() => setSelId(null)} className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900">
          <ArrowLeft size={13} /> {t('purchase.backToOrders', 'All orders')}
        </button>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">{selPo.no ?? selPo.id} · {vendor?.name}</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {t('purchase.colOrdered')}: {selPo.orderedAt}
                {selPo.expectedAt ? <> · {t('purchase.expected', 'Expected')}: {selPo.expectedAt}</> : null}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <PoStatusBadge status={selPo.status} />
              <button type="button" onClick={() => printPurchaseOrder(db, selPo.id, docOpts)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50" title={t('purchase.print', 'Print')}><Printer size={12} /> {t('purchase.print', 'Print')}</button>
              {selPo.status !== 'draft' && selPo.status !== 'cancelled' ? (
                <button type="button" onClick={() => { let email = null; commit(() => { email = emailPurchaseOrder(db, selPo.id, docOpts) }); if (email) toast(`${t('purchase.emailRecorded', 'Email recorded to')} ${email.to.join(', ')}`); else toast(t('purchase.noVendorEmail', 'Vendor has no email address — order marked sent, print it instead.'), { type: 'warning' }) }} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"><Mail size={12} /> {t('purchase.emailVendor', 'Email vendor')}</button>
              ) : null}
              {selPo.status === 'draft' ? (
                <button type="button" onClick={sendOrder} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"><Send size={12} /> {t('purchase.action.send', 'Send')}</button>
              ) : null}
              {selPo.status === 'sent' ? (
                <button type="button" onClick={() => setStatus('confirmed')} className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"><Check size={12} /> {t('purchase.action.confirm', 'Confirm')}</button>
              ) : null}
              {canReceive ? (
                <button type="button" onClick={() => commit(() => lines.forEach((l) => (l.receivedQty ?? 0) < l.qty && receivePurchaseOrderLine(db, l.id)))} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"><Truck size={12} /> {t('purchase.action.receiveAll', 'Receive all')}</button>
              ) : null}
              {selPo.status === 'received' ? (
                <button type="button" onClick={() => setStatus('closed')} className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800">{t('purchase.action.close', 'Close')}</button>
              ) : null}
              {['draft', 'sent', 'confirmed'].includes(selPo.status) && nothingReceived ? (
                <button type="button" onClick={() => setStatus('cancelled')} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"><X size={12} /> {t('purchase.action.cancel', 'Cancel')}</button>
              ) : null}
            </div>
          </div>

          <table className="mt-4 min-w-full divide-y divide-slate-200 text-sm">
            <thead className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 pr-3">{t('purchase.colItem', 'Item')}</th>
                <th className="py-2 pr-3">{t('purchase.colQty', 'Qty')}</th>
                <th className="py-2 pr-3">{t('purchase.colUnitPrice', 'Unit price')}</th>
                <th className="py-2 pr-3">{t('purchase.colDiscount', 'Discount')}</th>
                <th className="py-2 pr-3">{t('purchase.colAmount', 'Amount')}</th>
                <th className="py-2 pr-3">{t('purchase.colReceived', 'Received')}</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map((l) => {
                const done = (l.receivedQty ?? 0) >= l.qty
                return (
                  <tr key={l.id}>
                    <td className="py-2 pr-3 font-medium text-slate-800">{lineLabel(l)}</td>
                    <td className="py-2 pr-3 text-slate-600">{groupAmount(l.qty)} {l.uom ?? ''}</td>
                    <td className="py-2 pr-3 text-slate-600">{groupAmount(l.unitCost)} {selPo.currency ?? currency}</td>
                    <td className="py-2 pr-3 text-slate-600">{l.discountPercent ? `${l.discountPercent}%` : '—'}</td>
                    <td className="py-2 pr-3 font-medium text-slate-800">{groupAmount(poLineAmount(l))}</td>
                    <td className="py-2 pr-3">
                      {done
                        ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">{l.receivedAt}</span>
                        : (l.receivedQty ?? 0) > 0
                          ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">{groupAmount(l.receivedQty)} / {groupAmount(l.qty)}</span>
                          : <span className="text-[11px] text-slate-400">—</span>}
                    </td>
                    <td className="py-2 text-right">
                      {canReceive && !done ? (
                        <button type="button" onClick={() => commit(() => receivePurchaseOrderLine(db, l.id))} className="rounded-lg border border-emerald-200 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50">{t('purchase.action.receive', 'Receive')}</button>
                      ) : selPo.status === 'draft' ? (
                        <button type="button" onClick={() => commit(() => removePurchaseOrderLine(db, l.id))} className="rounded-md p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-600" title={t('common.remove')}><Trash2 size={13} /></button>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="mt-3 text-right text-sm font-semibold text-slate-900">
            {t('purchase.total', 'Total')}: {groupAmount(total)} {selPo.currency ?? currency}
          </p>
          {selPo.notes ? <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{selPo.notes}</p> : null}
        </section>
      </div>
    )
  }

  // ── List + create form ──────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{t('purchase.poTitle')}</h3>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-slate-200">
            <button type="button" onClick={() => setView('list')} title={t('purchase.view.list', 'List')}
              className={`px-2 py-1.5 ${view === 'list' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
              <List size={14} />
            </button>
            <button type="button" onClick={() => setView('board')} title={t('purchase.view.board', 'Board')}
              className={`px-2 py-1.5 ${view === 'board' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
              <Columns3 size={14} />
            </button>
          </div>
          <button type="button" onClick={() => setCreating((v) => !v)} className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
            <Plus size={13} /> {t('purchase.newOrder', 'New order')}
          </button>
        </div>
      </div>

      {creating ? (
        <section className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className={labelCls}>
              {t('purchase.colVendor')} *
              <select className={inputCls} value={form.vendorId} onChange={(e) => setForm((f) => ({ ...f, vendorId: e.target.value }))}>
                <option value="">—</option>
                {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </label>
            <div className={labelCls}>
              {t('purchase.expected', 'Expected')}
              <DatePicker className="mt-1" value={form.expectedAt} onChange={(iso) => setForm((f) => ({ ...f, expectedAt: iso }))} />
            </div>
            <label className={labelCls}>
              {t('purchase.notes', 'Notes')}
              <input className={inputCls} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </label>
          </div>
          <div className="space-y-2">
            {form.lines.map((l, i) => (
              <div key={i} className="grid grid-cols-2 items-end gap-2 md:grid-cols-[2fr_2fr_90px_110px_90px_auto]">
                <label className={labelCls}>
                  {t('purchase.material', 'Material')}
                  <select className={inputCls} value={l.materialId} onChange={(e) => setLine(i, { materialId: e.target.value })}>
                    <option value="">{t('purchase.freeText', 'Free text…')}</option>
                    {materials.map((m) => <option key={m.id} value={m.id}>{m.sku} — {m.name}</option>)}
                  </select>
                </label>
                <label className={labelCls}>
                  {t('purchase.description', 'Description')}
                  <input className={inputCls} value={l.description} disabled={!!l.materialId} onChange={(e) => setLine(i, { description: e.target.value })} />
                </label>
                <label className={labelCls}>
                  {t('purchase.colQty', 'Qty')}
                  <input type="number" min={0} step="any" className={inputCls} value={l.qty} onChange={(e) => setLine(i, { qty: e.target.value })} />
                </label>
                <label className={labelCls}>
                  {t('purchase.colUnitPrice', 'Unit price')}
                  <input type="number" min={0} step="any" className={inputCls} value={l.unitCost} onChange={(e) => setLine(i, { unitCost: e.target.value })} />
                </label>
                <label className={labelCls}>
                  {t('purchase.colDiscount', 'Discount')} %
                  <input type="number" min={0} max={100} step="any" className={inputCls} value={l.discountPercent} onChange={(e) => setLine(i, { discountPercent: e.target.value })} />
                </label>
                <button type="button" onClick={() => setForm((f) => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }))} disabled={form.lines.length === 1} className="mb-1 rounded-md p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"><Trash2 size={14} /></button>
              </div>
            ))}
            <button type="button" onClick={() => setForm((f) => ({ ...f, lines: [...f.lines, emptyLine()] }))} className="text-xs font-medium text-blue-700 hover:text-blue-900">+ {t('purchase.addLine', 'Add line')}</button>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setCreating(false)} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">{t('common.cancel')}</button>
            <button type="button" onClick={createOrder} disabled={!form.vendorId} className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{t('purchase.createOrder', 'Create order')}</button>
          </div>
        </section>
      ) : null}

      {view === 'board' ? (
        <OrdersBoard db={db} commit={commit} currency={currency} onOpen={(id) => setSelId(id)} />
      ) : (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <SortTh label={t('purchase.colPO')} k="no" sort={sort} onSort={(k) => setSort((s0) => toggleSort(s0, k))} />
              <SortTh label={t('purchase.colVendor')} k="vendor" sort={sort} onSort={(k) => setSort((s0) => toggleSort(s0, k))} />
              <SortTh label={t('purchase.colOrdered')} k="orderedAt" sort={sort} onSort={(k) => setSort((s0) => toggleSort(s0, k))} />
              <SortTh label={t('purchase.expected', 'Expected')} k="expectedAt" sort={sort} onSort={(k) => setSort((s0) => toggleSort(s0, k))} />
              <SortTh label={t('common.status')} k="status" sort={sort} onSort={(k) => setSort((s0) => toggleSort(s0, k))} />
              <SortTh label={t('purchase.total', 'Total')} k="total" sort={sort} onSort={(k) => setSort((s0) => toggleSort(s0, k))} align="right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortRows(
              selectPurchaseOrdersSorted(db).map((po) => ({
                po,
                vendorName: selectVendorById(db, po.vendorId)?.name ?? po.vendorId,
                total: selectPurchaseOrderTotal(db, po.id),
              })),
              sort,
              {
                no: (r) => r.po.no ?? r.po.id,
                vendor: (r) => r.vendorName,
                orderedAt: (r) => r.po.orderedAt,
                expectedAt: (r) => r.po.expectedAt ?? '',
                status: (r) => r.po.status,
                total: (r) => r.total,
              },
            ).map(({ po, vendorName, total }) => (
              <tr key={po.id} className="cursor-pointer hover:bg-slate-50/80" onClick={() => setSelId(po.id)}>
                <td className="px-4 py-3 font-medium text-slate-900">{po.no ?? po.id}</td>
                <td className="px-4 py-3 text-slate-600">{vendorName}</td>
                <td className="px-4 py-3 text-slate-600">{po.orderedAt}</td>
                <td className="px-4 py-3 text-slate-600">{po.expectedAt ?? '—'}</td>
                <td className="px-4 py-3"><PoStatusBadge status={po.status} /></td>
                <td className="px-4 py-3 text-right font-medium text-slate-800">{groupAmount(total)} {po.currency ?? currency}</td>
              </tr>
            ))}
            {(db.purchaseOrders ?? []).length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-xs text-slate-400">{t('purchase.noOrders', 'No purchase orders yet.')}</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
      )}
    </div>
  )
}
