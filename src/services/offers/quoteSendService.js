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
 * Subject line for the offer email. EN/BG cover-letter style:
 * "Offer No <no> dated <date> — re your inquiry <ref>".
 * @param {{ offerNo: string; orderDate?: string; inquiryRef?: string; language?: string }} input
 */
export function buildOfferEmailSubject(input) {
  const date = input.orderDate ?? new Date().toISOString().slice(0, 10)
  if (input.language === 'bg') {
    return `Оферта № ${input.offerNo} от ${date}` + (input.inquiryRef ? ` — по Ваше запитване ${input.inquiryRef}` : '')
  }
  return `Offer No ${input.offerNo} dated ${date}` + (input.inquiryRef ? ` — re your inquiry ${input.inquiryRef}` : '')
}

/**
 * Build the human-readable cover-letter email body for the offer (EN and BG).
 * @param {{ contactName?: string; acceptanceLink?: string; language?: string; companyName?: string }} input
 */
export function buildOfferEmailBody(input) {
  const company = input.companyName || 'BCC 95'
  const linkBg = input.acceptanceLink
    ? `\nМожете да прегледате и да отговорите на офертата онлайн тук:\n${input.acceptanceLink}\n`
    : ''
  const linkEn = input.acceptanceLink
    ? `\nYou can review and respond to the offer online here:\n${input.acceptanceLink}\n`
    : ''

  if (input.language === 'bg') {
    return (
      `Уважаеми ${input.contactName || 'дами и господа'},\n\n` +
      `Благодарим Ви за запитването и с удоволствие Ви представяме приложената оферта.\n` +
      `Ще се радваме да получим Вашата обратна връзка в рамките на една седмица.\n` +
      `При въпроси, коментари или нужда от допълнителна информация или съдействие от наша страна, не се колебайте да се свържете с нас.\n` +
      linkBg +
      `\nС уважение,\n${company}\n`
    )
  }
  return (
    `Dear ${input.contactName || 'Sir/Madam'},\n\n` +
    `We thank you for your inquiry and are pleased to place the following offer, attached.\n` +
    `We will be glad to have your feedback within a week.\n` +
    `In case you have any questions or comments, or need additional information or assistance from our side, feel free to contact us.\n` +
    linkEn +
    `\nBest regards,\n${company}\n`
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
  // Re-send: an already-sent offer goes out again (same content, new link) —
  // no approval gate, and the version is not transitioned again.
  const resend = input.resend === true
  if (resend) {
    if (version.status !== 'sent') return { ok: /** @type {const} */ (false), code: 'not_sent' }
  } else {
    if (version.status !== 'approved') {
      return { ok: /** @type {const} */ (false), code: 'not_approved' }
    }
    const approvals = selectQuoteApprovals(db, version.id)
    if (!approvals.some((a) => a.decision === 'approved')) {
      return { ok: /** @type {const} */ (false), code: 'not_approved' }
    }
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
    attachmentIds: [pdfDoc.id, ...(input.attachmentIds ?? [])],
  })

  if (resend) {
    // Keep the offer 'sent'; just record the latest dispatch time.
    patchQuoteVersion(db, version.id, { sentAt: email.sentAt })
  } else {
    patchQuoteVersion(db, version.id, {
      status: 'sent',
      sentAt: email.sentAt,
      lockedAt: email.sentAt,
    })
    patchQuote(db, quote.id, { status: 'sent' })
  }

  appendAuditEntry(db, {
    productId: quote.productId,
    entityType: 'quoteSend',
    entityId: email.id,
    action: resend ? 'quote.resent' : 'quote.sent',
    actorId: input.actorId,
    meta: { subject, to: input.to, versionNo: version.versionNo, acceptanceLink, resend },
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
