import { useMemo } from 'react'
import { Printer } from 'lucide-react'
import { useLanguage } from '../../../i18n/useLanguage.js'
import { useFactoryConfig } from '../../../config/useFactoryConfig.js'
import { buildOrderConfirmationModel } from '../../../services/offers/offerDocumentService.js'
import {
  selectQuoteOfferLines,
  selectQuoteApprovals,
} from '../../../domains/quotations/selectors.js'

function esc(s) {
  return String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
}

/** Render the model to a standalone printable HTML document (Cyrillic-safe). */
function orderConfirmationHtml(m) {
  const L = m.labels
  const money = (n) => `${n.toFixed(2)} ${m.currency}`
  const rows = m.rows
    .map(
      (r) => `
      <tr>
        <td class="num">${r.no}</td>
        <td>${esc(r.article)}${r.requirements ? `<div class="req">${esc(r.requirements)}</div>` : ''}</td>
        <td class="right">${r.qty}${r.uom ? ' ' + esc(r.uom) : ''}</td>
        <td class="center">${esc(r.dispatchDate)}</td>
        <td class="right">${money(r.unitPrice)}</td>
      </tr>`,
    )
    .join('')
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(L.docTitle)} ${esc(m.customerOrderRef)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, "DejaVu Sans", sans-serif; color: #1e293b; margin: 32px; font-size: 12px; }
    .firm { font-size: 16px; font-weight: 700; }
    .firm-sub, .firm-vat { color: #475569; font-size: 11px; }
    .to { text-align: right; margin-top: -54px; }
    .to .label { color: #64748b; font-size: 10px; }
    h1 { text-align: center; font-size: 18px; letter-spacing: 1px; margin: 28px 0 4px; }
    .ref { text-align: center; color: #475569; margin-bottom: 18px; }
    .intro { margin: 10px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #94a3b8; padding: 6px 8px; vertical-align: top; }
    th { background: #f1f5f9; text-align: left; font-size: 11px; text-transform: uppercase; }
    td.num, td.center { text-align: center; } td.right { text-align: right; }
    .req { color: #64748b; font-size: 10px; margin-top: 2px; }
    tfoot td { font-weight: 700; }
    .footer { margin-top: 18px; line-height: 1.6; }
    .footer .k { color: #475569; }
    .sign { display: flex; justify-content: space-between; margin-top: 36px; color: #475569; }
    @media print { body { margin: 12mm; } button { display: none; } }
  </style></head><body>
    <div class="firm">${esc(m.firm.name)}</div>
    ${m.firm.subtitle ? `<div class="firm-sub">${esc(m.firm.subtitle)}</div>` : ''}
    ${m.firm.address ? `<div class="firm-sub">${esc(m.firm.address)}</div>` : ''}
    ${m.firm.vat ? `<div class="firm-vat">${esc(L.vat)} ${esc(m.firm.vat)}</div>` : ''}

    <div class="to">
      <div class="label">${esc(L.to)}</div>
      <div><strong>${esc(m.customer.companyName)}</strong></div>
      ${m.customer.address ? `<div>${esc(m.customer.address)}</div>` : ''}
      ${m.customer.cityLine ? `<div>${esc(m.customer.cityLine)}</div>` : ''}
      ${m.customer.country ? `<div>${esc(m.customer.country)}</div>` : ''}
      ${m.customer.vat ? `<div>${esc(L.vat)} ${esc(m.customer.vat)}</div>` : ''}
    </div>

    <h1>${esc(L.docTitle)}</h1>
    <div class="ref">${esc(L.yourOrder)} ${esc(m.customerOrderRef)} / ${esc(m.orderDate)}</div>
    ${m.contact ? `<div class="intro">${esc(L.attention)} ${esc(m.contact)}</div>` : ''}
    <div class="intro">${esc(L.intro1)}</div>
    <div class="intro">${esc(L.intro2)}</div>

    <table>
      <thead><tr>
        <th style="width:32px">${esc(L.no)}</th>
        <th>${esc(L.articles)}</th>
        <th style="width:110px" class="right">${esc(L.quantity)}</th>
        <th style="width:120px" class="center">${esc(L.dispatchDate)}</th>
        <th style="width:110px" class="right">${esc(L.price)}</th>
      </tr></thead>
      <tbody>${rows || `<tr><td colspan="5" class="center">—</td></tr>`}</tbody>
      <tfoot><tr><td colspan="4" class="right">${esc(L.total)}</td><td class="right">${money(m.total)}</td></tr></tfoot>
    </table>

    <div class="footer">
      ${m.deliveryAddress ? `<div><span class="k">${esc(L.addressOfDelivery)}</span> ${esc(m.deliveryAddress)}</div>` : ''}
      ${m.termsOfDelivery ? `<div><span class="k">${esc(L.termsOfDelivery)}</span> ${esc(m.termsOfDelivery)}</div>` : ''}
      ${m.termsOfPayment ? `<div><span class="k">${esc(L.termsOfPayment)}</span> ${esc(m.termsOfPayment)}</div>` : ''}
      ${m.notes ? `<div><span class="k">${esc(L.notes)}</span> ${esc(m.notes)}</div>` : ''}
    </div>

    <div class="sign">
      <div>${m.issuedBy ? `${esc(L.issuedBy)} ${esc(m.issuedBy)}` : ''}</div>
      <div>${m.approvedBy ? `${esc(L.approvedBy)} ${esc(m.approvedBy)}` : ''}</div>
    </div>
    ${m.acceptanceLink ? `<div class="footer"><span class="k">${esc(L.acceptanceLink)}:</span> ${esc(m.acceptanceLink)}</div>` : ''}
  </body></html>`
}

/**
 * Customer-facing Order Confirmation preview + print-to-PDF.
 *
 * @param {{
 *   db: import('../../../data/mockDatabase.js').MockDatabase
 *   quote: import('../../../domains/quotations/model.js').QuoteDraft
 *   version: import('../../../domains/quotations/model.js').QuoteVersion
 *   acceptanceLink?: string
 * }} props
 */
export default function OfferPreview({ db, quote, version, acceptanceLink }) {
  const { t } = useLanguage()
  const { config } = useFactoryConfig()

  const model = useMemo(() => {
    const client = db.clients.find((c) => c.id === quote.clientId)
    const offerLines = selectQuoteOfferLines(db, version.id)
    const td = (db.termsOfDelivery ?? []).find((x) => x.id === version.termsOfDeliveryId)
    const tp = (db.termsOfPayment ?? []).find((x) => x.id === version.termsOfPaymentId)
    const approval = selectQuoteApprovals(db, version.id).find((a) => a.decision === 'approved')
    const approver = approval ? db.employees.find((e) => e.id === approval.approverEmployeeId) : undefined
    return buildOrderConfirmationModel({
      quote,
      version,
      client,
      offerLines,
      termsOfDeliveryLabel: td ? (td.code ? `${td.code} · ${td.label}` : td.label) : undefined,
      termsOfPaymentLabel: tp ? (tp.code ? `${tp.code} · ${tp.label}` : tp.label) : undefined,
      firm: { name: config.companyName, subtitle: config.companySubtitle },
      approvedByName: approver?.name,
      acceptanceLink,
    })
  }, [db, quote, version, acceptanceLink, config])

  function printDoc() {
    const html = orderConfirmationHtml(model)
    const w = window.open('', '_blank', 'width=820,height=1000')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 250)
  }

  const L = model.labels

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{t('offer.preview')}</h3>
        <button
          type="button"
          onClick={printDoc}
          className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
        >
          <Printer size={13} /> {t('offer.printConfirmation')}
        </button>
      </header>

      {/* On-screen document preview */}
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-base font-bold text-slate-900">{model.firm.name}</p>
            {model.firm.subtitle ? <p className="text-xs text-slate-500">{model.firm.subtitle}</p> : null}
          </div>
          <div className="text-right text-xs text-slate-600">
            <p className="text-[10px] uppercase text-slate-400">{L.to}</p>
            <p className="font-semibold text-slate-800">{model.customer.companyName || '—'}</p>
            {model.customer.cityLine ? <p>{model.customer.cityLine}</p> : null}
            {model.customer.country ? <p>{model.customer.country}</p> : null}
            {model.customer.vat ? <p>{L.vat} {model.customer.vat}</p> : null}
          </div>
        </div>

        <h2 className="mt-5 text-center text-base font-bold tracking-wide text-slate-900">{L.docTitle}</h2>
        <p className="text-center text-xs text-slate-500">{L.yourOrder} {model.customerOrderRef} / {model.orderDate || '—'}</p>
        {model.contact ? <p className="mt-3 text-xs text-slate-600">{L.attention} {model.contact}</p> : null}

        <table className="mt-3 w-full text-xs">
          <thead>
            <tr className="border-y border-slate-300 text-slate-500">
              <th className="py-1.5 pr-2 text-left font-medium w-8">{L.no}</th>
              <th className="py-1.5 pr-2 text-left font-medium">{L.articles}</th>
              <th className="py-1.5 pr-2 text-right font-medium">{L.quantity}</th>
              <th className="py-1.5 pr-2 text-center font-medium">{L.dispatchDate}</th>
              <th className="py-1.5 text-right font-medium">{L.price}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {model.rows.length === 0 ? (
              <tr><td colSpan={5} className="py-4 text-center text-slate-400">—</td></tr>
            ) : null}
            {model.rows.map((r) => (
              <tr key={r.no} className="align-top text-slate-700">
                <td className="py-1.5 pr-2">{r.no}</td>
                <td className="py-1.5 pr-2">
                  {r.article}
                  {r.requirements ? <div className="text-[10px] text-slate-400">{r.requirements}</div> : null}
                </td>
                <td className="py-1.5 pr-2 text-right">{r.qty}{r.uom ? ` ${r.uom}` : ''}</td>
                <td className="py-1.5 pr-2 text-center">{r.dispatchDate || '—'}</td>
                <td className="py-1.5 text-right">{r.unitPrice.toFixed(2)} {model.currency}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-300 font-semibold text-slate-800">
              <td colSpan={4} className="pt-2 text-right">{L.total}</td>
              <td className="pt-2 text-right">{model.total.toFixed(2)} {model.currency}</td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-4 space-y-1 text-xs text-slate-600">
          {model.deliveryAddress ? <p><span className="text-slate-400">{L.addressOfDelivery}</span> {model.deliveryAddress}</p> : null}
          {model.termsOfDelivery ? <p><span className="text-slate-400">{L.termsOfDelivery}</span> {model.termsOfDelivery}</p> : null}
          {model.termsOfPayment ? <p><span className="text-slate-400">{L.termsOfPayment}</span> {model.termsOfPayment}</p> : null}
          {model.notes ? <p><span className="text-slate-400">{L.notes}</span> {model.notes}</p> : null}
        </div>

        <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
          <span>{model.issuedBy ? `${L.issuedBy} ${model.issuedBy}` : ''}</span>
          <span>{model.approvedBy ? `${L.approvedBy} ${model.approvedBy}` : ''}</span>
        </div>
      </div>
    </div>
  )
}
