import { useMemo, useState } from 'react'
import { useLanguage } from '../../i18n/useLanguage.js'
import {
  resolveAcceptanceToken,
  submitCustomerDecision,
} from '../../services/offers/customerDecisionService.js'
import { selectQuoteLineItems } from '../../domains/quotations/selectors.js'
import { buildOfferPlainText } from '../../services/offers/offerDocumentService.js'
import OfferStatusBadge from '../../components/erp/offers/OfferStatusBadge.jsx'

/**
 * Standalone public page shown when the URL is `/offer-accept/:token`.
 * The customer can accept, request a revision, or reject the offer.
 *
 * @param {{ db: import('../../data/mockDatabase.js').MockDatabase; token: string }} props
 */
export default function OfferAcceptancePage({ db, token }) {
  const { t, language, setLanguage } = useLanguage()
  const resolved = resolveAcceptanceToken(db, token)
  const [outcome, setOutcome] = useState(/** @type {'accepted' | 'revision_requested' | 'rejected'} */ ('accepted'))
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [comment, setComment] = useState('')
  const [result, setResult] = useState(/** @type {null | { ok: boolean; message: string }} */ (null))

  const context = useMemo(() => {
    if (!resolved) return null
    const { quote, version } = resolved
    const product = db.products.find((p) => p.id === quote.productId)
    const client = db.clients.find((c) => c.id === quote.clientId)
    const lineItems = selectQuoteLineItems(db, version.id)
    const text = buildOfferPlainText({ quote, version, product, client, lineItems })
    return { quote, version, product, client, lineItems, text }
  }, [db, resolved])

  function submit() {
    if (!resolved) return
    const res = submitCustomerDecision(db, {
      token,
      decision: outcome,
      customerContactName: name,
      customerContactEmail: email,
      comment,
    })
    if (res.ok) {
      setResult({ ok: true, message: t('acceptance.thanks') })
    } else if (res.code === 'already_decided') {
      setResult({ ok: false, message: t('acceptance.alreadyDecided') })
    } else {
      setResult({ ok: false, message: t('acceptance.invalid') })
    }
  }

  if (!resolved || !context) {
    return (
      <div className="mx-auto my-16 max-w-2xl rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
        <h1 className="text-xl font-semibold text-rose-800">{t('acceptance.invalidTitle')}</h1>
        <p className="mt-2 text-sm text-rose-700">{t('acceptance.invalid')}</p>
      </div>
    )
  }

  const { quote, version, product, text } = context

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <header className="rounded-2xl bg-slate-900 px-6 py-5 text-white shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                {t('acceptance.offerFor')}
              </p>
              <h1 className="text-2xl font-semibold">
                {product?.name ?? ''} · {quote.id} v{version.versionNo}
              </h1>
              <p className="mt-1 text-sm text-slate-300">
                {t('acceptance.total')}: {version.subtotal.toFixed(2)} {version.currency ?? 'EUR'}{' '}
                · {t('acceptance.validUntil')}: {version.validUntil ?? '—'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <OfferStatusBadge status={version.status} />
              <div className="flex overflow-hidden rounded-lg bg-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`px-2 py-1 ${language === 'en' ? 'bg-white text-slate-900' : 'text-white'}`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('bg')}
                  className={`px-2 py-1 ${language === 'bg' ? 'bg-white text-slate-900' : 'text-white'}`}
                >
                  BG
                </button>
              </div>
            </div>
          </div>
        </header>

        <section className="rounded-2xl bg-white p-5 shadow-card">
          <h2 className="text-sm font-semibold text-slate-900">{t('acceptance.offerText')}</h2>
          <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-800">
            {text}
          </pre>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-card">
          <h2 className="text-sm font-semibold text-slate-900">{t('acceptance.yourDecision')}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {['accepted', 'revision_requested', 'rejected'].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setOutcome(/** @type {any} */ (opt))}
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  outcome === opt
                    ? opt === 'accepted'
                      ? 'bg-emerald-600 text-white'
                      : opt === 'revision_requested'
                        ? 'bg-amber-500 text-white'
                        : 'bg-rose-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {t(`acceptance.option.${opt}`, opt)}
              </button>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block text-xs font-medium text-slate-600">
              {t('acceptance.name')}
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              {t('acceptance.email')}
              <input
                type="email"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="block text-xs font-medium text-slate-600 md:col-span-2">
              {t('acceptance.comment')}
              <textarea
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </label>
          </div>
          <div className="mt-4 flex items-center justify-between">
            {result ? (
              <p
                className={`text-sm font-semibold ${
                  result.ok ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {result.message}
              </p>
            ) : (
              <p className="text-xs text-slate-500">{t('acceptance.consent')}</p>
            )}
            <button
              type="button"
              onClick={submit}
              disabled={Boolean(result?.ok)}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t('acceptance.submit')}
            </button>
          </div>
        </section>

        <footer className="text-center text-xs text-slate-500">
          {t('acceptance.footer')}
        </footer>
      </div>
    </div>
  )
}
