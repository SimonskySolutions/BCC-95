import { useMemo, useState } from 'react'
import { useLanguage } from '../../../i18n/useLanguage.js'
import {
  buildOfferEmailBody,
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
  const client = quote ? db.clients.find((c) => c.id === quote.clientId) : undefined
  const contact = useMemo(() => {
    if (!quote) return ''
    const inquiry = (db.inquiries ?? []).find(
      (i) => i.productId === quote.productId && i.customerId === quote.clientId,
    )
    return inquiry?.customerContactEmail ?? ''
  }, [db, quote])

  const previewLink = `${resolveAcceptanceBaseUrl().replace(/\/$/, '')}/offer-accept/<token>`

  const defaultSubject = useMemo(() => {
    if (!quote || !version) return ''
    const product = db.products.find((p) => p.id === quote.productId)
    if (version.language === 'bg') {
      return `Оферта ${quote.id} v${version.versionNo} — ${product?.name ?? ''}`
    }
    return `Offer ${quote.id} v${version.versionNo} — ${product?.name ?? ''}`
  }, [db, quote, version])
  const defaultBody = useMemo(() => {
    if (!quote || !version) return ''
    const product = db.products.find((p) => p.id === quote.productId)
    return buildOfferEmailBody({
      productName: product?.name ?? '',
      quoteId: quote.id,
      versionNo: version.versionNo,
      acceptanceLink: previewLink,
      language: version.language,
      subtotal: version.subtotal,
      currency: version.currency,
    })
  }, [db, quote, version, previewLink])

  const [from, setFrom] = useState('offers@bcc-erp.example')
  const [to, setTo] = useState(contact)
  const [cc, setCc] = useState('')
  const [subject, setSubject] = useState(defaultSubject)
  const [body, setBody] = useState(defaultBody)
  const [sentLink, setSentLink] = useState(/** @type {string | null} */ (null))
  const [error, setError] = useState(/** @type {string | null} */ (null))

  if (!open) return null

  function handleSend() {
    if (!version) return
    setError(null)
    const res = sendOffer(db, {
      quoteVersionId: version.id,
      from,
      to: to.split(',').map((x) => x.trim()).filter(Boolean),
      cc: cc ? cc.split(',').map((x) => x.trim()).filter(Boolean) : undefined,
      subject,
      body: body.replace(previewLink, '<generated acceptance link>'),
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
          <p className="mt-1 text-sm text-slate-500">Offer sent to <span className="font-medium text-slate-700">{to}</span></p>
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
          <label className="block text-xs font-medium text-slate-600">
            {t('send.to')}
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="email@example.com, email2@example.com"
            />
          </label>
          <label className="block text-xs font-medium text-slate-600 md:col-span-2">
            {t('send.cc')}
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="Optional — comma-separated"
            />
          </label>
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
            disabled={!version || version.status !== 'approved'}
            title={version?.status !== 'approved' ? 'Version must be approved before sending' : undefined}
          >
            {t('send.send')}
          </button>
        </div>
      </div>
    </div>
  )
}
