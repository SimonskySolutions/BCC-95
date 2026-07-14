import { useState } from 'react'
import { Copy, RefreshCw, Send } from 'lucide-react'
import { useDb } from '../../../data/useDb.js'
import { useLanguage } from '../../../i18n/useLanguage.js'
import { selectQuoteVersionById } from '../../../domains/quotations/selectors.js'
import { reviseOffer, cloneQuoteToClient, sendOffer } from '../../../services/offers/index.js'

/**
 * Status-driven offer actions: a sent offer is immutable but can be **revised**
 * (new editable version), **re-sent**, or **reused as a template** for another
 * client (same product). Draft offers are edited in place via the wizard below.
 *
 * @param {{
 *   db: import('../../../data/mockDatabase.js').MockDatabase
 *   quote: import('../../../domains/quotations/model.js').QuoteDraft
 *   actorId?: string
 * }} props
 */
export default function OfferActions({ db, quote, actorId }) {
  const { commit } = useDb()
  const { t } = useLanguage()
  const [flash, setFlash] = useState(/** @type {string | null} */ (null))
  const [picking, setPicking] = useState(false)

  const current = quote.currentVersionId ? selectQuoteVersionById(db, quote.currentVersionId) : undefined
  const isSent = current?.status === 'sent'
  const otherClients = (db.clients ?? []).filter((c) => c.id !== quote.clientId)

  function doRevise() {
    const r = commit(() => reviseOffer(db, { quoteId: quote.id, actorId }))
    setFlash(r?.ok ? t('offerWs.revised').replace('{n}', String(r.version.versionNo)) : t('offer.error'))
  }

  function doResend() {
    const client = (db.clients ?? []).find((c) => c.id === quote.clientId)
    const r = commit(() =>
      sendOffer(db, {
        quoteVersionId: current.id,
        resend: true,
        from: db.employees?.[0]?.email ?? 'offers@bcc-95.local',
        to: [client?.email].filter(Boolean),
        actorId,
      }),
    )
    setFlash(r?.ok ? t('offerWs.resent') : t('offer.error'))
  }

  function doClone(targetClientId) {
    setPicking(false)
    const r = commit(() => cloneQuoteToClient(db, { sourceQuoteId: quote.id, targetClientId, actorId }))
    const name = otherClients.find((c) => c.id === targetClientId)?.companyName ??
      otherClients.find((c) => c.id === targetClientId)?.name ?? ''
    setFlash(
      r?.ok
        ? t('offerWs.cloned').replace('{offer}', r.quote.offerNo ?? r.quote.id).replace('{client}', name)
        : t('offer.error'),
    )
  }

  const btn = 'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition'

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {isSent && (
          <button type="button" onClick={doRevise} className={`${btn} border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100`}>
            <RefreshCw size={13} /> {t('offerWs.revise')}
          </button>
        )}
        {isSent && (
          <button type="button" onClick={doResend} className={`${btn} border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}>
            <Send size={13} /> {t('offerWs.resend')}
          </button>
        )}
        {otherClients.length > 0 && (
          <button type="button" onClick={() => setPicking((p) => !p)} className={`${btn} border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}>
            <Copy size={13} /> {t('offerWs.useAsTemplate')}
          </button>
        )}
      </div>

      {picking && (
        <div className="w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          <p className="px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {t('offerWs.cloneTo')}
          </p>
          <div className="max-h-56 overflow-y-auto">
            {otherClients.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => doClone(c.id)}
                className="block w-full truncate rounded-lg px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                {c.companyName ?? c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {flash && <p className="text-xs font-medium text-emerald-700">{flash}</p>}
    </div>
  )
}
