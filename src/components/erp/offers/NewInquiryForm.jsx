import { useMemo, useState } from 'react'
import { useLanguage } from '../../../i18n/useLanguage.js'
import { startNewInquiry } from '../../../services/offers/newInquiryService.js'
import { COUNTRY_NAMES, REGIONS, regionForCountry } from '../../../lib/countries.js'
import AttachmentEditor from './AttachmentEditor.jsx'

/**
 * Inquiry-first entry form: captures client + product + quantity in one
 * place and creates all three records atomically via `startNewInquiry`.
 *
 * @param {{
 *   db: import('../../../data/mockDatabase.js').MockDatabase
 *   onCreated?: (productId: string) => void
 *   onCancel?: () => void
 * }} props
 */
export default function NewInquiryForm({ db, onCreated, onCancel }) {
  const { t } = useLanguage()
  const [mode, setMode] = useState(/** @type {'new'|'existing'} */ ('new'))
  const [form, setForm] = useState(() => ({
    existingId: db.clients[0]?.id ?? '',
    clientName: '',
    contactName: '',
    contactEmail: '',
    country: '',
    city: '',
    region: '',
    channel: /** @type {import('../../../domains/inquiries/model.js').InquiryChannel} */ ('email'),
    products: /** @type {{ name: string; description: string; quantities: number[]; qtyInput: string }[]} */ ([
      { name: '', description: '', quantities: [], qtyInput: '' },
    ]),
    requestedDeadline: '',
    summary: '',
    specificationNote: '',
    attachments: /** @type {import('../../../domains/inquiries/model.js').InquiryAttachment[]} */ ([]),
    noAttachments: false,
  }))
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [submitting, setSubmitting] = useState(false)

  const validation = useMemo(() => {
    const problems = /** @type {string[]} */ ([])
    if (mode === 'new' && !form.clientName.trim()) problems.push('clientName')
    if (!form.products[0]?.name.trim()) problems.push('productName')
    if (!(form.products[0]?.quantities.length > 0)) problems.push('quantity')
    return problems
  }, [mode, form])

  function submit() {
    setError(null)
    if (validation.length) {
      setError(t('newInquiry.validation'))
      return
    }
    setSubmitting(true)
    try {
      const result = startNewInquiry(db, {
        client:
          mode === 'existing'
            ? { existingId: form.existingId }
            : {
                name: form.clientName.trim(),
                contactName: form.contactName.trim() || undefined,
                contactEmail: form.contactEmail.trim() || undefined,
                country: form.country.trim() || undefined,
                city: form.city.trim() || undefined,
                region: form.region.trim() || regionForCountry(form.country) || undefined,
              },
        product: {
          name: form.products[0].name.trim(),
          description: form.products[0].description.trim() || undefined,
        },
        inquiry: {
          channel: form.channel,
          requestedQuantity: form.products[0].quantities[0],
          requestedQuantities: form.products[0].quantities,
          extraProducts: form.products
            .slice(1)
            .filter((p) => p.name.trim())
            .map((p) => ({ name: p.name.trim(), description: p.description.trim() || undefined, quantities: p.quantities })),
          requestedDeadline: form.requestedDeadline || undefined,
          summary: form.summary.trim() || undefined,
          specificationNote: form.specificationNote.trim() || undefined,
          attachments: form.attachments,
          noAttachments: form.noAttachments,
        },
      })
      if (!result.ok) {
        setError(t(`newInquiry.error.${result.code}`, result.code))
        return
      }
      onCreated?.(result.product.id)
    } finally {
      setSubmitting(false)
    }
  }

  const isInvalid = (key) => validation.includes(key)
  const inputCls =
    'mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm'
  const invalidCls = 'border-rose-400 bg-rose-50'

  const setProduct = (idx, patch) =>
    setForm((f) => ({ ...f, products: f.products.map((p, i) => (i === idx ? { ...p, ...patch } : p)) }))
  const addProductRow = () =>
    setForm((f) => ({ ...f, products: [...f.products, { name: '', description: '', quantities: [], qtyInput: '' }] }))
  const removeProductRow = (idx) =>
    setForm((f) => ({ ...f, products: f.products.filter((_, i) => i !== idx) }))
  const addQty = (idx) =>
    setForm((f) => ({
      ...f,
      products: f.products.map((p, i) => {
        if (i !== idx) return p
        const n = Number(p.qtyInput)
        if (!Number.isFinite(n) || n <= 0) return p
        return { ...p, quantities: [...p.quantities, n], qtyInput: '' }
      }),
    }))
  const removeQty = (idx, qi) =>
    setForm((f) => ({ ...f, products: f.products.map((p, i) => (i === idx ? { ...p, quantities: p.quantities.filter((_, j) => j !== qi) } : p)) }))

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">
          {t('newInquiry.section.customer')}
        </h3>
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => setMode('new')}
            className={`rounded-full px-3 py-1 font-medium ${
              mode === 'new' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {t('newInquiry.customer.new')}
          </button>
          <button
            type="button"
            onClick={() => setMode('existing')}
            disabled={db.clients.length === 0}
            className={`rounded-full px-3 py-1 font-medium disabled:opacity-40 ${
              mode === 'existing' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {t('newInquiry.customer.existing')}
          </button>
        </div>

        {mode === 'existing' ? (
          <label className="block text-xs font-medium text-slate-600">
            {t('newInquiry.existingClient')}
            <select
              className={inputCls}
              value={form.existingId}
              onChange={(e) => setForm({ ...form, existingId: e.target.value })}
            >
              {db.clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block text-xs font-medium text-slate-600 md:col-span-2">
              {t('newInquiry.clientName')} *
              <input
                className={`${inputCls} ${isInvalid('clientName') ? invalidCls : ''}`}
                value={form.clientName}
                onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                placeholder="Acme GmbH"
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              {t('newInquiry.contactName')}
              <input
                className={inputCls}
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              {t('newInquiry.contactEmail')}
              <input
                type="email"
                className={inputCls}
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              {t('newInquiry.country')}
              <input
                list="niq-countries"
                className={inputCls}
                value={form.country}
                onChange={(e) => {
                  const country = e.target.value
                  setForm((f) => ({ ...f, country, region: regionForCountry(country) || f.region }))
                }}
                placeholder={t('newInquiry.countryPlaceholder')}
              />
              <datalist id="niq-countries">
                {COUNTRY_NAMES.map((c) => <option key={c} value={c} />)}
              </datalist>
            </label>
            <label className="block text-xs font-medium text-slate-600">
              {t('newInquiry.city')}
              <input
                className={inputCls}
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </label>
            <label className="block text-xs font-medium text-slate-600 md:col-span-2">
              {t('newInquiry.region')}
              <input
                list="niq-regions"
                className={inputCls}
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                placeholder={t('newInquiry.regionAuto')}
              />
              <datalist id="niq-regions">
                {REGIONS.map((r) => <option key={r} value={r} />)}
              </datalist>
            </label>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">{t('newInquiry.section.products')}</h3>
          <button
            type="button"
            onClick={addProductRow}
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-700"
          >
            + {t('newInquiry.addProduct')}
          </button>
        </div>
        <div className="space-y-3">
          {form.products.map((p, idx) => (
            <div key={idx} className="space-y-2 rounded-xl border border-slate-200 p-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">{idx + 1}</span>
                <input
                  className={`flex-1 rounded-lg border bg-white px-2 py-1.5 text-sm ${idx === 0 && isInvalid('productName') ? invalidCls : 'border-slate-200'}`}
                  value={p.name}
                  placeholder={`${t('newInquiry.productName')}${idx === 0 ? ' *' : ''}`}
                  onChange={(e) => setProduct(idx, { name: e.target.value })}
                />
                {form.products.length > 1 ? (
                  <button type="button" onClick={() => removeProductRow(idx)} className="text-slate-400 hover:text-rose-600" title={t('common.remove')}>✕</button>
                ) : null}
              </div>
              <textarea
                className={inputCls}
                rows={2}
                value={p.description}
                placeholder={t('newInquiry.productDescription')}
                onChange={(e) => setProduct(idx, { description: e.target.value })}
              />
              <div>
                <span className="block text-[11px] font-medium text-slate-500">{t('newInquiry.quantity')}{idx === 0 ? ' *' : ''}</span>
                <div className={`mt-1 flex flex-wrap items-center gap-1.5 rounded-lg border px-2 py-1.5 ${idx === 0 && isInvalid('quantity') ? invalidCls : 'border-slate-200'}`}>
                  {p.quantities.map((q, qi) => (
                    <span key={qi} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 ring-1 ring-blue-100">
                      {q}
                      <button type="button" onClick={() => removeQty(idx, qi)} className="opacity-60 hover:opacity-100">✕</button>
                    </span>
                  ))}
                  <input
                    type="number"
                    min={1}
                    className="h-7 w-24 rounded-md border border-slate-200 bg-white px-2 text-xs"
                    value={p.qtyInput}
                    placeholder={t('newInquiry.addQuantity')}
                    onChange={(e) => setProduct(idx, { qtyInput: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addQty(idx) } }}
                  />
                </div>
                <span className="mt-0.5 block text-[10px] text-slate-400">{t('newInquiry.quantityHint')}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">{t('newInquiry.section.inquiry')}</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="block text-xs font-medium text-slate-600">
            {t('inquiry.channel')}
            <select
              className={inputCls}
              value={form.channel}
              onChange={(e) =>
                setForm({
                  ...form,
                  channel:
                    /** @type {import('../../../domains/inquiries/model.js').InquiryChannel} */ (
                      e.target.value
                    ),
                })
              }
            >
              {['email', 'phone', 'portal', 'referral', 'in_person', 'other'].map((c) => (
                <option key={c} value={c}>
                  {t(`inquiry.channel.${c}`, c)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-slate-600">
            {t('inquiry.deadline')}
            <input
              type="date"
              className={inputCls}
              value={form.requestedDeadline}
              onChange={(e) => setForm({ ...form, requestedDeadline: e.target.value })}
            />
          </label>
          <label className="block text-xs font-medium text-slate-600 md:col-span-2">
            {t('inquiry.summary')}
            <textarea
              className={inputCls}
              rows={2}
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
            />
          </label>
          <label className="block text-xs font-medium text-slate-600 md:col-span-2">
            {t('inquiry.specification')}
            <textarea
              className={inputCls}
              rows={2}
              value={form.specificationNote}
              onChange={(e) => setForm({ ...form, specificationNote: e.target.value })}
            />
          </label>
        </div>

        <AttachmentEditor
          attachments={form.attachments}
          onChange={(attachments) => setForm((f) => ({ ...f, attachments }))}
          noAttachments={form.noAttachments}
          onToggleNoAttachments={(noAttachments) => setForm((f) => ({ ...f, noAttachments }))}
        />
      </section>

      <footer className="flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
        <p className="min-h-4 text-xs text-rose-600">{error ?? ''}</p>
        <div className="flex gap-2">
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {t('common.cancel')}
            </button>
          ) : null}
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {t('newInquiry.submit')}
          </button>
        </div>
      </footer>
    </div>
  )
}
