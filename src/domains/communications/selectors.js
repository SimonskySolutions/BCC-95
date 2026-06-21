/**
 * @param {{ outboundEmails: import('./model.js').OutboundEmail[] }} db
 * @param {string} productId
 */
export function selectEmailsByProduct(db, productId) {
  return (db.outboundEmails ?? [])
    .filter((m) => m.productId === productId)
    .sort((a, b) => (a.sentAt < b.sentAt ? 1 : -1))
}

/**
 * @param {{ outboundEmails: import('./model.js').OutboundEmail[] }} db
 * @param {string} quoteVersionId
 */
export function selectEmailsByQuoteVersion(db, quoteVersionId) {
  return (db.outboundEmails ?? [])
    .filter((m) => m.quoteVersionId === quoteVersionId)
    .sort((a, b) => (a.sentAt < b.sentAt ? 1 : -1))
}

/**
 * The discussion thread for an inquiry, oldest first (chat order).
 * @param {{ inquiryMessages?: import('./model.js').InquiryMessage[] }} db
 * @param {string} inquiryId
 */
export function selectInquiryMessages(db, inquiryId) {
  return (db.inquiryMessages ?? [])
    .filter((m) => m.inquiryId === inquiryId)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
}

/**
 * Distinct tags used across an inquiry's thread, for the filter bar.
 * @param {{ inquiryMessages?: import('./model.js').InquiryMessage[] }} db
 * @param {string} inquiryId
 */
export function selectInquiryThreadTags(db, inquiryId) {
  const tags = new Set()
  for (const m of selectInquiryMessages(db, inquiryId)) {
    for (const tag of m.tags ?? []) tags.add(tag)
  }
  return [...tags].sort()
}
