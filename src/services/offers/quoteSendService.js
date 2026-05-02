import {
  appendQuoteApproval,
  appendQuoteDocument,
  patchQuote,
  patchQuoteVersion,
} from '../../domains/quotations/mutations.js'
import {
  selectQuoteById,
  selectQuoteVersionById,
  selectQuoteApprovals,
  selectQuoteLineItems,
} from '../../domains/quotations/selectors.js'
import { appendOutboundEmail } from '../../domains/communications/mutations.js'
import { appendAuditEntry } from '../../domains/audit/mutations.js'
import { selectClientById } from '../../domains/crm/selectors.js'
import { selectProductById } from '../../domains/products/selectors.js'
import { buildOfferPdfBlob } from './offerDocumentService.js'

const BASE_URL_KEY = 'erp-acceptance-base-url'

/**
 * Return the base URL to embed in acceptance emails. In the browser this will
 * be the current origin; services call this so we can be deterministic in
 * tests via `window.__ERP_BASE_URL__`.
 */
export function resolveAcceptanceBaseUrl() {
  try {
    // @ts-ignore — dev override
    if (typeof window !== 'undefined' && window.__ERP_BASE_URL__) return String(window.__ERP_BASE_URL__)
    const envBase =
      typeof import.meta !== 'undefined' && import.meta?.env?.VITE_PUBLIC_BASE_URL
        ? String(import.meta.env.VITE_PUBLIC_BASE_URL)
        : ''
    if (envBase) return envBase
    if (typeof window !== 'undefined') {
      const stored = window.localStorage?.getItem(BASE_URL_KEY)
      if (stored) return stored
      return window.location?.origin ?? 'https://erp.example.com'
    }
  } catch {
    /* ignore */
  }
  return 'https://erp.example.com'
}

/**
 * Generate a short but non-guessable acceptance token. Uses `crypto` when
 * available, falls back to Math.random so the code works in any JS runtime.
 */
function generateToken() {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return `tok-${crypto.randomUUID().replace(/-/g, '')}`.slice(0, 40)
    }
  } catch {
    /* ignore */
  }
  return `tok-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
}

/**
 * Build the human-readable email body for the offer. Supports EN and BG.
 * @param {{ productName: string; quoteId: string; versionNo: number; acceptanceLink: string; language?: string; subtotal: number; currency?: string }} input
 */
export function buildOfferEmailBody(input) {
  const cur = input.currency ?? 'EUR'
  const unitLine = input.unitPrice != null
    ? (input.language === 'bg'
        ? `Единична цена: ${input.unitPrice.toFixed(2)} ${cur}\n`
        : `Unit price: ${input.unitPrice.toFixed(2)} ${cur}\n`)
    : ''
  const leadLine = input.leadTimeDays != null
    ? (input.language === 'bg'
        ? `Срок на изпълнение: ${input.leadTimeDays} дни\n`
        : `Lead time: ${input.leadTimeDays} days\n`)
    : ''
  const validLine = input.validUntil
    ? (input.language === 'bg'
        ? `Оферта валидна до: ${input.validUntil}\n`
        : `Offer valid until: ${input.validUntil}\n`)
    : ''
  const moqLine = input.moq
    ? (input.language === 'bg'
        ? `Мин. количество (MOQ): ${input.moq} бр.\n`
        : `Minimum order quantity (MOQ): ${input.moq} units\n`)
    : ''

  if (input.language === 'bg') {
    return (
      `Здравейте,\n\n` +
      `Изпращаме Ви официална оферта за „${input.productName}" (ID ${input.quoteId}, версия ${input.versionNo}).\n\n` +
      unitLine +
      moqLine +
      leadLine +
      validLine +
      `\nЗа приемане, искане на ценова корекция или отказ, моля, използвайте следния линк:\n${input.acceptanceLink}\n\n` +
      `Прилагаме офертата в PDF формат.\n\n` +
      `Благодарим за интереса.\n`
    )
  }
  return (
    `Hello,\n\n` +
    `Please find attached our official offer for "${input.productName}" (ID ${input.quoteId}, version ${input.versionNo}).\n\n` +
    unitLine +
    moqLine +
    leadLine +
    validLine +
    `\nTo accept, request a price revision, or decline, please use the link below:\n${input.acceptanceLink}\n\n` +
    `The offer is also attached as a PDF.\n\n` +
    `Thank you for your interest.\n`
  )
}

