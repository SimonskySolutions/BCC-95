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

let messageCounter = 50000

/** Parse @mentions in a message body into known employee ids. */
function parseMentions(body, employees = []) {
  const ids = new Set()
  for (const emp of employees) {
    const handle = (emp.name ?? '').split(' ')[0]
    if (handle && new RegExp(`@${handle}\\b`, 'i').test(body)) ids.add(emp.id)
  }
  return [...ids]
}

/**
 * @param {{ inquiryMessages?: import('./model.js').InquiryMessage[]; employees?: any[] }} db
 * @param {Omit<import('./model.js').InquiryMessage, 'id' | 'createdAt' | 'mentions'> & { id?: string; createdAt?: string; mentions?: string[] }} input
 */
export function appendInquiryMessage(db, input) {
  if (!db.inquiryMessages) db.inquiryMessages = []
  /** @type {import('./model.js').InquiryMessage} */
  const message = {
    id: input.id ?? `msg-${++messageCounter}`,
    threadKey: input.threadKey,
    authorId: input.authorId,
    authorLabel: input.authorLabel,
    body: input.body,
    tags: input.tags ?? [],
    mentions: input.mentions ?? parseMentions(input.body, db.employees),
    createdAt: input.createdAt ?? new Date().toISOString(),
  }
  db.inquiryMessages.push(message)
  return message
}

/**
 * @param {{ inquiryMessages?: import('./model.js').InquiryMessage[]; employees?: any[] }} db
 * @param {string} messageId
 * @param {{ body?: string; tags?: string[] }} patch
 */
export function patchInquiryMessage(db, messageId, patch) {
  if (!db.inquiryMessages) return null
  const idx = db.inquiryMessages.findIndex((m) => m.id === messageId)
  if (idx < 0) return null
  const next = { ...db.inquiryMessages[idx], ...patch, editedAt: new Date().toISOString() }
  if (patch.body !== undefined) next.mentions = parseMentions(patch.body, db.employees)
  db.inquiryMessages[idx] = next
  return next
}

/**
 * @param {{ inquiryMessages?: import('./model.js').InquiryMessage[] }} db
 * @param {string} messageId
 */
export function removeInquiryMessage(db, messageId) {
  if (!db.inquiryMessages) return
  db.inquiryMessages = db.inquiryMessages.filter((m) => m.id !== messageId)
}
