import { useRef, useState } from 'react'
import { Paperclip, Plus, Trash2, TriangleAlert } from 'lucide-react'
import { useLanguage } from '../../../i18n/useLanguage.js'
import { groupAmount } from '../../../lib/money.js'
import DatePicker from '../../DatePicker.jsx'
import { ContractStatusBadge, inputCls, labelCls } from './shared.jsx'
import { useToast } from '../../ui/feedbackContext.js'
import {
  appendVendorContract,
  appendVendorDiscount,
  removeVendorContract,
  removeVendorDiscount,
} from '../../../domains/purchase/mutations.js'
import {
  contractStatus,
  discountIsActive,
  selectAllContracts,
  selectAllDiscounts,
  selectVendorById,
} from '../../../domains/purchase/selectors.js'

const CONTRACT_INIT = { vendorId: '', title: '', refNo: '', validFrom: '', validTo: '', discountPercent: '', terms: '' }
const DISCOUNT_INIT = { vendorId: '', materialId: '', scope: '', percent: '', minQty: '', validTo: '', note: '' }

/** Signed vendor contracts (with validity) + special negotiated discounts. */
export default function ContractsTab({ db, commit }) {
  const { t } = useLanguage()
  const toast = useToast()
  const [addingContract, setAddingContract] = useState(false)
  const [contractForm, setContractForm] = useState(CONTRACT_INIT)
  const [addingDiscount, setAddingDiscount] = useState(false)
  const [discountForm, setDiscountForm] = useState(DISCOUNT_INIT)
  const [savingContract, setSavingContract] = useState(false)
  const contractFileRef = useRef(/** @type {HTMLInputElement | null} */ (null))

  const vendors = [...(db.vendors ?? [])].sort((a, b) => a.name.localeCompare(b.name))
  const materials = db.materials ?? []
  const contracts = selectAllContracts(db)
  const discounts = selectAllDiscounts(db)
  const expiring = contracts.filter((c) => contractStatus(c) === 'expiring')

  async function saveContract() {
    if (!contractForm.vendorId || !contractForm.title.trim() || savingContract) return
    setSavingContract(true)
    try {
      // Optional scanned contract file → shared file storage, linked by id.
      let fileId, fileName
      const file = contractFileRef.current?.files?.[0]
      if (file) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('folder', 'Contracts')
        const meta = await fetch('/api/files', { method: 'POST', body: fd })
          .then((r) => (r.ok ? r.json() : null)).catch(() => null)
        if (meta?.id) { fileId = meta.id; fileName = meta.name }
      }
      commit(() => appendVendorContract(db, {
        vendorId: contractForm.vendorId,
        title: contractForm.title,
        refNo: contractForm.refNo.trim() || undefined,
        validFrom: contractForm.validFrom || undefined,
        validTo: contractForm.validTo || undefined,
        discountPercent: Number(contractForm.discountPercent) || 0,
        terms: contractForm.terms.trim() || undefined,
        fileId,
        fileName,
      }))
      setContractForm(CONTRACT_INIT)
      if (contractFileRef.current) contractFileRef.current.value = ''
      setAddingContract(false)
      toast(t('purchase.contractAdded', 'Contract added.'))
    } finally {
      setSavingContract(false)
    }
  }

  function saveDiscount() {
    if (!discountForm.vendorId || !(Number(discountForm.percent) > 0)) return
    commit(() => appendVendorDiscount(db, {
      vendorId: discountForm.vendorId,
      materialId: discountForm.materialId || undefined,
      scope: discountForm.materialId ? undefined : (discountForm.scope.trim() || undefined),
      percent: Number(discountForm.percent),
      minQty: Number(discountForm.minQty) || undefined,
      validTo: discountForm.validTo || undefined,
      note: discountForm.note.trim() || undefined,
    }))
    setDiscountForm(DISCOUNT_INIT)
    setAddingDiscount(false)
    toast(t('purchase.discountAdded', 'Discount added.'))
  }

  return (
    <div className="space-y-6">
      {expiring.length > 0 ? (
        <p className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 ring-1 ring-amber-100">
          <TriangleAlert size={14} />
          {t('purchase.expiringWarning', 'Contracts expiring within 30 days:')}{' '}
          {expiring.map((c) => `${selectVendorById(db, c.vendorId)?.name} — ${c.title} (${c.validTo})`).join('; ')}
        </p>
      ) : null}

      {/* Contracts */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">{t('purchase.contracts', 'Contracts')}</h3>
          <button type="button" onClick={() => setAddingContract((v) => !v)} className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
            <Plus size={13} /> {t('purchase.addContract', 'Add contract')}
          </button>
        </div>
        {addingContract ? (
          <div className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <label className={labelCls}>
                {t('purchase.colVendor')} *
                <select className={inputCls} value={contractForm.vendorId} onChange={(e) => setContractForm((f) => ({ ...f, vendorId: e.target.value }))}>
                  <option value="">—</option>
                  {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </label>
              <label className={labelCls}>
                {t('purchase.contractTitle', 'Title')} *
                <input className={inputCls} value={contractForm.title} onChange={(e) => setContractForm((f) => ({ ...f, title: e.target.value }))} placeholder={t('purchase.contractTitle.ph', 'Frame agreement 2026')} />
              </label>
              <label className={labelCls}>
                {t('purchase.refNo', 'Reference №')}
                <input className={inputCls} value={contractForm.refNo} onChange={(e) => setContractForm((f) => ({ ...f, refNo: e.target.value }))} />
              </label>
              <div className={labelCls}>
                {t('purchase.validFrom', 'Valid from')}
                <DatePicker className="mt-1" value={contractForm.validFrom} onChange={(iso) => setContractForm((f) => ({ ...f, validFrom: iso }))} />
              </div>
              <div className={labelCls}>
                {t('purchase.validTo', 'Valid to')}
                <DatePicker className="mt-1" value={contractForm.validTo} onChange={(iso) => setContractForm((f) => ({ ...f, validTo: iso }))} />
              </div>
              <label className={labelCls}>
                {t('purchase.colDiscount', 'Discount')} %
                <input type="number" min={0} max={100} step="any" className={inputCls} value={contractForm.discountPercent} onChange={(e) => setContractForm((f) => ({ ...f, discountPercent: e.target.value }))} />
              </label>
            </div>
            <label className={`${labelCls} block`}>
              {t('purchase.terms', 'Terms')}
              <textarea rows={2} className={inputCls} value={contractForm.terms} onChange={(e) => setContractForm((f) => ({ ...f, terms: e.target.value }))} placeholder={t('purchase.terms.ph', 'Payment 30 days net, DAP Sofia…')} />
            </label>
            <label className={`${labelCls} block`}>
              {t('purchase.contractFile', 'Scanned contract (optional)')}
              <input ref={contractFileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" className="mt-1 block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200" />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setAddingContract(false)} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">{t('common.cancel')}</button>
              <button type="button" onClick={saveContract} disabled={savingContract || !contractForm.vendorId || !contractForm.title.trim()} className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{savingContract ? t('purchase.uploading', 'Uploading…') : t('common.add', 'Add')}</button>
            </div>
          </div>
        ) : null}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">{t('purchase.colVendor')}</th>
                <th className="px-4 py-3">{t('purchase.contractTitle', 'Title')}</th>
                <th className="px-4 py-3">{t('purchase.validity', 'Validity')}</th>
                <th className="px-4 py-3">{t('purchase.colDiscount', 'Discount')}</th>
                <th className="px-4 py-3">{t('common.status')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contracts.map((c) => (
                <tr key={c.id} className="group">
                  <td className="px-4 py-3 font-medium text-slate-900">{selectVendorById(db, c.vendorId)?.name ?? c.vendorId}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {c.title}{c.refNo ? <span className="ml-1 text-xs text-slate-400">({c.refNo})</span> : null}
                    {c.fileId ? (
                      <a href={`/api/files/${c.fileId}`} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 hover:text-blue-900">
                        <Paperclip size={11} /> {c.fileName ?? t('purchase.contractFile', 'Scanned contract')}
                      </a>
                    ) : null}
                    {c.terms ? <p className="mt-0.5 max-w-md truncate text-[11px] text-slate-400">{c.terms}</p> : null}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{[c.validFrom, c.validTo].filter(Boolean).join(' → ') || '—'}</td>
                  <td className="px-4 py-3 text-emerald-700">{c.discountPercent ? `−${c.discountPercent}%` : '—'}</td>
                  <td className="px-4 py-3"><ContractStatusBadge status={contractStatus(c)} /></td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => commit(() => removeVendorContract(db, c.id))} className="rounded-md p-1 text-slate-300 opacity-0 transition-opacity hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100" title={t('common.remove')}><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
              {contracts.length === 0 ? <tr><td colSpan={6} className="px-4 py-6 text-center text-xs text-slate-400">{t('purchase.noContracts', 'No contracts recorded.')}</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* Special discounts */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">{t('purchase.discounts', 'Special discounts')}</h3>
          <button type="button" onClick={() => setAddingDiscount((v) => !v)} className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
            <Plus size={13} /> {t('purchase.addDiscount', 'Add discount')}
          </button>
        </div>
        {addingDiscount ? (
          <div className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <label className={labelCls}>
                {t('purchase.colVendor')} *
                <select className={inputCls} value={discountForm.vendorId} onChange={(e) => setDiscountForm((f) => ({ ...f, vendorId: e.target.value }))}>
                  <option value="">—</option>
                  {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </label>
              <label className={labelCls}>
                {t('purchase.material', 'Material')}
                <select className={inputCls} value={discountForm.materialId} onChange={(e) => setDiscountForm((f) => ({ ...f, materialId: e.target.value }))}>
                  <option value="">{t('purchase.allOrFreeText', 'All items / free text…')}</option>
                  {materials.map((m) => <option key={m.id} value={m.id}>{m.sku} — {m.name}</option>)}
                </select>
              </label>
              <label className={labelCls}>
                {t('purchase.scope', 'Scope (free text)')}
                <input className={inputCls} value={discountForm.scope} disabled={!!discountForm.materialId} onChange={(e) => setDiscountForm((f) => ({ ...f, scope: e.target.value }))} placeholder={t('purchase.scope.ph', 'e.g. all fasteners')} />
              </label>
              <label className={labelCls}>
                {t('purchase.colDiscount', 'Discount')} % *
                <input type="number" min={0} max={100} step="any" className={inputCls} value={discountForm.percent} onChange={(e) => setDiscountForm((f) => ({ ...f, percent: e.target.value }))} />
              </label>
              <label className={labelCls}>
                {t('purchase.minQty', 'Min quantity')}
                <input type="number" min={0} step="any" className={inputCls} value={discountForm.minQty} onChange={(e) => setDiscountForm((f) => ({ ...f, minQty: e.target.value }))} />
              </label>
              <div className={labelCls}>
                {t('purchase.validTo', 'Valid to')}
                <DatePicker className="mt-1" value={discountForm.validTo} onChange={(iso) => setDiscountForm((f) => ({ ...f, validTo: iso }))} />
              </div>
            </div>
            <label className={`${labelCls} block`}>
              {t('purchase.notes', 'Notes')}
              <input className={inputCls} value={discountForm.note} onChange={(e) => setDiscountForm((f) => ({ ...f, note: e.target.value }))} />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setAddingDiscount(false)} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">{t('common.cancel')}</button>
              <button type="button" onClick={saveDiscount} disabled={!discountForm.vendorId || !(Number(discountForm.percent) > 0)} className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{t('common.add', 'Add')}</button>
            </div>
          </div>
        ) : null}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">{t('purchase.colVendor')}</th>
                <th className="px-4 py-3">{t('purchase.appliesTo', 'Applies to')}</th>
                <th className="px-4 py-3">{t('purchase.colDiscount', 'Discount')}</th>
                <th className="px-4 py-3">{t('purchase.minQty', 'Min quantity')}</th>
                <th className="px-4 py-3">{t('purchase.validTo', 'Valid to')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {discounts.map((d) => {
                const mat = d.materialId ? materials.find((m) => m.id === d.materialId) : null
                return (
                  <tr key={d.id} className={`group ${discountIsActive(d) ? '' : 'opacity-50'}`}>
                    <td className="px-4 py-3 font-medium text-slate-900">{selectVendorById(db, d.vendorId)?.name ?? d.vendorId}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {mat ? mat.name : (d.scope || t('purchase.allItems', 'all items'))}
                      {d.note ? <span className="ml-2 text-[11px] text-slate-400">{d.note}</span> : null}
                    </td>
                    <td className="px-4 py-3 font-semibold text-emerald-700">−{d.percent}%</td>
                    <td className="px-4 py-3 text-slate-600">{d.minQty ? groupAmount(d.minQty) : '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{d.validTo ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => commit(() => removeVendorDiscount(db, d.id))} className="rounded-md p-1 text-slate-300 opacity-0 transition-opacity hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100" title={t('common.remove')}><Trash2 size={13} /></button>
                    </td>
                  </tr>
                )
              })}
              {discounts.length === 0 ? <tr><td colSpan={6} className="px-4 py-6 text-center text-xs text-slate-400">{t('purchase.noDiscounts', 'No special discounts.')}</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
