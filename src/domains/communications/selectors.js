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
 * The discussion thread for a quotation (or product fallback), oldest first.
 * @param {{ inquiryMessages?: import('./model.js').InquiryMessage[] }} db
 * @param {string} threadKey
 */
export function selectInquiryMessages(db, threadKey) {
  return (db.inquiryMessages ?? [])
    .filter((m) => m.threadKey === threadKey)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
}

/**
 * Distinct tags used across a thread, for the filter bar.
 * @param {{ inquiryMessages?: import('./model.js').InquiryMessage[] }} db
 * @param {string} threadKey
 */
export function selectInquiryThreadTags(db, threadKey) {
  const tags = new Set()
  for (const m of selectInquiryMessages(db, threadKey)) {
    for (const tag of m.tags ?? []) tags.add(tag)
  }
  return [...tags].sort()
}

/**
 * Sub-channels (discussions) of a product's channel, oldest first.
 * @param {{ discussionChannels?: import('./model.js').DiscussionChannel[] }} db
 * @param {string} productId
 */
export function selectDiscussionChannels(db, productId) {
  return (db.discussionChannels ?? [])
    .filter((c) => c.productId === productId)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
}
