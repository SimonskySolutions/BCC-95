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
  const currency = version.currency ?? 'EUR'

  const text = useMemo(
    () => buildOfferPlainText({ quote, version, product, client, lineItems, acceptanceLink }),
    [quote, version, product, client, lineItems, acceptanceLink],
  )

  function downloadPdf() {
    const title = `Offer ${quote.id} v${version.versionNo}`
    exportTextAsPdf(title, text, `${quote.id}-v${version.versionNo}.pdf`)
  }

  const kindLabel = {
    material: 'Material',
    labor: 'Labour',
    tooling: 'Tooling',
    operation: 'Operation',
    logistics: 'Logistics',
    other: 'Other',
  }

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{t('offer.preview')}</h3>
        <button
          type="button"
          onClick={downloadPdf}
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
        >
          {t('offer.downloadPdf')}
        </button>
      </header>

      {/* Offer document card */}
      <div className="rounded-xl border border-slate-200 bg-white text-sm">

        {/* Document header */}
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {version.language === 'bg' ? 'ОФЕРТА' : 'OFFER'}
              </p>
              <p className="mt-0.5 text-lg font-bold text-slate-900">
                {quote.id} <span className="text-base font-medium text-slate-500">v{version.versionNo}</span>
              </p>
            </div>
            <div className="text-right text-xs text-slate-500">
              {version.validUntil && (
                <p>Valid until: <span className="font-medium text-slate-700">{version.validUntil}</span></p>
              )}
              {version.language && (
                <p className="mt-0.5 uppercase">{version.language === 'bg' ? 'BG' : 'EN'} · {currency}</p>
              )}
            </div>
          </div>
        </div>

        {/* Client & product */}
        <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100">
          <div className="px-5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Customer</p>
            <p className="mt-0.5 font-semibold text-slate-800">{client?.name ?? '—'}</p>
            {client?.region && <p className="text-xs text-slate-500">{client.region}</p>}
          </div>
          <div className="px-5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Product</p>
            <p className="mt-0.5 font-semibold text-slate-800">{product?.name ?? '—'}</p>
            {product?.sku && <p className="text-xs text-slate-500">{product.sku}</p>}
          </div>
        </div>

        {/* Line items */}
        <div className="px-5 py-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Cost breakdown</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500">
                <th className="pb-1.5 text-left font-medium">Description</th>
                <th className="pb-1.5 text-left font-medium">Kind</th>
                <th className="pb-1.5 text-right font-medium">Qty</th>
                <th className="pb-1.5 text-right font-medium">Unit ({currency})</th>
                <th className="pb-1.5 text-right font-medium">Total ({currency})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {lineItems.map((li) => (
                <tr key={li.id} className="text-slate-700">
                  <td className="py-1.5 pr-3">{li.description || '—'}</td>
                  <td className="py-1.5 pr-3">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 capitalize">
                      {kindLabel[li.kind] ?? li.kind}
                    </span>
                  </td>
                  <td className="py-1.5 text-right">{li.quantity}</td>
                  <td className="py-1.5 text-right">{li.unitPrice.toFixed(2)}</td>
                  <td className="py-1.5 text-right font-medium">{li.totalPrice.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 font-semibold text-slate-800">
                <td colSpan={4} className="pt-2 text-right">Subtotal</td>
                <td className="pt-2 text-right">{version.subtotal.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Selling price highlight */}
        <div className="mx-5 mb-4 rounded-xl bg-blue-50 px-4 py-3 ring-1 ring-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-500">Unit selling price</p>
              <p className="mt-0.5 text-2xl font-bold text-blue-900">
                {(version.unitPrice ?? 0).toFixed(2)} <span className="text-base font-medium text-blue-500">{currency}</span>
              </p>
              {version.moq ? (
                <p className="mt-0.5 text-xs text-blue-600">MOQ: {version.moq} units · order total: {((version.unitPrice ?? 0) * version.moq).toFixed(2)} {currency}</p>
              ) : null}
            </div>
            <div className="text-right text-xs text-blue-700">
              <p>Margin: {version.marginPercent}%</p>
            </div>
          </div>
        </div>

        {/* Terms */}
        <div className="grid grid-cols-2 gap-3 border-t border-slate-100 px-5 py-3 text-xs md:grid-cols-4">
          {[
            { label: 'Lead time', value: version.leadTimeDays ? `${version.leadTimeDays} days` : '—' },
            { label: 'Delivery', value: version.deliveryTerms ?? '—' },
            { label: 'Payment', value: version.paymentTerms ?? '—' },
            { label: 'Valid until', value: version.validUntil ?? '—' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="font-semibold uppercase tracking-wide text-slate-400" style={{ fontSize: 10 }}>{label}</p>
              <p className="mt-0.5 text-slate-700">{value}</p>
            </div>
          ))}
        </div>

        {/* Acceptance link */}
        {acceptanceLink && (
          <div className="border-t border-slate-100 px-5 py-3 text-xs">
            <p className="text-slate-500">
              Acceptance link:{' '}
              <a href={acceptanceLink} className="font-medium text-blue-700 hover:text-blue-900 break-all">
                {acceptanceLink}
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
