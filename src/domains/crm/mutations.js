/**
 * CRM mutations. For Release 1 we only need inline client creation from the
 * inquiry-first flow; deeper CRM edit flows live in `[CRMPage](../../pages/CRMPage.jsx)`.
 */

function newClientId() {
  const rand = Math.random().toString(36).slice(2, 8)
  return `client-${Date.now().toString(36)}-${rand}`
}

/**
 * @typedef {Object} ClientCreateInput
 * @property {string} name
 * @property {string} [segment]       — defaults to 'new'
 * @property {string} [region]        — defaults to 'unknown'
 * @property {string} [contactName]
 * @property {string} [contactEmail]
 * @property {string} [country]
 * @property {string} [city]
 * @property {string} [notes]
 * @property {string} [id]            — tests only
 */

/**
 * Append a new client to the DB and return the inserted record.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {ClientCreateInput} input
 * @returns {import('./model.js').Client}
 */
export function appendClient(db, input) {
  const client = /** @type {import('./model.js').Client} */ ({
    id: input.id ?? newClientId(),
    name: input.name,
    segment: input.segment ?? 'new',
    region: input.region ?? 'unknown',
    contactName: input.contactName,
    contactEmail: input.contactEmail,
    country: input.country,
    city: input.city,
    address: input.address,
    eik: input.eik,
    vat: input.vat,
    spokenLanguage: input.spokenLanguage,
    notes: input.notes,
    // Seed the structured contacts list too — the offer header's contact
    // dropdown reads contacts[], not the legacy flat fields.
    contacts: input.contactName
      ? [{ id: `cct-${Date.now().toString(36)}`, name: input.contactName, email: input.contactEmail }]
      : [],
  })
  db.clients.push(client)
  return client
}

let orderCounter = 40000
let orderLineCounter = 40000
let contactCounter = 40000
let addressCounter = 40000

const maxNum = (base, ...arrays) => {
  let max = base
  for (const arr of arrays) for (const x of arr ?? []) {
    const n = Number(String(x?.id ?? '').replace(/^\D+/, ''))
    if (Number.isFinite(n) && n > max) max = n
  }
  return max
}

/**
 * Reseed CRM id counters past existing data (counters reset on page load but
 * data persists). Call once after the db loads.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 */
export function syncCounters(db) {
  orderCounter = maxNum(40000, db.clientOrders)
  orderLineCounter = maxNum(40000, db.orderLines)
  const allContacts = (db.clients ?? []).flatMap((c) => c.contacts ?? [])
  const allAddresses = (db.clients ?? []).flatMap((c) => c.addresses ?? [])
  contactCounter = maxNum(40000, allContacts)
  addressCounter = maxNum(40000, allAddresses)
}

/**
 * Patch a client's editable fields.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} clientId
 * @param {Partial<import('./model.js').Client>} patch
 */
export function patchClient(db, clientId, patch) {
  const idx = db.clients.findIndex((c) => c.id === clientId)
  if (idx < 0) return null
  db.clients[idx] = { ...db.clients[idx], ...patch }
  return db.clients[idx]
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} clientId
 * @param {Omit<import('./model.js').ClientContact, 'id'> & { id?: string }} input
 */
export function appendClientContact(db, clientId, input) {
  const client = db.clients.find((c) => c.id === clientId)
  if (!client) return null
  const contact = { id: input.id ?? `cct-${++contactCounter}`, ...input }
  client.contacts = [...(client.contacts ?? []), contact]
  return contact
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} clientId
 * @param {string} contactId
 */
export function removeClientContact(db, clientId, contactId) {
  const client = db.clients.find((c) => c.id === clientId)
  if (!client?.contacts) return
  client.contacts = client.contacts.filter((x) => x.id !== contactId)
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} clientId
 * @param {Omit<import('./model.js').ClientAddress, 'id'> & { id?: string }} input
 */
export function appendClientAddress(db, clientId, input) {
  const client = db.clients.find((c) => c.id === clientId)
  if (!client) return null
  const address = { id: input.id ?? `cad-${++addressCounter}`, ...input }
  client.addresses = [...(client.addresses ?? []), address]
  return address
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} clientId
 * @param {string} addressId
 */
export function removeClientAddress(db, clientId, addressId) {
  const client = db.clients.find((c) => c.id === clientId)
  if (!client?.addresses) return
  client.addresses = client.addresses.filter((x) => x.id !== addressId)
}

/**
 * Create a client order header.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {{ id?: string; clientId: string; productId: string; orderedAt?: string; status?: import('./model.js').ClientOrder['status']; quoteId?: string }} input
 * @returns {import('./model.js').ClientOrder}
 */
export function appendClientOrder(db, input) {
  if (!db.clientOrders) db.clientOrders = []
  /** @type {import('./model.js').ClientOrder} */
  const order = {
    id: input.id ?? `ord-${++orderCounter}`,
    clientId: input.clientId,
    productId: input.productId,
    orderedAt: input.orderedAt ?? new Date().toISOString().slice(0, 10),
    status: input.status ?? 'open',
    quoteId: input.quoteId,
  }
  db.clientOrders.push(order)
  return order
}

/**
 * Add a line to a client order.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {{ id?: string; orderId: string; description: string; qty: number; unitPrice: number }} input
 * @returns {import('./model.js').OrderLine}
 */
