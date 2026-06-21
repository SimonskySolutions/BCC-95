import { useMemo } from 'react'
import { Printer } from 'lucide-react'
import { useLanguage } from '../../../i18n/useLanguage.js'
import { useFactoryConfig } from '../../../config/useFactoryConfig.js'
import { buildOrderConfirmationModel } from '../../../services/offers/offerDocumentService.js'
import {
  selectQuoteOfferLines,
  selectQuoteApprovals,
  selectQuoteDocuments,
} from '../../../domains/quotations/selectors.js'

function esc(s) {
  return String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
}

/** Render the offer model to a standalone printable HTML document (Cyrillic-safe). */
function offerHtml(m, photos = []) {
  const L = m.labels
  const showExw = m.priceBasis === 'exw' || m.priceBasis === 'both'
  const showDap = m.priceBasis === 'dap' || m.priceBasis === 'both'
  const money = (n) => n.toFixed(2)
  const product = m.rows[0]?.article ?? ''
  const requirements = m.rows[0]?.requirements ?? ''
  const colCount = 2 + (showExw ? 1 : 0) + (showDap ? 1 : 0) + 1
  const rows = m.rows.map((r) => {
    const value = r.qty * (showDap ? r.unitPrice : r.exwUnitPrice)
    return `<tr>
      <td class="num">${r.no}</td>
      <td class="right">${r.qty}${r.uom ? ' ' + esc(r.uom) : ''}</td>
      ${showExw ? `<td class="right">${money(r.exwUnitPrice)}</td>` : ''}
      ${showDap ? `<td class="right">${money(r.unitPrice)}</td>` : ''}
      <td class="right">${money(value)}</td>
    </tr>`
  }).join('')
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(L.docTitle)} ${esc(m.offerNo)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, "DejaVu Sans", sans-serif; color: #1e293b; margin: 32px; font-size: 12px; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
    .firm { font-size: 17px; font-weight: 700; }
    .firm-sub, .firm-vat { color: #475569; font-size: 11px; }
    .meta { text-align: right; }
    .meta .title { font-size: 15px; font-weight: 700; letter-spacing: 1px; color: #2563eb; }
    .meta div { font-size: 11px; color: #475569; }
    .meta .no { font-size: 12px; color: #1e293b; }
    .parties { display: flex; justify-content: space-between; margin: 14px 0; }
    .parties .label { color: #64748b; font-size: 10px; text-transform: uppercase; }
    .prod { background: #f1f5f9; border-radius: 6px; padding: 7px 10px; margin: 6px 0; }
    .prod .sub { color: #64748b; font-size: 10px; }
    .intro { margin: 8px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    th, td { border-bottom: 1px solid #cbd5e1; padding: 6px 8px; }
    th { text-align: right; font-size: 10px; text-transform: uppercase; color: #64748b; }
    th:first-child, td.num { text-align: left; }
    td.right { text-align: right; }
    .footer { margin-top: 16px; line-height: 1.7; }
    .footer .k { color: #475569; }
    .sign { display: flex; justify-content: space-between; margin-top: 32px; color: #475569; }
    @media print { body { margin: 12mm; } button { display: none; } }
  </style></head><body>
    <div class="head">
      <div>
        <div class="firm">${esc(m.firm.name)}</div>
        ${m.firm.subtitle ? `<div class="firm-sub">${esc(m.firm.subtitle)}</div>` : ''}
        ${m.firm.vat ? `<div class="firm-vat">${esc(L.vat)} ${esc(m.firm.vat)}</div>` : ''}
      </div>
      <div class="meta">
        <div class="title">${esc(L.docTitle)}</div>
        <div class="no">${esc(L.offerNo)} <strong>${esc(m.offerNo)}</strong> · ${esc(L.rev)} v${m.versionNo}</div>
        <div>${esc(L.date)} ${esc(m.orderDate)}${m.validUntil ? ` · ${esc(L.validUntil)} ${esc(m.validUntil)}` : ''}</div>
      </div>
    </div>

    <div class="parties">
      <div>
        <div class="label">${esc(L.to)}</div>
        <div><strong>${esc(m.customer.companyName)}</strong></div>
        ${m.customer.cityLine ? `<div>${esc(m.customer.cityLine)}</div>` : ''}
        ${m.customer.country ? `<div>${esc(m.customer.country)}</div>` : ''}
        ${m.customer.vat ? `<div>${esc(L.vat)} ${esc(m.customer.vat)}</div>` : ''}
        ${m.contact ? `<div>${esc(L.attention)} ${esc(m.contact)}</div>` : ''}
      </div>
      <div style="text-align:right">
        ${m.customerOrderRef ? `<div>${esc(L.yourOrder)} ${esc(m.customerOrderRef)}</div>` : ''}
        ${m.leadTimeDays != null ? `<div>${esc(L.leadTime)}: ${m.leadTimeDays}</div>` : ''}
      </div>
    </div>

    <div class="intro">${esc(L.intro1)}</div>
    <div class="intro">${esc(L.intro2)}</div>

    <div class="prod"><strong>${esc(product)}</strong>${requirements ? `<div class="sub">${esc(requirements)}</div>` : ''}</div>

    <table>
      <thead><tr>
        <th>${esc(L.no)}</th>
        <th>${esc(L.pcsArt)}</th>
        ${showExw ? `<th>${esc(L.exw)} ${esc(m.currency)}${esc(L.perPcs)}</th>` : ''}
        ${showDap ? `<th>${esc(L.dap)} ${esc(m.currency)}${esc(L.perPcs)}</th>` : ''}
        <th>${esc(L.orderValue)} ${esc(m.currency)}</th>
      </tr></thead>
      <tbody>${rows || `<tr><td colspan="${colCount}" class="num">—</td></tr>`}</tbody>
    </table>

    ${photos.length ? `<div style="margin-top:14px"><div class="k" style="font-size:11px;margin-bottom:6px">${esc(L.photos)}</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">${photos.map((p) => `<img src="${p.storageRef}" alt="${esc(p.name)}" style="width:150px;height:110px;object-fit:cover;border:1px solid #cbd5e1;border-radius:6px" />`).join('')}</div></div>` : ''}

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
 * Customer-facing OFFER preview (quantity → price matrix) + print-to-PDF.
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
    const issuer = version.createdBy ? db.employees.find((e) => e.id === version.createdBy) : undefined
    return buildOrderConfirmationModel({
      quote,
      version,
      client,
      offerLines,
      termsOfDeliveryLabel: td ? (td.code ? `${td.code} · ${td.label}` : td.label) : undefined,
      termsOfPaymentLabel: tp ? (tp.code ? `${tp.code} · ${tp.label}` : tp.label) : undefined,
      firm: { name: config.companyName, subtitle: config.companySubtitle },
      issuedByName: issuer?.name,
      approvedByName: approver?.name,
      acceptanceLink,
    })
  }, [db, quote, version, acceptanceLink, config])

  const photos = selectQuoteDocuments(db, version.id).filter((d) => d.kind === 'photo')

  function printDoc() {
    const w = window.open('', '_blank', 'width=820,height=1000')
    if (!w) return
    w.document.write(offerHtml(model, photos))
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 250)
  }

  const L = model.labels
  const showExw = model.priceBasis === 'exw' || model.priceBasis === 'both'
  const showDap = model.priceBasis === 'dap' || model.priceBasis === 'both'
  const product = model.rows[0]?.article ?? '—'
  const requirements = model.rows[0]?.requirements ?? ''
  const colCount = 2 + (showExw ? 1 : 0) + (showDap ? 1 : 0) + 1

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
        {/* Branded header band */}
        <div className="flex items-start justify-between gap-4 border-b-2 border-blue-600 pb-2.5">
          <div>
            <p className="text-base font-bold text-slate-900">{model.firm.name}</p>
            {model.firm.subtitle ? <p className="text-xs text-slate-500">{model.firm.subtitle}</p> : null}
            {model.firm.vat ? <p className="text-[11px] text-slate-400">{L.vat} {model.firm.vat}</p> : null}
          </div>
          <div className="text-right">
            <p className="text-sm font-bold tracking-wide text-blue-700">{L.docTitle}</p>
            <p className="text-xs text-slate-700">{L.offerNo} <span className="font-semibold">{model.offerNo}</span> · {L.rev} v{model.versionNo}</p>
            <p className="text-[11px] text-slate-500">{L.date} {model.orderDate || '—'}{model.validUntil ? ` · ${L.validUntil} ${model.validUntil}` : ''}</p>
          </div>
        </div>

        {/* Parties */}
        <div className="mt-3 flex items-start justify-between gap-4 text-xs">
          <div>
            <p className="text-[10px] uppercase text-slate-400">{L.to}</p>
            <p className="font-semibold text-slate-800">{model.customer.companyName || '—'}</p>
            {model.customer.cityLine ? <p className="text-slate-600">{model.customer.cityLine}</p> : null}
            {model.customer.country ? <p className="text-slate-600">{model.customer.country}</p> : null}
            {model.customer.vat ? <p className="text-slate-600">{L.vat} {model.customer.vat}</p> : null}
            {model.contact ? <p className="text-slate-600">{L.attention} {model.contact}</p> : null}
          </div>
          <div className="text-right text-slate-600">
            {model.customerOrderRef ? <p>{L.yourOrder} {model.customerOrderRef}</p> : null}
            {model.leadTimeDays != null ? <p>{L.leadTime}: {model.leadTimeDays}</p> : null}
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-600">{L.intro1}</p>
        <p className="text-xs text-slate-600">{L.intro2}</p>

        {/* Product band */}
        <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2">
          <span className="text-sm font-medium text-slate-800">{product}</span>
          {requirements ? <span className="ml-1 text-[11px] text-slate-400">· {requirements}</span> : null}
        </div>

        {/* Quantity → price matrix */}
        <table className="mt-2 w-full text-xs">
          <thead>
            <tr className="border-b border-slate-300 text-[10px] uppercase text-slate-500">
              <th className="py-1.5 pr-2 text-left font-medium w-8">{L.no}</th>
              <th className="py-1.5 pr-2 text-left font-medium">{L.pcsArt}</th>
              {showExw ? <th className="py-1.5 pr-2 text-right font-medium">{L.exw} {model.currency}{L.perPcs}</th> : null}
              {showDap ? <th className="py-1.5 pr-2 text-right font-medium">{L.dap} {model.currency}{L.perPcs}</th> : null}
              <th className="py-1.5 text-right font-medium">{L.orderValue} {model.currency}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {model.rows.length === 0 ? (
              <tr><td colSpan={colCount} className="py-4 text-center text-slate-400">—</td></tr>
            ) : null}
            {model.rows.map((r) => {
              const value = r.qty * (showDap ? r.unitPrice : r.exwUnitPrice)
              return (
                <tr key={r.no} className="text-slate-700">
                  <td className="py-1.5 pr-2">{r.no}</td>
                  <td className="py-1.5 pr-2 font-medium">{r.qty}{r.uom ? ` ${r.uom}` : ''}</td>
                  {showExw ? <td className="py-1.5 pr-2 text-right">{r.exwUnitPrice.toFixed(2)}</td> : null}
                  {showDap ? <td className="py-1.5 pr-2 text-right font-semibold">{r.unitPrice.toFixed(2)}</td> : null}
                  <td className="py-1.5 text-right text-slate-500">{value.toFixed(2)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {photos.length > 0 ? (
          <div className="mt-4">
            <p className="mb-1.5 text-[11px] text-slate-400">{L.photos}</p>
            <div className="flex flex-wrap gap-2">
              {photos.map((p) => (
                <img key={p.id} src={p.storageRef} alt={p.name} className="h-20 w-28 rounded-md border border-slate-200 object-cover" />
              ))}
            </div>
          </div>
        ) : null}

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
