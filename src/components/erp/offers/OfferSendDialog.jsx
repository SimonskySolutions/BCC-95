import { useEffect, useMemo, useRef, useState } from 'react'
import { Paperclip, X as XIcon } from 'lucide-react'
import { useLanguage } from '../../../i18n/useLanguage.js'
import { useFactoryConfig } from '../../../config/useFactoryConfig.js'
import EmailChipsInput from '../../EmailChipsInput.jsx'
import {
  buildOfferEmailBody,
  buildOfferEmailSubject,
  resolveAcceptanceBaseUrl,
  sendOffer,
} from '../../../services/offers/quoteSendService.js'

/**
 * @param {{
 *   db: import('../../../data/mockDatabase.js').MockDatabase
 *   quote?: import('../../../domains/quotations/model.js').QuoteDraft
 *   version?: import('../../../domains/quotations/model.js').QuoteVersion
 *   actorId?: string
 *   open: boolean
 *   onClose: () => void
 *   onSent?: (result: { acceptanceLink: string }) => void
 * }} props
 */
export default function OfferSendDialog({ db, quote, version, actorId, open, onClose, onSent }) {
  const { t } = useLanguage()
  const { config } = useFactoryConfig()
  const client = quote ? db.clients.find((c) => c.id === quote.clientId) : undefined
  const inquiry = useMemo(
    () => (quote ? (db.inquiries ?? []).find((i) => i.productId === quote.productId && i.customerId === quote.clientId) : undefined),
    [db, quote],
  )
  const contactEmail = inquiry?.customerContactEmail ?? client?.contactEmail ?? ''
  const contactName = version?.contactName || inquiry?.customerContactName || client?.contactName || client?.contacts?.[0]?.name || ''
  const offerNo = quote?.offerNo ?? quote?.id ?? ''
  const orderDate = version?.orderDate ?? new Date().toISOString().slice(0, 10)
  const inquiryRef = inquiry?.receivedAt ? String(inquiry.receivedAt).slice(0, 10) : (inquiry?.id ?? '')

  const previewLink = `${resolveAcceptanceBaseUrl().replace(/\/$/, '')}/offer-accept/<token>`

  const defaultSubject = useMemo(() => {
    if (!quote || !version) return ''
    return buildOfferEmailSubject({ offerNo, orderDate, inquiryRef, language: version.language })
  }, [quote, version, offerNo, orderDate, inquiryRef])
  const defaultBody = useMemo(() => {
    if (!quote || !version) return ''
    return buildOfferEmailBody({
      contactName,
      acceptanceLink: previewLink,
      language: version.language,
      companyName: config.companyName,
    })
  }, [quote, version, contactName, previewLink, config.companyName])

  const [from, setFrom] = useState('offers@bcc-erp.example')
  const [to, setTo] = useState(/** @type {string[]} */ ([]))
  const [cc, setCc] = useState(/** @type {string[]} */ ([]))
  const [subject, setSubject] = useState(defaultSubject)
  const [body, setBody] = useState(defaultBody)

  // Auto-fill subject/body/recipient when the dialog opens for an offer. Keyed
  // on the version id so re-opening for a different offer re-composes, but a
  // user's edits to the same offer are preserved.
  const composedFor = useRef(/** @type {string | null} */ (null))
  useEffect(() => {
    if (!open || !version) return
    if (composedFor.current !== version.id) {
      composedFor.current = version.id
      setSubject(defaultSubject)
      setBody(defaultBody)
      setTo(contactEmail ? [contactEmail] : [])
    }
  }, [open, version, defaultSubject, defaultBody, contactEmail])
  const [sentLink, setSentLink] = useState(/** @type {string | null} */ (null))
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [attachments, setAttachments] = useState(/** @type {{id:string,name:string}[]} */ ([]))
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(/** @type {HTMLInputElement | null} */ (null))

  if (!open) return null

  async function onAttach(e) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length || !quote) return
    setUploading(true)
    try {
      for (const file of files) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('clientId', quote.clientId)
        fd.append('folder', 'Offer attachments')
        if (actorId) fd.append('uploadedBy', actorId)
        const res = await fetch('/api/files', { method: 'POST', body: fd }).then((r) => r.json()).catch(() => null)
        if (res?.id) setAttachments((a) => [...a, { id: res.id, name: res.name }])
      }
    } finally { setUploading(false) }
  }

  function handleSend() {
    if (!version) return
    setError(null)
    const res = sendOffer(db, {
      quoteVersionId: version.id,
      from,
      to,
      cc: cc.length ? cc : undefined,
      subject,
      body: body.replace(previewLink, '<generated acceptance link>'),
      attachmentIds: attachments.map((a) => a.id),
      actorId,
    })
    if (res.ok) {
      setSentLink(res.acceptanceLink)
      onSent?.({ acceptanceLink: res.acceptanceLink })
    } else {
      setError(res.code ?? t('send.error'))
    }
  }

  if (sentLink) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <span className="text-2xl">✓</span>
          </div>
          <h3 className="text-lg font-semibold text-slate-900">{t('send.sent')}</h3>
          <p className="mt-1 text-sm text-slate-500">Offer sent to <span className="font-medium text-slate-700">{to.join(', ')}</span></p>
          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-left">
            <p className="text-xs font-medium text-slate-500">Acceptance link:</p>
            <p className="mt-1 break-all text-xs font-mono text-blue-700">{sentLink}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl">
        <header className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{t('send.title')}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </header>
        <p className="mb-3 text-xs text-slate-500">
          {t('send.desc')} <span className="font-medium text-slate-800">{client?.name}</span>
        </p>
        {error ? (
          <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 ring-1 ring-rose-200">
            {error}
          </div>
        ) : null}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="block text-xs font-medium text-slate-600">
            {t('send.from')}
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <div className="block text-xs font-medium text-slate-600">
            {t('send.to')}
            <EmailChipsInput value={to} onChange={setTo} placeholder="email@example.com" />
          </div>
          <div className="block text-xs font-medium text-slate-600 md:col-span-2">
            {t('send.cc')}
            <EmailChipsInput value={cc} onChange={setCc} placeholder={t('send.ccPlaceholder', 'Optional — type an address and press +')} />
          </div>
          <label className="block text-xs font-medium text-slate-600 md:col-span-2">
            {t('send.subject')}
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </label>
          <label className="block text-xs font-medium text-slate-600 md:col-span-2">
            {t('send.body')}
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm leading-relaxed"
              rows={10}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>

          {/* Attachments — the offer PDF is always included; add extra files here */}
          <div className="md:col-span-2">
            <p className="text-xs font-medium text-slate-600">{t('send.attachments')}</p>
            <ul className="mt-1 space-y-1">
              <li className="flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1.5 text-xs text-slate-600">
                <Paperclip size={13} className="text-slate-400" /> {t('send.offerPdf')}
                <span className="ml-auto rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500">{t('send.auto')}</span>
              </li>
              {attachments.map((a) => (
                <li key={a.id} className="flex items-center gap-2 rounded-lg border border-slate-100 px-2 py-1.5 text-xs text-slate-700">
                  <Paperclip size={13} className="text-slate-400" />
                  <span className="min-w-0 flex-1 truncate">{a.name}</span>
                  <button type="button" onClick={() => setAttachments((x) => x.filter((f) => f.id !== a.id))}
                    className="text-slate-300 hover:text-rose-600"><XIcon size={13} /></button>
                </li>
              ))}
            </ul>
            <input ref={fileRef} type="file" multiple className="hidden" onChange={onAttach} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              <Paperclip size={13} /> {uploading ? t('send.uploading') : t('send.addAttachment')}
            </button>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSend}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!version || version.status !== 'approved' || to.length === 0}
            title={version?.status !== 'approved' ? 'Version must be approved before sending' : to.length === 0 ? 'Add at least one recipient' : undefined}
          >
            {t('send.send')}
          </button>
        </div>
      </div>
    </div>
  )
}
