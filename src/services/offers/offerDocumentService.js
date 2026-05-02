/**
 * Pure functions that produce the textual offer content. The generated string
 * is reused as the body of the PDF (rendered via jsPDF in the UI) and as a
 * plain-text preview shown to the sender before dispatch.
 */

/**
 * @param {{
 *   quote: import('../../domains/quotations/model.js').QuoteDraft
 *   version: import('../../domains/quotations/model.js').QuoteVersion
 *   product?: { name: string; sku?: string }
 *   client?: { name: string; region?: string }
 *   lineItems: import('../../domains/quotations/model.js').QuoteLineItem[]
 *   acceptanceLink?: string
 * }} input
 */
export function buildOfferPlainText(input) {
  const { quote, version, product, client, lineItems, acceptanceLink } = input
  const isBg = version.language === 'bg'
  const currency = version.currency ?? 'EUR'
  const header = isBg ? 'ОФЕРТА' : 'OFFER'
  const clientLabel = isBg ? 'Клиент' : 'Customer'
  const productLabel = isBg ? 'Продукт' : 'Product'
  const qtyLabel = isBg ? 'Количество' : 'Quantity'
  const priceLabel = isBg ? 'Ед. цена' : 'Unit price'
  const totalLabel = isBg ? 'Сума' : 'Total'
  const subtotalLabel = isBg ? 'Общо' : 'Subtotal'
  const marginLabel = isBg ? 'Надценка' : 'Margin'
  const deliveryLabel = isBg ? 'Условия на доставка' : 'Delivery terms'
  const paymentLabel = isBg ? 'Условия на плащане' : 'Payment terms'
  const leadLabel = isBg ? 'Срок на изпълнение (дни)' : 'Lead time (days)'
  const validLabel = isBg ? 'Валидна до' : 'Valid until'
  const linkLabel = isBg ? 'Линк за приемане' : 'Acceptance link'
  const unitPriceLabel = isBg ? 'Единична продажна цена' : 'Unit selling price'
  const orderTotalLabel = isBg ? 'Обща стойност на поръчката' : 'Order total'
  const moqLabel = isBg ? 'Мин. количество' : 'MOQ'

  const unitPrice = version.unitPrice ?? 0
  const moq = version.moq ?? 1
  const orderTotal = unitPrice * moq

  const colW = [40, 8, 12, 12]
  function row(desc, qty, unit, total) {
    return `  ${desc.padEnd(colW[0])} ${String(qty).padStart(colW[1])} ${String(unit).padStart(colW[2])} ${String(total).padStart(colW[3])}`
  }
  const divider = '  ' + '─'.repeat(colW[0] + colW[1] + colW[2] + colW[3] + 3)

  const lines = [
    `${header}: ${quote.id} v${version.versionNo}`,
    `${clientLabel}: ${client?.name ?? ''}`,
    `${productLabel}: ${product?.name ?? ''} (${product?.sku ?? ''})`,
    '',
    row('Description', qtyLabel, `${priceLabel} (${currency})`, `${totalLabel} (${currency})`),
    divider,
    ...lineItems.map((li) =>
      row(li.description || '—', li.quantity, li.unitPrice.toFixed(2), li.totalPrice.toFixed(2))
    ),
    divider,
    row(`${subtotalLabel}`, '', '', version.subtotal.toFixed(2)),
    row(`${marginLabel} (${version.marginPercent}%)`, '', '', ''),
    '',
    `★ ${unitPriceLabel}: ${unitPrice.toFixed(2)} ${currency}`,
    `  ${moqLabel}: ${moq}  |  ${orderTotalLabel}: ${orderTotal.toFixed(2)} ${currency}`,
    '',
    `${leadLabel}: ${version.leadTimeDays ?? '—'}`,
    `${deliveryLabel}: ${version.deliveryTerms ?? '—'}`,
    `${paymentLabel}: ${version.paymentTerms ?? '—'}`,
    `${validLabel}: ${version.validUntil ?? '—'}`,
    '',
    acceptanceLink ? `${linkLabel}: ${acceptanceLink}` : '',
  ]
  return lines.filter((l) => l !== null && l !== undefined).join('\n')
}

/**
 * Build a "PDF-like" blob reference. Release 1 cannot synchronously depend on
 * a PDF library from services, so the UI layer can render the text via jsPDF.
 * Here we just return a base64 data URI with the text payload so the audit
 * trail can show where the file lives.
 *
 * @param {Parameters<typeof buildOfferPlainText>[0]} input
 */
export function buildOfferPdfBlob(input) {
  const text = buildOfferPlainText(input)
  let encoded = ''
  try {
    if (typeof btoa === 'function') {
      encoded = btoa(unescape(encodeURIComponent(text)))
    } else {
      const g = /** @type {any} */ (globalThis)
      if (g?.Buffer) encoded = g.Buffer.from(text, 'utf-8').toString('base64')
    }
  } catch {
    encoded = ''
  }
  return {
    text,
    dataRef: `data:text/plain;charset=utf-8;base64,${encoded}`,
    byteLength: text.length,
  }
}
