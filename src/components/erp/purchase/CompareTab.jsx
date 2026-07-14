import { useState } from 'react'
import { Award, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { useLanguage } from '../../../i18n/useLanguage.js'
import { groupAmount } from '../../../lib/money.js'
import DatePicker from '../../DatePicker.jsx'
import { inputCls, labelCls } from './shared.jsx'
import { appendVendorQuote, createOrderFromQuote, removeVendorQuote } from '../../../domains/purchase/mutations.js'
import { compareQuotesForItem, selectQuoteItems, selectVendorById } from '../../../domains/purchase/selectors.js'
import { useToast } from '../../ui/feedbackContext.js'

const QUOTE_INIT = { vendorId: '', itemName: '', materialId: '', qty: '', unitPrice: '', leadTimeDays: '', validUntil: '', note: '' }

/** Side-by-side comparison of vendor quotes for the same item. */
export default function CompareTab({ db, commit, currency, actorId }) {
  const { t } = useLanguage()
  const toast = useToast()
  const items = selectQuoteItems(db)
  const [selItem, setSelItem] = useState(/** @type {string | null} */ (items[0] ?? null))
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(QUOTE_INIT)

  function orderFromQuote(quoteId) {
    let po = null
    commit(() => { po = createOrderFromQuote(db, quoteId, { currency, createdById: actorId }) })
    if (po) toast(`${t('purchase.orderCreated', 'Draft order created:')} ${po.no ?? po.id} — ${t('purchase.seeOrdersTab', 'see the Orders tab.')}`)
  }

  const vendors = [...(db.vendors ?? [])].sort((a, b) => a.name.localeCompare(b.name))
  const materials = db.materials ?? []
  const activeItem = selItem && items.includes(selItem) ? selItem : (items[0] ?? null)
  const rows = activeItem ? compareQuotesForItem(db, activeItem) : []
  const worst = rows.length > 1 ? Math.max(...rows.map((r) => r.effectivePrice)) : null

  function saveQuote() {
    const itemName = form.materialId
      ? (materials.find((m) => m.id === form.materialId)?.name ?? form.itemName)
      : form.itemName
    if (!form.vendorId || !itemName.trim() || !(Number(form.unitPrice) > 0)) return
    commit(() => appendVendorQuote(db, {
      vendorId: form.vendorId,
      materialId: form.materialId || undefined,
      itemName,
      qty: Number(form.qty) || undefined,
      unitPrice: Number(form.unitPrice),
      currency,
      leadTimeDays: Number(form.leadTimeDays) || undefined,
      validUntil: form.validUntil || undefined,
      note: form.note.trim() || undefined,
    }))
    setSelItem(itemName.trim())
    setForm(QUOTE_INIT)
    setAdding(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-900">{t('purchase.compareTitle', 'Compare vendor offers')}</h3>
          {items.length > 0 ? (
            <select className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm" value={activeItem ?? ''} onChange={(e) => setSelItem(e.target.value)}>
              {items.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          ) : null}
        </div>
        <button type="button" onClick={() => setAdding((v) => !v)} className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
          <Plus size={13} /> {t('purchase.addQuote', 'Add quote')}
        </button>
      </div>

      {adding ? (
        <div className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className={labelCls}>
              {t('purchase.colVendor')} *
              <select className={inputCls} value={form.vendorId} onChange={(e) => setForm((f) => ({ ...f, vendorId: e.target.value }))}>
                <option value="">—</option>
                {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </label>
            <label className={labelCls}>
              {t('purchase.material', 'Material')}
              <select className={inputCls} value={form.materialId} onChange={(e) => setForm((f) => ({ ...f, materialId: e.target.value }))}>
                <option value="">{t('purchase.freeText', 'Free text…')}</option>
                {materials.map((m) => <option key={m.id} value={m.id}>{m.sku} — {m.name}</option>)}
              </select>
            </label>
            <label className={labelCls}>
              {t('purchase.compareItem', 'Item (same name to compare)')} {form.materialId ? '' : '*'}
              <input list="cmp-items" className={inputCls} value={form.itemName} disabled={!!form.materialId} onChange={(e) => setForm((f) => ({ ...f, itemName: e.target.value }))} />
              <datalist id="cmp-items">{items.map((n) => <option key={n} value={n} />)}</datalist>
            </label>
            <label className={labelCls}>
              {t('purchase.colQty', 'Qty')}
              <input type="number" min={0} step="any" className={inputCls} value={form.qty} onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))} />
            </label>
            <label className={labelCls}>
              {t('purchase.colUnitPrice', 'Unit price')} * ({currency})
              <input type="number" min={0} step="any" className={inputCls} value={form.unitPrice} onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))} />
            </label>
            <label className={labelCls}>
              {t('purchase.leadTime', 'Lead time (days)')}
              <input type="number" min={0} className={inputCls} value={form.leadTimeDays} onChange={(e) => setForm((f) => ({ ...f, leadTimeDays: e.target.value }))} />
            </label>
            <div className={labelCls}>
              {t('purchase.quoteValidUntil', 'Quote valid until')}
              <DatePicker className="mt-1" value={form.validUntil} onChange={(iso) => setForm((f) => ({ ...f, validUntil: iso }))} />
            </div>
            <label className={`${labelCls} md:col-span-2`}>
              {t('purchase.notes', 'Notes')}
              <input className={inputCls} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setAdding(false)} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">{t('common.cancel')}</button>
            <button type="button" onClick={saveQuote} disabled={!form.vendorId || !(Number(form.unitPrice) > 0) || (!form.materialId && !form.itemName.trim())} className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{t('common.add', 'Add')}</button>
          </div>
        </div>
      ) : null}

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
                <th className="px-4 py-3">{t('purchase.notes', 'Notes')}</th>
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
                      {best ? (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          <Award size={11} /> {t('purchase.bestPrice', 'Best price')}{saving > 0 ? ` · −${saving}%` : ''}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{groupAmount(r.unitPrice)} {r.currency ?? currency}</td>
                    <td className="px-4 py-3 text-right text-emerald-700">{r.discountPercent ? `−${r.discountPercent}%` : '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{groupAmount(r.effectivePrice)} {r.currency ?? currency}</td>
                    <td className="px-4 py-3 text-slate-600">{r.leadTimeDays ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {r.validUntil ?? '—'}
                      {r.expired ? <span className="ml-1 rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-600">{t('purchase.contract.expired', 'expired')}</span> : null}
                    </td>
                    <td className="max-w-[16rem] truncate px-4 py-3 text-xs text-slate-500">{r.note ?? ''}</td>
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
        <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-xs text-slate-400">
          {t('purchase.noQuotes', 'Add quotes from two or more vendors for the same item to compare them side by side.')}
        </p>
      )}
    </div>
  )
}
