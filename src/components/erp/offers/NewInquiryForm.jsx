import { useMemo, useState } from 'react'
import { useLanguage } from '../../../i18n/useLanguage.js'
import { startNewInquiry } from '../../../services/offers/newInquiryService.js'

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
    region: '',
    productName: '',
    productDescription: '',
    channel: /** @type {import('../../../domains/inquiries/model.js').InquiryChannel} */ ('email'),
    requestedQuantity: '',
    requestedDeadline: '',
    summary: '',
    specificationNote: '',
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
                region: form.region.trim() || undefined,
              },
        product: {
          name: form.productName.trim(),
          description: form.productDescription.trim() || undefined,
        },
        inquiry: {
          channel: form.channel,
          requestedQuantity: Number(form.requestedQuantity),
          requestedDeadline: form.requestedDeadline || undefined,
          summary: form.summary.trim() || undefined,
          specificationNote: form.specificationNote.trim() || undefined,
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
            <label className="block text-xs font-medium text-slate-600 md:col-span-2">
              {t('newInquiry.region')}
              <input
                className={inputCls}
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                placeholder="EU / US / ..."
              />
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
