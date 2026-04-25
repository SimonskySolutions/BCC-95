import { selectQuoteById } from '../../domains/quotations/selectors.js'

/**
 * VSM phase 1.4 — mandatory quotation tasks (taskKey convention per product).
 * @param {string} productId
 * @returns {string[]}
 */
export function mandatoryQuotationTaskKeysForProduct(productId) {
  return [`quote-tech-review-${productId}`, `quote-costing-${productId}`]
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {{ quoteId: string; productId: string }} params
 */
export function evaluateQuotationTaskReadiness(db, { quoteId, productId }) {
  const requiredKeys = mandatoryQuotationTaskKeysForProduct(productId)
  const quoteTasks = db.tasks.filter(
    (t) => t.quoteId === quoteId && t.workstream === 'quotation',
  )
  const pending = []
  for (const key of requiredKeys) {
    const t = quoteTasks.find((x) => x.taskKey === key)
    if (!t || t.status !== 'resolved') {
      pending.push(key)
    }
  }
  return {
    ready: pending.length === 0,
    pendingKeys: pending,
    quoteTasks,
  }
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {{ clientId: string; productId: string; quoteId?: string }} params
 * @returns
 *   | { ok: true; draft: import('../../domains/quotations/model.js').QuoteDraft & { basis: string } }
 *   | { ok: false; code: string; pendingKeys?: string[] }
 */
export function generateQuoteFromReadiness(db, { clientId, productId, quoteId }) {
  const qid = quoteId ?? db.quoteDrafts.find((q) => q.clientId === clientId && q.productId === productId)?.id
  if (!qid) return { ok: false, code: 'quote_not_found' }

  const readiness = evaluateQuotationTaskReadiness(db, { quoteId: qid, productId })
  if (!readiness.ready) {
    return { ok: false, code: 'tasks_incomplete', pendingKeys: readiness.pendingKeys }
  }

  const cost = db.standardCosts.find((c) => c.productId === productId)
  const base = cost ? cost.standardCostCents / 100 : 5000
  const quote = selectQuoteById(db, qid)
  const marginPercent = quote?.marginPercent ?? 18
  const subtotal = Math.round(base * (1 + marginPercent / 100) * 100) / 100

  return {
    ok: true,
    draft: {
      id: qid,
      clientId,
      productId,
      status: 'draft',
      subtotal,
      marginPercent,
      updatedAt: new Date().toISOString().slice(0, 10),
      basis: cost ? 'standard_cost_plus_margin' : 'fallback_floor',
    },
  }
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} quoteId
 * @param {string} note
 */
export function requestPriceRevision(db, quoteId, note) {
  const q = selectQuoteById(db, quoteId)
  if (!q) return { ok: false, code: 'not_found' }
  q.status = 'revision_requested'
  q.revisionNote = note
  q.updatedAt = new Date().toISOString().slice(0, 10)
  return { ok: true, quote: q }
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} quoteId
 * @param {number} newSubtotal
 */
export function applyPriceRevision(db, quoteId, newSubtotal) {
  const q = selectQuoteById(db, quoteId)
  if (!q) return { ok: false, code: 'not_found' }
  q.subtotal = newSubtotal
  q.status = 'draft'
  q.revisionNote = undefined
  q.updatedAt = new Date().toISOString().slice(0, 10)
  return { ok: true, quote: q }
}
