let quoteCounter = 30000
let versionCounter = 30000
let lineItemCounter = 30000
let approvalCounter = 30000
let documentCounter = 30000
let decisionCounter = 30000
let offerLineCounter = 30000
let termCounter = 30000
let costSheetCounter = 30000
let costSheetLineCounter = 30000

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
    offerNo: input.offerNo,
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
    customerOrderRef: data.customerOrderRef,
    contactPersonId: data.contactPersonId,
    contactName: data.contactName,
    contactTitle: data.contactTitle,
    deliveryAddress: data.deliveryAddress,
    termsOfDeliveryId: data.termsOfDeliveryId,
    termsOfPaymentId: data.termsOfPaymentId,
    orderDate: data.orderDate,
    dispatchDate: data.dispatchDate,
    createdBy: data.createdBy,
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
 * @param {string} documentId
 * @param {Partial<import('./model.js').QuoteDocument>} patch
 */
export function patchQuoteDocument(db, documentId, patch) {
  if (!db.quoteDocuments) return null
  const idx = db.quoteDocuments.findIndex((d) => d.id === documentId)
  if (idx < 0) return null
  db.quoteDocuments[idx] = { ...db.quoteDocuments[idx], ...patch }
  return db.quoteDocuments[idx]
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} documentId
 */
export function removeQuoteDocument(db, documentId) {
  if (!db.quoteDocuments) return
  db.quoteDocuments = db.quoteDocuments.filter((d) => d.id !== documentId)
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

/* ── Customer-facing offer lines ─────────────────────────────────────────── */

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {Omit<import('./model.js').QuoteOfferLine, 'id'> & { id?: string }} input
 * @returns {import('./model.js').QuoteOfferLine}
 */
export function appendQuoteOfferLine(db, input) {
  if (!db.quoteOfferLines) db.quoteOfferLines = []
  /** @type {import('./model.js').QuoteOfferLine} */
  const line = {
    id: input.id ?? `qol-${++offerLineCounter}`,
    quoteVersionId: input.quoteVersionId,
    productId: input.productId,
    description: input.description ?? '',
    uom: input.uom,
    requestedQty: input.requestedQty ?? 0,
    requestedDate: input.requestedDate,
    confirmedQty: input.confirmedQty,
    confirmedDate: input.confirmedDate,
    unitPrice: input.unitPrice ?? 0,
    exwUnitPrice: input.exwUnitPrice,
    priceCurrency: input.priceCurrency,
    discountPercent: input.discountPercent,
    requirements: input.requirements,
    remark: input.remark,
    sortOrder: input.sortOrder ?? db.quoteOfferLines.filter((l) => l.quoteVersionId === input.quoteVersionId).length,
  }
  db.quoteOfferLines.push(line)
  return line
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} lineId
 * @param {Partial<import('./model.js').QuoteOfferLine>} patch
 */
export function patchQuoteOfferLine(db, lineId, patch) {
  if (!db.quoteOfferLines) return null
  const idx = db.quoteOfferLines.findIndex((l) => l.id === lineId)
  if (idx < 0) return null
  db.quoteOfferLines[idx] = { ...db.quoteOfferLines[idx], ...patch }
  return db.quoteOfferLines[idx]
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} lineId
 */
export function removeQuoteOfferLine(db, lineId) {
  if (!db.quoteOfferLines) return
  db.quoteOfferLines = db.quoteOfferLines.filter((l) => l.id !== lineId)
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} versionId
 */
export function clearQuoteOfferLines(db, versionId) {
  if (!db.quoteOfferLines) return
  db.quoteOfferLines = db.quoteOfferLines.filter((l) => l.quoteVersionId !== versionId)
}

/* ── Terms lookups ───────────────────────────────────────────────────────── */

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {'termsOfDelivery'|'termsOfPayment'} table
 * @param {{ id?: string; code?: string; label: string }} input
 */
export function appendTerm(db, table, input) {
  if (!db[table]) db[table] = []
  const term = { id: input.id ?? `term-${++termCounter}`, code: input.code, label: input.label }
  db[table].push(term)
  return term
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {'termsOfDelivery'|'termsOfPayment'} table
 * @param {string} id
 * @param {{ code?: string; label?: string }} patch
 */
export function patchTerm(db, table, id, patch) {
  if (!db[table]) return null
  const idx = db[table].findIndex((tm) => tm.id === id)
  if (idx < 0) return null
  db[table][idx] = { ...db[table][idx], ...patch }
  return db[table][idx]
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {'termsOfDelivery'|'termsOfPayment'} table
 * @param {string} id
 */
export function removeTerm(db, table, id) {
  if (!db[table]) return
  db[table] = db[table].filter((tm) => tm.id !== id)
}

/* ── Working cost sheet ──────────────────────────────────────────────────── */

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {Omit<import('./model.js').CostSheet, 'id' | 'updatedAt'> & { id?: string; updatedAt?: string }} input
 */
export function appendCostSheet(db, input) {
  if (!db.costSheets) db.costSheets = []
  /** @type {import('./model.js').CostSheet} */
  const sheet = {
    id: input.id ?? `cs-${++costSheetCounter}`,
    quoteId: input.quoteId,
    productId: input.productId,
    productLabel: input.productLabel,
    productDescription: input.productDescription,
    currency: input.currency ?? 'EUR',
    marginPercent: input.marginPercent ?? 10,
    annualQty: input.annualQty,
    toolingMode: input.toolingMode ?? 'amortise',
    amortisationUnits: input.amortisationUnits,
    priceBreaks: input.priceBreaks ?? [],
    notes: input.notes,
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  }
  db.costSheets.push(sheet)
  return sheet
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} sheetId
 * @param {Partial<import('./model.js').CostSheet>} patch
 */
export function patchCostSheet(db, sheetId, patch) {
  if (!db.costSheets) return null
  const idx = db.costSheets.findIndex((s) => s.id === sheetId)
  if (idx < 0) return null
  db.costSheets[idx] = { ...db.costSheets[idx], ...patch, updatedAt: new Date().toISOString() }
  return db.costSheets[idx]
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {Omit<import('./model.js').CostSheetLine, 'id'> & { id?: string }} input
 */
export function appendCostSheetLine(db, input) {
  if (!db.costSheetLines) db.costSheetLines = []
  /** @type {import('./model.js').CostSheetLine} */
  const line = {
    ...input,
    id: input.id ?? `csl-${++costSheetLineCounter}`,
    sortOrder:
      input.sortOrder ??
      db.costSheetLines.filter((l) => l.costSheetId === input.costSheetId).length,
  }
  db.costSheetLines.push(line)
  return line
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} lineId
 * @param {Partial<import('./model.js').CostSheetLine>} patch
 */
export function patchCostSheetLine(db, lineId, patch) {
  if (!db.costSheetLines) return null
  const idx = db.costSheetLines.findIndex((l) => l.id === lineId)
  if (idx < 0) return null
  db.costSheetLines[idx] = { ...db.costSheetLines[idx], ...patch }
  return db.costSheetLines[idx]
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} lineId
 */
export function removeCostSheetLine(db, lineId) {
  if (!db.costSheetLines) return
  db.costSheetLines = db.costSheetLines.filter((l) => l.id !== lineId)
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
