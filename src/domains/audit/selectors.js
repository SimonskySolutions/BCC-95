/**
 * @param {{ auditEntries: import('./model.js').AuditEntry[] }} db
 * @param {string} productId
 */
export function selectAuditByProduct(db, productId) {
  return db.auditEntries
    .filter((entry) => entry.productId === productId)
    .sort((a, b) => (a.at < b.at ? -1 : 1))
}

/**
 * @param {{ auditEntries: import('./model.js').AuditEntry[] }} db
 * @param {import('./model.js').AuditEntityType} entityType
 * @param {string} entityId
 */
export function selectAuditForEntity(db, entityType, entityId) {
  return db.auditEntries
    .filter((entry) => entry.entityType === entityType && entry.entityId === entityId)
    .sort((a, b) => (a.at < b.at ? -1 : 1))
}
