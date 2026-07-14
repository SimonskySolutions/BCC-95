/**
 * Printable purchase-order document + outbound email to the vendor.
 * The print uses a plain table layout (same approach as the offer document).
 */
import { appendOutboundEmail } from '../../domains/communications/mutations.js'
import {
  poLineAmount,
  selectLinesByPurchaseOrder,
  selectPurchaseOrderById,
  selectPurchaseOrderTotal,
  selectVendorById,
} from '../../domains/purchase/selectors.js'
import { groupAmount } from '../../lib/money.js'

const L = {
  en: {
    title: 'Purchase Order', vendor: 'Vendor', buyer: 'Buyer', orderedAt: 'Order date',
    expectedAt: 'Expected delivery', item: 'Item', qty: 'Qty', unitPrice: 'Unit price',
    discount: 'Discount', amount: 'Amount', total: 'Total', notes: 'Notes',
    emailSubject: (no, company) => `Purchase order ${no} — ${company}`,
    emailBody: (no, company) => `Dear partner,\n\nPlease find our purchase order ${no}.\nKindly confirm receipt and the expected delivery date.\n\nBest regards,\n${company}`,
  },
  bg: {
    title: 'Поръчка за доставка', vendor: 'Доставчик', buyer: 'Купувач', orderedAt: 'Дата на поръчка',
    expectedAt: 'Очаквана доставка', item: 'Артикул', qty: 'К-во', unitPrice: 'Ед. цена',
    discount: 'Отстъпка', amount: 'Сума', total: 'Общо', notes: 'Бележки',
    emailSubject: (no, company) => `Поръчка за доставка ${no} — ${company}`,
    emailBody: (no, company) => `Уважаеми партньори,\n\nИзпращаме Ви нашата поръчка за доставка ${no}.\nМоля, потвърдете получаването и очакваната дата на доставка.\n\nС уважение,\n${company}`,
  },
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

/** Full printable HTML for one purchase order. */
export function buildPoHtml(db, poId, { language = 'en', currency = 'BGN', companyName = 'BCC-95' } = {}) {
  const po = selectPurchaseOrderById(db, poId)
  if (!po) return ''
  const t = L[language] ?? L.en
  const vendor = selectVendorById(db, po.vendorId)
  const lines = selectLinesByPurchaseOrder(db, po.id)
  const cur = po.currency ?? currency
  const lineLabel = (l) => {
    const mat = l.materialId ? (db.materials ?? []).find((m) => m.id === l.materialId) : null
    return mat ? `${mat.sku} — ${mat.name}` : (l.description ?? '')
  }
  const rows = lines.map((l) => `
    <tr>
      <td>${esc(lineLabel(l))}</td>
      <td class="num">${groupAmount(l.qty)} ${esc(l.uom ?? '')}</td>
      <td class="num">${groupAmount(l.unitCost)}</td>
      <td class="num">${l.discountPercent ? `${l.discountPercent}%` : '—'}</td>
      <td class="num">${groupAmount(poLineAmount(l))}</td>
    </tr>`).join('')
  const vendorAddr = [vendor?.address, [vendor?.postCode, vendor?.city].filter(Boolean).join(' '), vendor?.country]
    .filter(Boolean).join(', ')
  return `<!DOCTYPE html><html lang="${language}"><head><meta charset="utf-8"><title>${esc(po.no ?? po.id)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #0f172a; margin: 32px; font-size: 13px; }
    h1 { font-size: 20px; margin: 0 0 2px; }
    .muted { color: #64748b; font-size: 11px; }
    .parties { display: flex; justify-content: space-between; gap: 24px; margin: 18px 0; }
    .party h3 { font-size: 11px; text-transform: uppercase; color: #64748b; margin: 0 0 4px; }
    table.lines { width: 100%; border-collapse: collapse; margin-top: 12px; }
    table.lines th, table.lines td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
    table.lines th { background: #f1f5f9; font-size: 11px; text-transform: uppercase; color: #475569; }
    td.num, th.num { text-align: right; }
    .total { text-align: right; margin-top: 10px; font-size: 15px; font-weight: bold; }
    .notes { margin-top: 14px; background: #f8fafc; padding: 8px 10px; border-radius: 6px; }
  </style></head><body>
  <h1>${t.title} ${esc(po.no ?? po.id)}</h1>
  <p class="muted">${t.orderedAt}: ${esc(po.orderedAt)}${po.expectedAt ? ` · ${t.expectedAt}: ${esc(po.expectedAt)}` : ''}</p>
  <div class="parties">
    <div class="party"><h3>${t.buyer}</h3><strong>${esc(companyName)}</strong></div>
    <div class="party"><h3>${t.vendor}</h3><strong>${esc(vendor?.name ?? '')}</strong><br>${esc(vendorAddr)}${vendor?.vat ? `<br>VAT: ${esc(vendor.vat)}` : ''}</div>
  </div>
  <table class="lines">
    <thead><tr><th>${t.item}</th><th class="num">${t.qty}</th><th class="num">${t.unitPrice} (${esc(cur)})</th><th class="num">${t.discount}</th><th class="num">${t.amount} (${esc(cur)})</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="total">${t.total}: ${groupAmount(selectPurchaseOrderTotal(db, po.id))} ${esc(cur)}</p>
  ${po.notes ? `<p class="notes">${t.notes}: ${esc(po.notes)}</p>` : ''}
  </body></html>`
}

/** Open the printable PO in a new window and trigger the print dialog. */
export function printPurchaseOrder(db, poId, opts) {
  const html = buildPoHtml(db, poId, opts)
  if (!html) return
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  win.print()
}

/**
 * Record an outbound PO email to the vendor (mock transport, like offers).
 * Returns the email or null when the vendor has no address.
 */
export function emailPurchaseOrder(db, poId, { language = 'en', companyName = 'BCC-95', from = 'purchasing@bcc95.local' } = {}) {
  const po = selectPurchaseOrderById(db, poId)
  const vendor = po ? selectVendorById(db, po.vendorId) : null
  const to = String(vendor?.email ?? '').split(/[;,]/).map((s) => s.trim()).filter(Boolean)
  if (!po || to.length === 0) return null
  const t = L[language] ?? L.en
  return appendOutboundEmail(db, {
    from,
    to,
    subject: t.emailSubject(po.no ?? po.id, companyName),
    body: t.emailBody(po.no ?? po.id, companyName),
    language,
  })
}
