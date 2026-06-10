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
    notes: input.notes,
  })
  db.clients.push(client)
  return client
}

let orderCounter = 40000
let orderLineCounter = 40000
let contactCounter = 40000
let addressCounter = 40000

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
