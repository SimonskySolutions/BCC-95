let quoteCounter = 30000
let versionCounter = 30000
let lineItemCounter = 30000
let approvalCounter = 30000
let documentCounter = 30000
let decisionCounter = 30000

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {Partial<import('./model.js').QuoteDraft> & { clientId: string; productId: string }} input
 * @returns {import('./model.js').QuoteDraft}
 */
export function appendQuote(db, input) {
  const id = input.id ?? `quote-${++quoteCounter}`
  const today = new Date().toISOString().slice(0, 10)
  /** @type {import('./model.js').QuoteDraft} */
  const quote = {
    id,
    clientId: input.clientId,
    productId: input.productId,
    inquiryId: input.inquiryId,
    status: input.status ?? 'draft',
    subtotal: input.subtotal ?? 0,
    marginPercent: input.marginPercent ?? 18,
    updatedAt: input.updatedAt ?? today,
    currency: input.currency ?? 'EUR',
    language: input.language ?? 'en',
    unitPrice: input.unitPrice,
    toolingCost: input.toolingCost,
    leadTimeDays: input.leadTimeDays,
    validUntil: input.validUntil,
    deliveryTerms: input.deliveryTerms,
    paymentTerms: input.paymentTerms,
    moq: input.moq,
  }
  db.quoteDrafts.push(quote)
  return quote
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {import('./model.js').QuoteVersion} version
 */
export function appendQuoteVersion(db, version) {
  if (!db.quoteVersions) db.quoteVersions = []
  db.quoteVersions.push(version)
  return version
}

/**
 * @param {string} quoteId
 * @param {number} versionNo
 * @param {Partial<import('./model.js').QuoteVersion>} data
 * @returns {import('./model.js').QuoteVersion}
 */
export function buildQuoteVersion(quoteId, versionNo, data) {
  return /** @type {import('./model.js').QuoteVersion} */ ({
    id: data.id ?? `qv-${++versionCounter}`,
    quoteId,
    versionNo,
    status: data.status ?? 'draft',
    createdAt: data.createdAt ?? new Date().toISOString(),
    sentAt: data.sentAt,
    lockedAt: data.lockedAt,
    supersedesVersionId: data.supersedesVersionId,
    subtotal: data.subtotal ?? 0,
    marginPercent: data.marginPercent ?? 18,
    unitPrice: data.unitPrice,
    toolingCost: data.toolingCost,
    leadTimeDays: data.leadTimeDays,
    validUntil: data.validUntil,
    deliveryTerms: data.deliveryTerms,
    paymentTerms: data.paymentTerms,
    moq: data.moq,
    currency: data.currency ?? 'EUR',
    language: data.language ?? 'en',
    notes: data.notes,
  })
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {Omit<import('./model.js').QuoteLineItem, 'id' | 'totalPrice'> & { id?: string }} input
 */
export function appendQuoteLineItem(db, input) {
  if (!db.quoteLineItems) db.quoteLineItems = []
  /** @type {import('./model.js').QuoteLineItem} */
  const item = {
    id: input.id ?? `qli-${++lineItemCounter}`,
    quoteVersionId: input.quoteVersionId,
    kind: input.kind,
    description: input.description,
    quantity: input.quantity,
    unitPrice: input.unitPrice,
    totalPrice: Math.round(input.quantity * input.unitPrice * 100) / 100,
  }
  db.quoteLineItems.push(item)
  return item
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} versionId
 */
export function clearQuoteLineItems(db, versionId) {
  if (!db.quoteLineItems) return
  db.quoteLineItems = db.quoteLineItems.filter((li) => li.quoteVersionId !== versionId)
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {Omit<import('./model.js').QuoteApproval, 'id' | 'decidedAt'> & { id?: string; decidedAt?: string }} input
 */
export function appendQuoteApproval(db, input) {
  if (!db.quoteApprovals) db.quoteApprovals = []
  /** @type {import('./model.js').QuoteApproval} */
  const approval = {
    id: input.id ?? `qa-${++approvalCounter}`,
    quoteVersionId: input.quoteVersionId,
    approverEmployeeId: input.approverEmployeeId,
    decision: input.decision,
    decidedAt: input.decidedAt ?? new Date().toISOString(),
    note: input.note,
  }
  db.quoteApprovals.push(approval)
  return approval
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {Omit<import('./model.js').QuoteDocument, 'id' | 'createdAt'> & { id?: string; createdAt?: string }} input
 */
export function appendQuoteDocument(db, input) {
  if (!db.quoteDocuments) db.quoteDocuments = []
  /** @type {import('./model.js').QuoteDocument} */
  const doc = {
    id: input.id ?? `qdoc-${++documentCounter}`,
    quoteVersionId: input.quoteVersionId,
    kind: input.kind,
    name: input.name,
    storageRef: input.storageRef,
    createdAt: input.createdAt ?? new Date().toISOString(),
  }
  db.quoteDocuments.push(doc)
  return doc
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {Omit<import('./model.js').QuoteDecision, 'id' | 'decidedAt'> & { id?: string; decidedAt?: string }} input
 */
export function appendQuoteDecision(db, input) {
  if (!db.quoteDecisions) db.quoteDecisions = []
  /** @type {import('./model.js').QuoteDecision} */
  const decision = {
    id: input.id ?? `qd-${++decisionCounter}`,
    quoteVersionId: input.quoteVersionId,
    decision: input.decision,
    decidedAt: input.decidedAt ?? new Date().toISOString(),
    customerContactName: input.customerContactName,
    customerContactEmail: input.customerContactEmail,
    comment: input.comment,
    token: input.token,
  }
  db.quoteDecisions.push(decision)
  return decision
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} quoteId
 * @param {Partial<import('./model.js').QuoteDraft>} patch
 */
export function patchQuote(db, quoteId, patch) {
  const idx = db.quoteDrafts.findIndex((q) => q.id === quoteId)
  if (idx < 0) return null
  db.quoteDrafts[idx] = { ...db.quoteDrafts[idx], ...patch, updatedAt: new Date().toISOString().slice(0, 10) }
  return db.quoteDrafts[idx]
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} versionId
 * @param {Partial<import('./model.js').QuoteVersion>} patch
 */
export function patchQuoteVersion(db, versionId, patch) {
  if (!db.quoteVersions) return null
  const idx = db.quoteVersions.findIndex((v) => v.id === versionId)
  if (idx < 0) return null
  db.quoteVersions[idx] = { ...db.quoteVersions[idx], ...patch }
  return db.quoteVersions[idx]
}