export function appendOrderLine(db, input) {
  if (!db.orderLines) db.orderLines = []
  /** @type {import('./model.js').OrderLine} */
  const line = {
    id: input.id ?? `ol-${++orderLineCounter}`,
    orderId: input.orderId,
    description: input.description,
    qty: input.qty,
    unitPrice: input.unitPrice,
  }
  db.orderLines.push(line)
  return line
}

/**
 * Find a client by case-insensitive name match (used to avoid duplicate inline
 * creations when the same customer submits multiple inquiries).
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} name
 */
export function findClientByName(db, name) {
  const needle = String(name).trim().toLowerCase()
  if (!needle) return undefined
  return db.clients.find((c) => c.name.trim().toLowerCase() === needle)
}

// ── Production execution + invoicing (write side of the client profile) ─────

const newRecId = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

/**
 * Log an execution milestone against a client order.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {{ orderId: string; milestone: string; completedAt?: string; notes?: string }} input
 */
export function appendOrderExecutionRecord(db, input) {
  const milestone = String(input.milestone ?? '').trim()
  if (!input.orderId || !milestone) return null
  if (!db.orderExecutionRecords) db.orderExecutionRecords = []
  const rec = {
    id: newRecId('oex'),
    orderId: input.orderId,
    milestone,
    completedAt: input.completedAt ?? new Date().toISOString().slice(0, 10),
    notes: String(input.notes ?? '').trim() || undefined,
  }
  db.orderExecutionRecords.push(rec)
  return rec
}

/**
 * Log machine hours against a client order.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {{ orderId: string; machineId: string; hours: number }} input
 */
export function appendOrderMachineUsage(db, input) {
  const hours = Number(input.hours)
  if (!input.orderId || !input.machineId || !(hours > 0)) return null
  if (!db.orderMachineUsages) db.orderMachineUsages = []
  const rec = { id: newRecId('omu'), orderId: input.orderId, machineId: input.machineId, hours }
  db.orderMachineUsages.push(rec)
  return rec
}

/**
 * Log planned-vs-actual hours for a phase of a client order.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {{ orderId: string; phase: string; plannedHours: number; actualHours: number }} input
 */
export function appendOrderTimeLog(db, input) {
  const phase = String(input.phase ?? '').trim()
  if (!input.orderId || !phase) return null
  if (!db.orderTimeLogs) db.orderTimeLogs = []
  const rec = {
    id: newRecId('otl'),
    orderId: input.orderId,
    phase,
    plannedHours: Number(input.plannedHours) || 0,
    actualHours: Number(input.actualHours) || 0,
  }
  db.orderTimeLogs.push(rec)
  return rec
}

/**
 * Report an issue on a client order.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {{ orderId: string; severity?: string; description: string }} input
 */
export function appendOrderIssue(db, input) {
  const description = String(input.description ?? '').trim()
  if (!input.orderId || !description) return null
  if (!db.orderIssues) db.orderIssues = []
  const rec = {
    id: newRecId('oiss'),
    orderId: input.orderId,
    severity: input.severity ?? 'medium',
    description,
    reportedAt: new Date().toISOString().slice(0, 10),
    status: /** @type {'open'} */ ('open'),
  }
  db.orderIssues.push(rec)
  return rec
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} issueId
 */
export function resolveOrderIssue(db, issueId) {
  const issue = (db.orderIssues ?? []).find((i) => i.id === issueId)
  if (issue) issue.status = 'resolved'
  return issue
}

/** Next human invoice number: INV-YYYY-NNNN. */
export function nextInvoiceNo(db) {
  const year = new Date().getFullYear()
  const prefix = `INV-${year}-`
  let max = 0
  for (const inv of db.invoices ?? []) {
    if (typeof inv.id === 'string' && inv.id.startsWith(prefix)) {
      const n = Number(inv.id.slice(prefix.length))
      if (Number.isFinite(n) && n > max) max = n
    }
  }
  return `${prefix}${String(max + 1).padStart(4, '0')}`
}

/**
 * Issue an invoice for a client order.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {{ orderId: string; clientId: string; amount: number; issuedAt?: string; dueAt: string }} input
 */
export function appendInvoice(db, input) {
  const amount = Number(input.amount)
  if (!input.orderId || !input.clientId || !(amount > 0) || !input.dueAt) return null
  if (!db.invoices) db.invoices = []
  const invoice = {
    id: nextInvoiceNo(db),
    orderId: input.orderId,
    clientId: input.clientId,
    amount,
    issuedAt: input.issuedAt ?? new Date().toISOString().slice(0, 10),
    dueAt: input.dueAt,
  }
  db.invoices.push(invoice)
  return invoice
}

/**
 * Record a payment against an invoice; punctuality (daysLate) is derived from
 * the invoice's due date.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {{ invoiceId: string; amount?: number; paidAt?: string }} input
 */
export function appendPaymentRecord(db, input) {
  const invoice = (db.invoices ?? []).find((i) => i.id === input.invoiceId)
  if (!invoice) return null
  const paidAt = input.paidAt ?? new Date().toISOString().slice(0, 10)
  const daysLate = Math.max(0, Math.round((new Date(paidAt) - new Date(invoice.dueAt)) / 86400000))
  if (!db.paymentRecords) db.paymentRecords = []
  const payment = {
    id: newRecId('pay'),
    invoiceId: invoice.id,
    clientId: invoice.clientId,
    amount: Number(input.amount) || invoice.amount,
    paidAt,
    daysLate,
  }
  db.paymentRecords.push(payment)
  return payment
}
