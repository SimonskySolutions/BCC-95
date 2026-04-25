let idCounter = 40000

/**
 * @param {{ outboundEmails?: import('./model.js').OutboundEmail[] }} db
 * @param {Omit<import('./model.js').OutboundEmail, 'id' | 'sentAt' | 'status' | 'transport'> & { id?: string; sentAt?: string; status?: 'queued' | 'sent' | 'failed'; transport?: 'mock' | 'smtp' | 'sendgrid' }} input
 */
export function appendOutboundEmail(db, input) {
  if (!db.outboundEmails) db.outboundEmails = []
  /** @type {import('./model.js').OutboundEmail} */
  const email = {
    id: input.id ?? `email-${++idCounter}`,
    productId: input.productId,
    quoteVersionId: input.quoteVersionId,
    from: input.from,
    to: input.to,
    cc: input.cc,
    subject: input.subject,
    body: input.body,
    language: input.language,
    acceptanceLink: input.acceptanceLink,
    attachmentIds: input.attachmentIds,
    sentAt: input.sentAt ?? new Date().toISOString(),
    transport: input.transport ?? 'mock',
    status: input.status ?? 'sent',
  }
  db.outboundEmails.push(email)
  return email
}