/**
 * Send an approved quote version. Locks the version, records an acceptance
 * token on a QuoteDocument, generates a PDF-like blob, and appends an
 * outbound email record (mock transport in Release 1).
 *
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {{
 *   quoteVersionId: string
 *   from: string
 *   to: string[]
 *   cc?: string[]
 *   subject?: string
 *   body?: string
 *   actorId?: string
 * }} input
 */
export function sendOffer(db, input) {
  const version = selectQuoteVersionById(db, input.quoteVersionId)
  if (!version) return { ok: /** @type {const} */ (false), code: 'not_found' }
  if (version.status !== 'approved') {
    return { ok: /** @type {const} */ (false), code: 'not_approved' }
  }
  const approvals = selectQuoteApprovals(db, version.id)
  if (!approvals.some((a) => a.decision === 'approved')) {
    return { ok: /** @type {const} */ (false), code: 'not_approved' }
  }

  const quote = selectQuoteById(db, version.quoteId)
  if (!quote) return { ok: /** @type {const} */ (false), code: 'not_found' }
  const product = selectProductById(db, quote.productId)
  const client = selectClientById(db, quote.clientId)
  const lineItems = selectQuoteLineItems(db, version.id)

  const token = generateToken()
  const base = resolveAcceptanceBaseUrl()
  const acceptanceLink = `${base.replace(/\/$/, '')}/offer-accept/${token}`

  const subject =
    input.subject ??
    (version.language === 'bg'
      ? `Оферта ${quote.id} v${version.versionNo} — ${product?.name ?? ''}`
      : `Offer ${quote.id} v${version.versionNo} — ${product?.name ?? ''}`)

  const body =
    input.body ??
    buildOfferEmailBody({
      productName: product?.name ?? '',
      quoteId: quote.id,
      versionNo: version.versionNo,
      acceptanceLink,
      language: version.language,
      subtotal: version.subtotal,
      currency: version.currency,
    })

  const pdfBlob = buildOfferPdfBlob({
    quote,
    version,
    product,
    client,
    lineItems,
    acceptanceLink,
  })

  const acceptanceDoc = appendQuoteDocument(db, {
    quoteVersionId: version.id,
    kind: 'acceptance_receipt',
    name: `acceptance-${token}.link`,
    storageRef: token,
  })
  const pdfDoc = appendQuoteDocument(db, {
    quoteVersionId: version.id,
    kind: 'generated_offer_pdf',
    name: `offer-${quote.id}-v${version.versionNo}.pdf`,
    storageRef: pdfBlob.dataRef,
  })

  const email = appendOutboundEmail(db, {
    productId: quote.productId,
    quoteVersionId: version.id,
    from: input.from,
    to: input.to,
    cc: input.cc,
    subject,
    body,
    language: version.language,
    acceptanceLink,
    attachmentIds: [pdfDoc.id],
  })

  patchQuoteVersion(db, version.id, {
    status: 'sent',
    sentAt: email.sentAt,
    lockedAt: email.sentAt,
  })
  patchQuote(db, quote.id, { status: 'sent' })

  appendAuditEntry(db, {
    productId: quote.productId,
    entityType: 'quoteSend',
    entityId: email.id,
    action: 'quote.sent',
    actorId: input.actorId,
    meta: { subject, to: input.to, versionNo: version.versionNo, acceptanceLink },
  })

  return {
    ok: /** @type {const} */ (true),
    email,
    token,
    acceptanceLink,
    acceptanceDocId: acceptanceDoc.id,
    pdfDocId: pdfDoc.id,
    version,
    quote,
  }
}

export { appendQuoteApproval }
