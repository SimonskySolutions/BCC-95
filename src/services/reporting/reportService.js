import { selectQuoteVersions, selectQuoteLineItems } from '../../domains/quotations/selectors.js'

/**
 * @typedef {Object} ReportFilters
 * @property {string} [from]        — inclusive ISO date
 * @property {string} [to]          — inclusive ISO date
 * @property {string} [productId]
 * @property {string} [clientId]
 * @property {string} [employeeId]
 * @property {string} [status]
 */

/**
 * @typedef {Object} ReportColumn
 * @property {string} key
 * @property {string} label
 */

/**
 * @typedef {Object} ReportResult
 * @property {string} id
 * @property {string} title
 * @property {ReportColumn[]} columns
 * @property {Array<Record<string, string | number | null>>} rows
 * @property {ReportFilters} filters
 */

const iso = (value) => (value ? String(value).slice(0, 10) : '')

/** @param {string | undefined} date; @param {string | undefined} from; @param {string | undefined} to */
function inDateRange(date, from, to) {
  if (!date) return true
  const d = iso(date)
  if (from && d < iso(from)) return false
  if (to && d > iso(to)) return false
  return true
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {ReportFilters} filters
 * @returns {ReportResult}
 */
export function buildProductReport(db, filters) {
  const rows = db.products
    .filter((p) => !filters.productId || p.id === filters.productId)
    .map((p) => {
      const lifecycle = db.productLifecycleStates.find((s) => s.productId === p.id)
      const openTasks = db.tasks.filter((t) => t.productId === p.id && t.status !== 'resolved').length
      const totalTasks = db.tasks.filter((t) => t.productId === p.id).length
      const quotes = db.quoteDrafts.filter((q) => q.productId === p.id)
      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        status: p.status,
        phase: lifecycle?.phaseId ?? '',
        completionPercent: lifecycle?.completionPercent ?? 0,
        blocked: lifecycle?.blocked ? 'yes' : 'no',
        openTasks,
        totalTasks,
        quotes: quotes.length,
      }
    })
  return {
    id: 'products',
    title: 'Products',
    columns: [
      { key: 'sku', label: 'SKU' },
      { key: 'name', label: 'Name' },
      { key: 'status', label: 'Status' },
      { key: 'phase', label: 'Phase' },
      { key: 'completionPercent', label: 'Completion %' },
      { key: 'blocked', label: 'Blocked' },
      { key: 'openTasks', label: 'Open tasks' },
      { key: 'totalTasks', label: 'Total tasks' },
      { key: 'quotes', label: 'Quotes' },
    ],
    rows,
    filters,
  }
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {ReportFilters} filters
 * @returns {ReportResult}
 */
export function buildInquiryReport(db, filters) {
  const rows = (db.inquiries ?? [])
    .filter((i) => !filters.productId || i.productId === filters.productId)
    .filter((i) => !filters.clientId || i.customerId === filters.clientId)
    .filter((i) => inDateRange(i.receivedAt, filters.from, filters.to))
    .map((i) => ({
      id: i.id,
      productId: i.productId,
      customerId: i.customerId,
      channel: i.channel,
      status: i.status,
      receivedAt: iso(i.receivedAt),
      requestedQuantity: i.requestedQuantity ?? null,
      requestedDeadline: iso(i.requestedDeadline),
      feasibilityResult: i.feasibilityResult ?? '',
      missing: (i.missingFields ?? []).join(','),
    }))
  return {
    id: 'inquiries',
    title: 'Inquiries',
    columns: [
      { key: 'id', label: 'Inquiry ID' },
      { key: 'productId', label: 'Product' },
      { key: 'customerId', label: 'Customer' },
      { key: 'channel', label: 'Channel' },
      { key: 'status', label: 'Status' },
      { key: 'receivedAt', label: 'Received' },
      { key: 'requestedQuantity', label: 'Qty' },
      { key: 'requestedDeadline', label: 'Deadline' },
      { key: 'feasibilityResult', label: 'Feasibility' },
      { key: 'missing', label: 'Missing' },
    ],
    rows,
    filters,
  }
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {ReportFilters} filters
 * @returns {ReportResult}
 */
export function buildOfferReport(db, filters) {
  const rows = db.quoteDrafts
    .filter((q) => !filters.productId || q.productId === filters.productId)
    .filter((q) => !filters.clientId || q.clientId === filters.clientId)
    .filter((q) => !filters.status || q.status === filters.status)
    .filter((q) => inDateRange(q.updatedAt, filters.from, filters.to))
    .map((q) => {
      const versions = selectQuoteVersions(db, q.id)
      const lastSent = [...versions].reverse().find((v) => v.status === 'sent' || v.status === 'decided')
      return {
        id: q.id,
        productId: q.productId,
        clientId: q.clientId,
        status: q.status,
        currentVersionNo: q.currentVersionNo ?? 0,
        subtotal: q.subtotal,
        margin: q.marginPercent,
        currency: q.currency ?? 'EUR',
        updatedAt: q.updatedAt,
        sentAt: iso(lastSent?.sentAt),
        totalVersions: versions.length,
      }
    })
  return {
    id: 'offers',
    title: 'Offers',
    columns: [
      { key: 'id', label: 'Quote ID' },
      { key: 'productId', label: 'Product' },
      { key: 'clientId', label: 'Customer' },
      { key: 'status', label: 'Status' },
      { key: 'currentVersionNo', label: 'Version' },
      { key: 'subtotal', label: 'Subtotal' },
      { key: 'margin', label: 'Margin %' },
      { key: 'currency', label: 'Currency' },
      { key: 'updatedAt', label: 'Updated' },
      { key: 'sentAt', label: 'Sent' },
      { key: 'totalVersions', label: 'Versions' },
    ],
    rows,
    filters,
  }
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {ReportFilters} filters
 * @returns {ReportResult}
 */
export function buildOfferLineItemsReport(db, filters) {
  const rows = []
  for (const quote of db.quoteDrafts) {
    if (filters.productId && quote.productId !== filters.productId) continue
    if (filters.clientId && quote.clientId !== filters.clientId) continue
    const versions = selectQuoteVersions(db, quote.id)
    for (const v of versions) {
      const lis = selectQuoteLineItems(db, v.id)
      for (const li of lis) {
        rows.push({
          quoteId: quote.id,
          versionNo: v.versionNo,
          versionStatus: v.status,
          kind: li.kind,
          description: li.description,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          totalPrice: li.totalPrice,
          currency: v.currency ?? 'EUR',
        })
      }
    }
  }
  return {
    id: 'offerLineItems',
    title: 'Offer line items',
    columns: [
      { key: 'quoteId', label: 'Quote' },
      { key: 'versionNo', label: 'Version' },
      { key: 'versionStatus', label: 'Version status' },
      { key: 'kind', label: 'Kind' },
      { key: 'description', label: 'Description' },
      { key: 'quantity', label: 'Qty' },
      { key: 'unitPrice', label: 'Unit' },
      { key: 'totalPrice', label: 'Total' },
      { key: 'currency', label: 'Currency' },
    ],
    rows,
    filters,
  }
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {ReportFilters} filters
 * @returns {ReportResult}
 */
export function buildTasksReport(db, filters) {
  const rows = db.tasks
    .filter((t) => !filters.productId || t.productId === filters.productId)
    .filter((t) => !filters.employeeId || t.assigneeId === filters.employeeId)
    .filter((t) => !filters.status || t.status === filters.status)
    .filter((t) => inDateRange(t.dueDate, filters.from, filters.to))
    .map((t) => ({
      id: t.id,
      title: t.title,
      productId: t.productId,
      assignee: t.assigneeId,
      status: t.status,
      phase: t.phaseId,
      workstream: t.workstream,
      dueDate: t.dueDate,
      completedAt: t.completedAt ?? '',
    }))
  return {
    id: 'tasks',
    title: 'Tasks',
    columns: [
      { key: 'id', label: 'Task' },
      { key: 'title', label: 'Title' },
      { key: 'productId', label: 'Product' },
      { key: 'assignee', label: 'Assignee' },
      { key: 'status', label: 'Status' },
      { key: 'phase', label: 'Phase' },
      { key: 'workstream', label: 'Workstream' },
      { key: 'dueDate', label: 'Due' },
      { key: 'completedAt', label: 'Completed' },
    ],
    rows,
    filters,
  }
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {ReportFilters} filters
 * @returns {ReportResult}
 */
export function buildAuditReport(db, filters) {
  const rows = (db.auditEntries ?? [])
    .filter((a) => !filters.productId || a.productId === filters.productId)
    .filter((a) => inDateRange(a.at, filters.from, filters.to))
    .map((a) => ({
      at: a.at,
      productId: a.productId,
      entityType: a.entityType,
      entityId: a.entityId,
      action: a.action,
      actor: a.actorId ?? a.actorLabel ?? '',
      meta: a.meta ? JSON.stringify(a.meta) : '',
    }))
  return {
    id: 'audit',
    title: 'Audit trail',
    columns: [
      { key: 'at', label: 'When' },
      { key: 'productId', label: 'Product' },
      { key: 'entityType', label: 'Entity' },
      { key: 'entityId', label: 'ID' },
      { key: 'action', label: 'Action' },
      { key: 'actor', label: 'Actor' },
      { key: 'meta', label: 'Meta' },
    ],
    rows,
    filters,
  }
}

/**
 * @typedef {'products' | 'inquiries' | 'offers' | 'offerLineItems' | 'tasks' | 'audit'} ReportId
 */

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {ReportId} id
 * @param {ReportFilters} filters
 */
export function runReport(db, id, filters) {
  switch (id) {
    case 'products':
      return buildProductReport(db, filters)
    case 'inquiries':
      return buildInquiryReport(db, filters)
    case 'offers':
      return buildOfferReport(db, filters)
    case 'offerLineItems':
      return buildOfferLineItemsReport(db, filters)
    case 'tasks':
      return buildTasksReport(db, filters)
    case 'audit':
      return buildAuditReport(db, filters)
    default:
      return buildProductReport(db, filters)
  }
}

/** @type {{ id: ReportId; titleKey: string }[]} */
export const REPORT_CATALOG = [
  { id: 'products', titleKey: 'reports.products' },
  { id: 'inquiries', titleKey: 'reports.inquiries' },
  { id: 'offers', titleKey: 'reports.offers' },
  { id: 'offerLineItems', titleKey: 'reports.offerLineItems' },
  { id: 'tasks', titleKey: 'reports.tasks' },
  { id: 'audit', titleKey: 'reports.audit' },
]
