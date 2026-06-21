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
 * Bilingual label set for the Order Confirmation document (legacy GS layout).
 * @param {boolean} isBg
 */
export function orderConfirmationLabels(isBg) {
  return {
    docTitle: isBg ? 'ОФЕРТА' : 'OFFER',
    to: isBg ? 'ДО:' : 'TO:',
    offerNo: isBg ? 'Оферта №' : 'Offer No',
    date: isBg ? 'Дата' : 'Date',
    rev: isBg ? 'ревизия' : 'rev.',
    yourOrder: isBg ? 'Ваша Поръчка №' : 'Your Order #',
    attention: isBg ? 'На вниманието на' : 'To the attention of',
    intro1: isBg ? 'Благодарим Ви за запитването!' : 'Thank you for your inquiry!',
    intro2: isBg
      ? 'Имаме удоволствието да Ви представим следната оферта:'
      : 'We are pleased to present the following offer:',
    no: '№',
    articles: isBg ? 'Артикул' : 'Product',
    pcsArt: isBg ? 'Бр./арт.' : 'Pcs/art',
    exw: isBg ? 'EXW' : 'EXW',
    dap: isBg ? 'DAP' : 'DAP',
    perPcs: isBg ? '/бр.' : '/pcs',
    orderValue: isBg ? 'Стойност' : 'Order value',
    leadTime: isBg ? 'Срок (дни)' : 'Lead time (days)',
    quantity: isBg ? 'Кол-во' : 'Quantity',
    dispatchDate: isBg ? 'Дата на изпращане' : 'Dispatch Date',
    price: isBg ? 'Цена' : 'Price',
    validUntil: isBg ? 'Валидна до' : 'Valid until',
    addressOfDelivery: isBg ? 'Адрес на доставка:' : 'Shipping address:',
    termsOfDelivery: isBg ? 'Условия на доставка:' : 'Terms of Delivery:',
    termsOfPayment: isBg ? 'Условия на плащане:' : 'Terms of payments:',
    notes: isBg ? 'Забележки:' : 'Notes:',
    photos: isBg ? 'Снимки' : 'Photos',
    issuedBy: isBg ? 'Издадена от:' : 'Issued by:',
    approvedBy: isBg ? 'Одобрена от:' : 'Approved by:',
    total: isBg ? 'Общо' : 'Total',
    vat: isBg ? 'ДДС №' : 'VAT',
    acceptanceLink: isBg ? 'Линк за приемане' : 'Acceptance link',
  }
}

/**
 * Build a structured, render-ready Order Confirmation model from already-resolved
 * entities (so it stays pure and testable). Mirrors the legacy GS document.
 *
 * @param {{
 *   quote: import('../../domains/quotations/model.js').QuoteDraft
 *   version: import('../../domains/quotations/model.js').QuoteVersion
 *   client?: import('../../domains/crm/model.js').Client
 *   offerLines: import('../../domains/quotations/model.js').QuoteOfferLine[]
 *   termsOfDeliveryLabel?: string
 *   termsOfPaymentLabel?: string
 *   firm?: { name?: string; subtitle?: string; address?: string; vat?: string }
 *   issuedByName?: string
 *   approvedByName?: string
 *   acceptanceLink?: string
 * }} input
 */
export function buildOrderConfirmationModel(input) {
  const { quote, version, client, offerLines, firm, acceptanceLink } = input
  const isBg = version.language === 'bg'
  const currency = version.currency ?? 'EUR'
  const labels = orderConfirmationLabels(isBg)

  const rows = offerLines.map((l, i) => {
    const qty = Number(l.confirmedQty ?? l.requestedQty) || 0
    const date = l.confirmedDate ?? l.requestedDate ?? version.dispatchDate ?? ''
    const discount = Number(l.discountPercent) || 0
    const dap = Number(l.unitPrice) || 0
    return {
      no: i + 1,
      productId: l.productId,
      article: l.description || '—',
      requirements: l.requirements ?? '',
      qty,
      uom: l.uom ?? '',
      dispatchDate: date,
      unitPrice: dap,
      exwUnitPrice: Number(l.exwUnitPrice) || 0,
      discountPercent: discount,
      orderValue: qty * dap * (1 - discount / 100),
      lineTotal: qty * dap * (1 - discount / 100),
    }
  })
  const total = rows.reduce((s, r) => s + r.lineTotal, 0)

  // Group rows by product so one offer can present several products, each with
  // its own quantity → price matrix.
  const productGroups = []
  const gmap = new Map()
  for (const r of rows) {
    const key = r.productId || r.article || '—'
    let g = gmap.get(key)
    if (!g) { g = { product: r.article || '—', requirements: r.requirements, rows: [] }; gmap.set(key, g); productGroups.push(g) }
    g.rows.push(r)
  }

  return {
    isBg,
    currency,
    labels,
    productGroups,
    firm: {
      name: firm?.name ?? '',
      subtitle: firm?.subtitle ?? '',
      address: firm?.address ?? '',
      vat: firm?.vat ?? '',
    },
    customer: {
      companyName: client?.companyName ?? client?.name ?? '',
      address: client?.address ?? '',
      cityLine: [client?.postCode, client?.city].filter(Boolean).join(' '),
      country: client?.country ?? '',
      vat: client?.vat ?? '',
    },
    contact: [version.contactTitle, version.contactName].filter(Boolean).join(' '),
    customerOrderRef: version.customerOrderRef ?? '',
    offerNo: quote.offerNo ?? quote.id,
    versionNo: version.versionNo,
    priceBasis: version.priceBasis ?? 'both',
    validUntil: version.validUntil ?? '',
    leadTimeDays: version.leadTimeDays,
    orderDate: version.orderDate ?? version.createdAt?.slice(0, 10) ?? '',
    rows,
    total,
    deliveryAddress: version.deliveryAddress ?? '',
    termsOfDelivery: input.termsOfDeliveryLabel ?? version.deliveryTerms ?? '',
    termsOfPayment: input.termsOfPaymentLabel ?? version.paymentTerms ?? '',
    notes: version.notes ?? '',
    issuedBy: input.issuedByName ?? '',
    approvedBy: input.approvedByName ?? '',
    acceptanceLink: acceptanceLink ?? '',
  }
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
