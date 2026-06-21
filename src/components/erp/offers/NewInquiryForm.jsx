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
    productName: '',
    productDescription: '',
    channel: /** @type {import('../../../domains/inquiries/model.js').InquiryChannel} */ ('email'),
    requestedQuantity: '',
    extraQuantities: /** @type {number[]} */ ([]),
    extraQtyInput: '',
    extraProducts: /** @type {{ name: string; quantities: number[]; qtyInput: string }[]} */ ([]),
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
    if (!form.productName.trim()) problems.push('productName')
    const qty = Number(form.requestedQuantity)
    if (!form.requestedQuantity || !Number.isFinite(qty) || qty <= 0) problems.push('quantity')
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
          name: form.productName.trim(),
          description: form.productDescription.trim() || undefined,
        },
        inquiry: {
          channel: form.channel,
          requestedQuantity: Number(form.requestedQuantity),
          requestedQuantities: [Number(form.requestedQuantity), ...form.extraQuantities].filter((n) => Number.isFinite(n) && n > 0),
          extraProducts: form.extraProducts
            .filter((p) => p.name.trim())
            .map((p) => ({ name: p.name.trim(), quantities: p.quantities })),
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
        <h3 className="text-sm font-semibold text-slate-900">{t('newInquiry.section.product')}</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="block text-xs font-medium text-slate-600 md:col-span-2">
            {t('newInquiry.productName')} *
            <input
              className={`${inputCls} ${isInvalid('productName') ? invalidCls : ''}`}
              value={form.productName}
              onChange={(e) => setForm({ ...form, productName: e.target.value })}
              placeholder="CNC housing v2"
            />
          </label>
          <label className="block text-xs font-medium text-slate-600 md:col-span-2">
            {t('newInquiry.productDescription')}
            <textarea
              className={inputCls}
              rows={2}
              value={form.productDescription}
              onChange={(e) => setForm({ ...form, productDescription: e.target.value })}
            />
          </label>
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
            {t('newInquiry.quantity')} *
            <input
              type="number"
              min={1}
              className={`${inputCls} ${isInvalid('quantity') ? invalidCls : ''}`}
              value={form.requestedQuantity}
              onChange={(e) => setForm({ ...form, requestedQuantity: e.target.value })}
            />
            {/* Additional quantities the customer asked to be quoted */}
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {form.extraQuantities.map((q, i) => (
                <span key={`${q}-${i}`} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 ring-1 ring-blue-100">
                  {q}
                  <button type="button" onClick={() => setForm((f) => ({ ...f, extraQuantities: f.extraQuantities.filter((_, idx) => idx !== i) }))} className="opacity-60 hover:opacity-100">✕</button>
                </span>
              ))}
              <input
                type="number"
                min={1}
                className="h-7 w-24 rounded-md border border-slate-200 px-2 text-xs font-normal focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={form.extraQtyInput}
                placeholder={t('newInquiry.addQuantity')}
                onChange={(e) => setForm({ ...form, extraQtyInput: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const n = Number(form.extraQtyInput)
                    if (Number.isFinite(n) && n > 0) setForm((f) => ({ ...f, extraQuantities: [...f.extraQuantities, n], extraQtyInput: '' }))
                  }
                }}
              />
            </div>
            <span className="mt-0.5 block text-[10px] font-normal text-slate-400">{t('newInquiry.quantityHint')}</span>
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

        {/* Additional products in the same inquiry — each with its own quantities */}
        <div className="rounded-lg border border-slate-200 p-2.5">
          <div className="mb-1.5 flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-700">{t('newInquiry.moreProducts')}</h4>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, extraProducts: [...f.extraProducts, { name: '', quantities: [], qtyInput: '' }] }))}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-700"
            >
              + {t('newInquiry.addProduct')}
            </button>
          </div>
          {form.extraProducts.length === 0 ? (
            <p className="text-[11px] text-slate-400">{t('newInquiry.moreProducts.hint')}</p>
          ) : null}
          <div className="space-y-2">
            {form.extraProducts.map((p, idx) => (
              <div key={idx} className="rounded-lg bg-slate-50 p-2">
                <div className="flex items-center gap-2">
                  <input
                    className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm"
                    value={p.name}
                    placeholder={t('newInquiry.productName')}
                    onChange={(e) => setForm((f) => ({ ...f, extraProducts: f.extraProducts.map((x, i) => i === idx ? { ...x, name: e.target.value } : x) }))}
                  />
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, extraProducts: f.extraProducts.filter((_, i) => i !== idx) }))}
                    className="text-slate-400 hover:text-rose-600"
                  >✕</button>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {p.quantities.map((q, qi) => (
                    <span key={qi} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 ring-1 ring-blue-100">
                      {q}
                      <button type="button" onClick={() => setForm((f) => ({ ...f, extraProducts: f.extraProducts.map((x, i) => i === idx ? { ...x, quantities: x.quantities.filter((_, j) => j !== qi) } : x) }))} className="opacity-60 hover:opacity-100">✕</button>
                    </span>
                  ))}
                  <input
                    type="number"
                    min={1}
                    className="h-7 w-24 rounded-md border border-slate-200 bg-white px-2 text-xs"
                    value={p.qtyInput}
                    placeholder={t('newInquiry.addQuantity')}
                    onChange={(e) => setForm((f) => ({ ...f, extraProducts: f.extraProducts.map((x, i) => i === idx ? { ...x, qtyInput: e.target.value } : x) }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const n = Number(p.qtyInput)
                        if (Number.isFinite(n) && n > 0) setForm((f) => ({ ...f, extraProducts: f.extraProducts.map((x, i) => i === idx ? { ...x, quantities: [...x.quantities, n], qtyInput: '' } : x) }))
                      }
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
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
