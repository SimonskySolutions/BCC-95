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
  const [flash, setFlash] = useState(/** @type {string | null} */ (null))

  if (!open) return null

  function handleSend() {
    if (!version) return
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
      setFlash(`${t('send.sent')} — ${res.acceptanceLink}`)
      onSent?.({ acceptanceLink: res.acceptanceLink })
    } else {
      setFlash(res.code ?? t('send.error'))
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl">
        <header className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{t('send.title')}</h3>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-700">
            ×
          </button>
        </header>
        <p className="mb-3 text-xs text-slate-500">
          {t('send.desc')} <span className="font-medium">{client?.name}</span>
        </p>
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
            />
          </label>
          <label className="block text-xs font-medium text-slate-600 md:col-span-2">
            {t('send.cc')}
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
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
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 font-mono text-xs"
              rows={9}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-slate-500">{flash ?? ''}</p>
          <div className="flex gap-2">
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
              className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              disabled={!version || version.status !== 'approved'}
            >
              {t('send.send')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
