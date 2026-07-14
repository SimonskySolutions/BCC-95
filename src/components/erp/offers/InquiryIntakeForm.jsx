import { useMemo, useState } from 'react'
import { useLanguage } from '../../../i18n/useLanguage.js'
import { INTAKE_REQUIREMENTS } from '../../../domains/inquiries/model.js'
import {
  registerInquiry,
  updateInquiry,
} from '../../../services/offers/inquiryIntakeService.js'
import AttachmentEditor from './AttachmentEditor.jsx'
import DatePicker from '../../DatePicker.jsx'

/**
 * @param {{
 *   db: import('../../../data/mockDatabase.js').MockDatabase
 *   productId: string
 *   defaultClientId?: string
 *   inquiry?: import('../../../domains/inquiries/model.js').Inquiry
 *   onChange?: () => void
 * }} props
 */
export default function InquiryIntakeForm({ db, productId, defaultClientId, inquiry, onChange }) {
  const { t, language } = useLanguage()
  const [form, setForm] = useState(() => ({
    customerId: inquiry?.customerId ?? defaultClientId ?? db.clients[0]?.id ?? '',
    channel: inquiry?.channel ?? /** @type {const} */ ('email'),
    summary: inquiry?.summary ?? '',
    requestedQuantity: inquiry?.requestedQuantity ?? '',
    requestedDeadline: inquiry?.requestedDeadline ?? '',
    specificationNote: inquiry?.specificationNote ?? '',
    customerContactName: inquiry?.customerContactName ?? '',
    customerContactEmail: inquiry?.customerContactEmail ?? '',
    attachments: inquiry?.attachments ?? [],
    noAttachments: inquiry?.noAttachments ?? false,
  }))
  const [flash, setFlash] = useState(/** @type {string | null} */ (null))

  const missing = useMemo(() => {
    const m = /** @type {string[]} */ ([])
    const hasDrawing = form.attachments.some((a) => a.kind === 'drawing')
    if (!hasDrawing && !form.noAttachments) m.push('drawings')
    if (!form.requestedQuantity || Number(form.requestedQuantity) <= 0) m.push('quantity')
    if (!form.requestedDeadline) m.push('deadline')
    if (!String(form.specificationNote).trim()) m.push('specifications')
    if (!String(form.customerContactName).trim()) m.push('customerRequirements')
    return m
  }, [form])

  function submit() {
    const payload = {
      productId,
      customerId: form.customerId,
      channel: /** @type {import('../../../domains/inquiries/model.js').InquiryChannel} */ (form.channel),
      summary: form.summary,
      requestedQuantity: form.requestedQuantity ? Number(form.requestedQuantity) : undefined,
      requestedDeadline: form.requestedDeadline || undefined,
      specificationNote: form.specificationNote || undefined,
      customerContactName: form.customerContactName || undefined,
      customerContactEmail: form.customerContactEmail || undefined,
      attachments: form.attachments,
      noAttachments: form.noAttachments,
    }
    if (inquiry) {
      updateInquiry(db, inquiry.id, payload)
    } else {
      registerInquiry(db, payload)
    }
    setFlash(t('inquiry.saved'))
    onChange?.()
  }


  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{t('inquiry.title')}</h3>
        <span className="text-xs text-slate-500">{language.toUpperCase()}</span>
      </header>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="block text-xs font-medium text-slate-600">
          {t('inquiry.customer')}
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
            value={form.customerId}
            onChange={(e) => setForm({ ...form, customerId: e.target.value })}
          >
            {db.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-slate-600">
          {t('inquiry.channel')}
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
            value={form.channel}
            onChange={(e) => setForm({ ...form, channel: e.target.value })}
          >
            {['email', 'phone', 'portal', 'referral', 'in_person', 'other'].map((c) => (
              <option key={c} value={c}>
                {t(`inquiry.channel.${c}`, c)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-slate-600">
          {t('inquiry.contactName')}
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
            value={form.customerContactName}
            onChange={(e) => setForm({ ...form, customerContactName: e.target.value })}
          />
        </label>
        <label className="block text-xs font-medium text-slate-600">
          {t('inquiry.contactEmail')}
          <input
            type="email"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
            value={form.customerContactEmail}
            onChange={(e) => setForm({ ...form, customerContactEmail: e.target.value })}
          />
        </label>
        <label className="block text-xs font-medium text-slate-600">
          {t('inquiry.quantity')}
          <input
            type="number"
            min={1}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
            value={form.requestedQuantity}
            onChange={(e) => setForm({ ...form, requestedQuantity: e.target.value })}
          />
        </label>
        <label className="block text-xs font-medium text-slate-600">
          {t('inquiry.deadline')}
          <DatePicker
            className="mt-1"
            value={form.requestedDeadline}
            onChange={(iso) => setForm({ ...form, requestedDeadline: iso })}
          />
        </label>
        <label className="md:col-span-2 block text-xs font-medium text-slate-600">
          {t('inquiry.summary')}
          <textarea
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
            rows={2}
            value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
          />
        </label>
        <label className="md:col-span-2 block text-xs font-medium text-slate-600">
          {t('inquiry.specification')}
          <textarea
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
            rows={3}
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
      <section className="rounded-lg bg-slate-50 p-3 text-xs">
        <div className="font-semibold text-slate-700">{t('inquiry.checklist.title')}</div>
        <ul className="mt-1 space-y-1">
          {INTAKE_REQUIREMENTS.map((req) => (
            <li key={req} className="flex items-center gap-2">
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${
                  missing.includes(req) ? 'bg-rose-400' : 'bg-emerald-400'
                }`}
              />
              <span className={missing.includes(req) ? 'text-rose-700' : 'text-emerald-700'}>
                {t(`inquiry.requirement.${req}`, req)}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{flash ?? ''}</p>
        <button
          type="button"
          onClick={submit}
          className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {inquiry ? t('inquiry.save') : t('inquiry.register')}
        </button>
      </div>
    </div>
  )
}
