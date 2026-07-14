import { useState } from 'react'
import { ArrowLeft, Award, Plus, Send, ShoppingCart, Trash2 } from 'lucide-react'
import { useLanguage } from '../../../i18n/useLanguage.js'
import { groupAmount } from '../../../lib/money.js'
import DatePicker from '../../DatePicker.jsx'
import { inputCls, labelCls } from './shared.jsx'
import {
  appendRfq,
  appendVendorQuote,
  createOrderFromQuote,
  patchRfq,
  removeRfq,
  removeVendorQuote,
} from '../../../domains/purchase/mutations.js'
import { compareQuotesForRfq, selectRfqsSorted, selectVendorById } from '../../../domains/purchase/selectors.js'
import { useToast } from '../../ui/feedbackContext.js'

const RFQ_INIT = { itemName: '', materialId: '', qty: '', uom: '', neededBy: '', notes: '', vendorIds: /** @type {string[]} */ ([]) }
const QUOTE_INIT = { vendorId: '', unitPrice: '', leadTimeDays: '', validUntil: '', note: '' }

const RFQ_STATUS_STYLE = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
  closed: 'bg-slate-200 text-slate-700',
}

/** Request-for-quotation workflow: ask several vendors, log replies, compare, order. */
export default function RfqTab({ db, commit, currency, actorId }) {
  const { t } = useLanguage()
  const toast = useToast()
  const [selId, setSelId] = useState(/** @type {string | null} */ (null))
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(RFQ_INIT)
  const [quoteForm, setQuoteForm] = useState(QUOTE_INIT)
  const [vendorFilter, setVendorFilter] = useState('')

  const vendors = [...(db.vendors ?? [])].sort((a, b) => a.name.localeCompare(b.name))
  const materials = db.materials ?? []
  const rfqs = selectRfqsSorted(db)
  const rfq = selId ? rfqs.find((r) => r.id === selId) : null

  function createRfq() {
    const itemName = form.materialId
      ? (materials.find((m) => m.id === form.materialId)?.name ?? form.itemName)
      : form.itemName
    if (!itemName.trim() || form.vendorIds.length === 0) return
    let created = null
    commit(() => {
      created = appendRfq(db, {
        itemName,
        materialId: form.materialId || undefined,
        qty: Number(form.qty) || undefined,
        uom: form.uom.trim() || (form.materialId ? materials.find((m) => m.id === form.materialId)?.uom : undefined),
        neededBy: form.neededBy || undefined,
        notes: form.notes.trim() || undefined,
        vendorIds: form.vendorIds,
        createdById: actorId,
      })
    })
    setForm(RFQ_INIT)
    setCreating(false)
    if (created) setSelId(created.id)
  }

  function addQuote() {
    if (!rfq || !quoteForm.vendorId || !(Number(quoteForm.unitPrice) > 0)) return
    commit(() => appendVendorQuote(db, {
      vendorId: quoteForm.vendorId,
      materialId: rfq.materialId,
      itemName: rfq.itemName,
      qty: rfq.qty,
      unitPrice: Number(quoteForm.unitPrice),
      currency,
      leadTimeDays: Number(quoteForm.leadTimeDays) || undefined,
      validUntil: quoteForm.validUntil || undefined,
      note: quoteForm.note.trim() || undefined,
      rfqId: rfq.id,
    }))
    setQuoteForm(QUOTE_INIT)
  }

  function orderFromQuote(quoteId) {
    let po = null
    commit(() => { po = createOrderFromQuote(db, quoteId, { currency, createdById: actorId }) })
    if (po) toast(`${t('purchase.orderCreated', 'Draft order created:')} ${po.no ?? po.id} — ${t('purchase.seeOrdersTab', 'see the Orders tab.')}`)
  }

  // ── Detail ──────────────────────────────────────────────────────────────
  if (rfq) {
    const rows = compareQuotesForRfq(db, rfq.id)
    const quotedVendorIds = new Set(rows.map((r) => r.vendorId))
    const waiting = rfq.vendorIds.filter((id) => !quotedVendorIds.has(id))
    const worst = rows.length > 1 ? Math.max(...rows.map((r) => r.effectivePrice)) : null
    return (
      <div className="space-y-4">
        <button type="button" onClick={() => setSelId(null)} className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900">
          <ArrowLeft size={13} /> {t('purchase.backToRfqs', 'All RFQs')}
        </button>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">{rfq.no ?? rfq.id} · {rfq.itemName}</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {rfq.qty ? <>{t('purchase.colQty', 'Qty')}: {groupAmount(rfq.qty)} {rfq.uom ?? ''} · </> : null}
                {rfq.neededBy ? <>{t('purchase.neededBy', 'Needed by')}: {rfq.neededBy} · </> : null}
                {t('purchase.vendorsAsked', 'Vendors asked')}: {rfq.vendorIds.length}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${RFQ_STATUS_STYLE[rfq.status]}`}>{t(`purchase.rfqStatus.${rfq.status}`, rfq.status)}</span>
              {rfq.status === 'draft' ? (
                <button type="button" onClick={() => commit(() => patchRfq(db, rfq.id, { status: 'sent', sentAt: new Date().toISOString() }))} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"><Send size={12} /> {t('purchase.action.send', 'Send')}</button>
              ) : null}
              {rfq.status === 'sent' ? (
                <button type="button" onClick={() => commit(() => patchRfq(db, rfq.id, { status: 'closed' }))} className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800">{t('purchase.action.close', 'Close')}</button>
              ) : null}
            </div>
          </div>
          {rfq.notes ? <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{rfq.notes}</p> : null}
          {waiting.length > 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              {t('purchase.awaitingFrom', 'Awaiting replies from')}: {waiting.map((id) => selectVendorById(db, id)?.name ?? id).join(', ')}
            </p>
          ) : null}
        </section>

        {/* Log a reply */}
        {rfq.status !== 'closed' ? (
          <section className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
            <p className="text-xs font-semibold text-slate-700">{t('purchase.logReply', 'Log a vendor reply')}</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <label className={labelCls}>
                {t('purchase.colVendor')} *
                <select className={inputCls} value={quoteForm.vendorId} onChange={(e) => setQuoteForm((f) => ({ ...f, vendorId: e.target.value }))}>
                  <option value="">—</option>
                  {rfq.vendorIds.map((id) => <option key={id} value={id}>{selectVendorById(db, id)?.name ?? id}</option>)}
                </select>
              </label>
              <label className={labelCls}>
                {t('purchase.colUnitPrice', 'Unit price')} * ({currency})
                <input type="number" min={0} step="any" className={inputCls} value={quoteForm.unitPrice} onChange={(e) => setQuoteForm((f) => ({ ...f, unitPrice: e.target.value }))} />
              </label>
              <label className={labelCls}>
                {t('purchase.leadTime', 'Lead time (days)')}
                <input type="number" min={0} className={inputCls} value={quoteForm.leadTimeDays} onChange={(e) => setQuoteForm((f) => ({ ...f, leadTimeDays: e.target.value }))} />
              </label>
              <div className={labelCls}>
                {t('purchase.quoteValidUntil', 'Quote valid until')}
                <DatePicker className="mt-1" value={quoteForm.validUntil} onChange={(iso) => setQuoteForm((f) => ({ ...f, validUntil: iso }))} />
              </div>
              <label className={labelCls}>
                {t('purchase.notes', 'Notes')}
                <input className={inputCls} value={quoteForm.note} onChange={(e) => setQuoteForm((f) => ({ ...f, note: e.target.value }))} />
              </label>
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={addQuote} disabled={!quoteForm.vendorId || !(Number(quoteForm.unitPrice) > 0)} className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{t('common.add', 'Add')}</button>
            </div>
          </section>
        ) : null}

        {/* Comparison */}
        {rows.length ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">{t('purchase.colVendor')}</th>
                  <th className="px-4 py-3 text-right">{t('purchase.colUnitPrice', 'Unit price')}</th>
                  <th className="px-4 py-3 text-right">{t('purchase.colDiscount', 'Discount')}</th>
                  <th className="px-4 py-3 text-right">{t('purchase.effectivePrice', 'Effective price')}</th>
                  <th className="px-4 py-3">{t('purchase.leadTime', 'Lead time (days)')}</th>
                  <th className="px-4 py-3">{t('purchase.quoteValidUntil', 'Quote valid until')}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, i) => {
                  const best = i === 0 && rows.length > 1
                  const saving = best && worst > 0 ? Math.round((1 - r.effectivePrice / worst) * 100) : 0
                  return (
                    <tr key={r.id} className={`group ${best ? 'bg-emerald-50/60' : ''} ${r.expired ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {selectVendorById(db, r.vendorId)?.name ?? r.vendorId}
                        {best ? <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"><Award size={11} /> {t('purchase.bestPrice', 'Best price')}{saving > 0 ? ` · −${saving}%` : ''}</span> : null}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">{groupAmount(r.unitPrice)} {r.currency ?? currency}</td>
                      <td className="px-4 py-3 text-right text-emerald-700">{r.discountPercent ? `−${r.discountPercent}%` : '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">{groupAmount(r.effectivePrice)} {r.currency ?? currency}</td>
                      <td className="px-4 py-3 text-slate-600">{r.leadTimeDays ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{r.validUntil ?? '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1">
                          <button type="button" onClick={() => orderFromQuote(r.id)} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-50"><ShoppingCart size={11} /> {t('purchase.createOrderFromQuote', 'Create order')}</button>
                          <button type="button" onClick={() => commit(() => removeVendorQuote(db, r.id))} className="rounded-md p-1 text-slate-300 opacity-0 transition-opacity hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100" title={t('common.remove')}><Trash2 size={13} /></button>
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-400">{t('purchase.noReplies', 'No replies logged yet.')}</p>
        )}
      </div>
    )
  }

  // ── List + create ───────────────────────────────────────────────────────
  const filteredVendors = vendorFilter.trim()
    ? vendors.filter((v) => v.name.toLowerCase().includes(vendorFilter.trim().toLowerCase()))
    : vendors

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{t('purchase.rfqTitle', 'Requests for quotation')}</h3>
        <button type="button" onClick={() => setCreating((v) => !v)} className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
          <Plus size={13} /> {t('purchase.newRfq', 'New RFQ')}
        </button>
      </div>

      {creating ? (
        <section className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className={labelCls}>
              {t('purchase.material', 'Material')}
              <select className={inputCls} value={form.materialId} onChange={(e) => setForm((f) => ({ ...f, materialId: e.target.value }))}>
                <option value="">{t('purchase.freeText', 'Free text…')}</option>
                {materials.map((m) => <option key={m.id} value={m.id}>{m.sku} — {m.name}</option>)}
              </select>
            </label>
            <label className={labelCls}>
              {t('purchase.colItem', 'Item')} {form.materialId ? '' : '*'}
              <input className={inputCls} value={form.itemName} disabled={!!form.materialId} onChange={(e) => setForm((f) => ({ ...f, itemName: e.target.value }))} />
            </label>
            <label className={labelCls}>
              {t('purchase.colQty', 'Qty')}
              <input type="number" min={0} step="any" className={inputCls} value={form.qty} onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))} />
            </label>
            <div className={labelCls}>
              {t('purchase.neededBy', 'Needed by')}
              <DatePicker className="mt-1" value={form.neededBy} onChange={(iso) => setForm((f) => ({ ...f, neededBy: iso }))} />
            </div>
            <label className={`${labelCls} md:col-span-2`}>
              {t('purchase.notes', 'Notes')}
              <input className={inputCls} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </label>
          </div>
          <div>
            <p className={labelCls}>{t('purchase.selectVendors', 'Vendors to ask')} * ({form.vendorIds.length})</p>
            <input className={`${inputCls} max-w-xs`} placeholder={t('purchase.searchVendors', 'Search vendors…')} value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)} />
            <div className="mt-2 grid max-h-44 grid-cols-1 gap-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 sm:grid-cols-2 lg:grid-cols-3">
              {filteredVendors.map((v) => {
                const on = form.vendorIds.includes(v.id)
                return (
                  <label key={v.id} className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-xs ${on ? 'bg-blue-50 text-blue-800' : 'text-slate-700 hover:bg-slate-50'}`}>
                    <input type="checkbox" checked={on} onChange={() => setForm((f) => ({ ...f, vendorIds: on ? f.vendorIds.filter((id) => id !== v.id) : [...f.vendorIds, v.id] }))} />
                    <span className="truncate">{v.name}</span>
                  </label>
                )
              })}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setCreating(false)} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">{t('common.cancel')}</button>
            <button type="button" onClick={createRfq} disabled={form.vendorIds.length === 0 || (!form.materialId && !form.itemName.trim())} className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{t('purchase.createRfq', 'Create RFQ')}</button>
          </div>
        </section>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">{t('purchase.colRfq', 'RFQ')}</th>
              <th className="px-4 py-3">{t('purchase.colItem', 'Item')}</th>
              <th className="px-4 py-3">{t('purchase.colQty', 'Qty')}</th>
              <th className="px-4 py-3">{t('purchase.neededBy', 'Needed by')}</th>
              <th className="px-4 py-3">{t('purchase.vendorsAsked', 'Vendors asked')}</th>
              <th className="px-4 py-3">{t('purchase.replies', 'Replies')}</th>
              <th className="px-4 py-3">{t('common.status')}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rfqs.map((r) => {
              const replies = compareQuotesForRfq(db, r.id).length
              return (
                <tr key={r.id} className="group cursor-pointer hover:bg-slate-50/80" onClick={() => setSelId(r.id)}>
                  <td className="px-4 py-3 font-medium text-slate-900">{r.no ?? r.id}</td>
                  <td className="px-4 py-3 text-slate-700">{r.itemName}</td>
                  <td className="px-4 py-3 text-slate-600">{r.qty ? `${groupAmount(r.qty)} ${r.uom ?? ''}` : '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{r.neededBy ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{r.vendorIds.length}</td>
                  <td className="px-4 py-3 text-slate-600">{replies}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${RFQ_STATUS_STYLE[r.status]}`}>{t(`purchase.rfqStatus.${r.status}`, r.status)}</span></td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={(e) => { e.stopPropagation(); commit(() => removeRfq(db, r.id)) }} className="rounded-md p-1 text-slate-300 opacity-0 transition-opacity hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100" title={t('common.remove')}><Trash2 size={13} /></button>
                  </td>
                </tr>
              )
            })}
            {rfqs.length === 0 ? <tr><td colSpan={8} className="px-4 py-6 text-center text-xs text-slate-400">{t('purchase.noRfqs', 'No RFQs yet — create one and pick the vendors to ask.')}</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
