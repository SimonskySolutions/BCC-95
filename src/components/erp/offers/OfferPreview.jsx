import { useMemo } from 'react'
import { useLanguage } from '../../../i18n/useLanguage.js'
import { buildOfferPlainText } from '../../../services/offers/offerDocumentService.js'
import { exportTextAsPdf } from '../../../services/reporting/exportService.js'

/**
 * @param {{
 *   db: import('../../../data/mockDatabase.js').MockDatabase
 *   quote: import('../../../domains/quotations/model.js').QuoteDraft
 *   version: import('../../../domains/quotations/model.js').QuoteVersion
 *   lineItems: import('../../../domains/quotations/model.js').QuoteLineItem[]
 *   acceptanceLink?: string
 * }} props
 */
export default function OfferPreview({ db, quote, version, lineItems, acceptanceLink }) {
  const { t } = useLanguage()
  const product = db.products.find((p) => p.id === quote.productId)
  const client = db.clients.find((c) => c.id === quote.clientId)

  const text = useMemo(
    () =>
      buildOfferPlainText({
        quote,
        version,
        product,
        client,
        lineItems,
        acceptanceLink,
      }),
    [quote, version, product, client, lineItems, acceptanceLink],
  )

  function downloadPdf() {
    const title = `Offer ${quote.id} v${version.versionNo}`
    exportTextAsPdf(title, text, `${quote.id}-v${version.versionNo}.pdf`)
  }

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{t('offer.preview')}</h3>
        <button
          type="button"
          onClick={downloadPdf}
          className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
        >
          {t('offer.downloadPdf')}
        </button>
      </header>
      <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-800">
        {text}
      </pre>
    </div>
  )
}
