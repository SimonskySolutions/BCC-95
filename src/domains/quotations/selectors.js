/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} quoteId
 */
export function selectQuoteById(db, quoteId) {
  return db.quoteDrafts.find((q) => q.id === quoteId)
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} productId
 */
export function selectQuotesByProduct(db, productId) {
  return db.quoteDrafts.filter((q) => q.productId === productId)
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} clientId
 */
export function selectQuotesByClient(db, clientId) {
  return db.quoteDrafts.filter((q) => q.clientId === clientId)
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} quoteId
 */
export function selectQuoteVersions(db, quoteId) {
  return (db.quoteVersions ?? [])
    .filter((v) => v.quoteId === quoteId)
    .sort((a, b) => a.versionNo - b.versionNo)
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} versionId
 */
export function selectQuoteVersionById(db, versionId) {
  return (db.quoteVersions ?? []).find((v) => v.id === versionId)
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} versionId
 */
export function selectQuoteLineItems(db, versionId) {
  return (db.quoteLineItems ?? []).filter((li) => li.quoteVersionId === versionId)
}

/**
 * Customer-facing offer lines for a version, in display order.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} versionId
 */
export function selectQuoteOfferLines(db, versionId) {
  return (db.quoteOfferLines ?? [])
    .filter((l) => l.quoteVersionId === versionId)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
}

/**
 * Net total of one offer line: confirmed (or requested) qty × unit price,
 * minus the per-line discount.
 * @param {import('./model.js').QuoteOfferLine} line
 */
export function offerLineNetTotal(line) {
  const qty = Number(line.confirmedQty ?? line.requestedQty) || 0
  const gross = qty * (Number(line.unitPrice) || 0)
  const disc = Number(line.discountPercent) || 0
  return gross * (1 - disc / 100)
}

/**
 * Total of the customer-facing offer lines (discount-aware).
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} versionId
 */
export function selectOfferLinesTotal(db, versionId) {
  return selectQuoteOfferLines(db, versionId).reduce((sum, l) => sum + offerLineNetTotal(l), 0)
}

/** @param {import('../../data/mockDatabase.js').MockDatabase} db */
export function selectTermsOfDelivery(db) {
  return db.termsOfDelivery ?? []
}

/** @param {import('../../data/mockDatabase.js').MockDatabase} db */
export function selectTermsOfPayment(db) {
  return db.termsOfPayment ?? []
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} versionId
 */
export function selectQuoteApprovals(db, versionId) {
  return (db.quoteApprovals ?? []).filter((a) => a.quoteVersionId === versionId)
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} versionId
 */
export function selectQuoteDocuments(db, versionId) {
  return (db.quoteDocuments ?? []).filter((d) => d.quoteVersionId === versionId)
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} token
 */
export function selectQuoteVersionByToken(db, token) {
  const decision = (db.quoteDecisions ?? []).find((d) => d.token === token)
  if (decision) return selectQuoteVersionById(db, decision.quoteVersionId)
  const doc = (db.quoteDocuments ?? []).find(
    (d) => d.kind === 'acceptance_receipt' && d.storageRef === token,
  )
  if (doc) return selectQuoteVersionById(db, doc.quoteVersionId)
  return undefined
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} versionId
 */
export function selectQuoteDecision(db, versionId) {
  return (db.quoteDecisions ?? []).find((d) => d.quoteVersionId === versionId)
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} quoteId
 */
export function selectQuoteBundle(db, quoteId) {
  const quote = selectQuoteById(db, quoteId)
  if (!quote) return null
  const versions = selectQuoteVersions(db, quoteId)
  const currentVersion = quote.currentVersionId
    ? selectQuoteVersionById(db, quote.currentVersionId)
    : versions[versions.length - 1]
  return { quote, versions, currentVersion }
}
