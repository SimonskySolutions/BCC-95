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
