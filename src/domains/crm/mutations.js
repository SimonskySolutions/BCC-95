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
