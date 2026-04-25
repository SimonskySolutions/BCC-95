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
