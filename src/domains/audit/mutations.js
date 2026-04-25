let idCounter = 10000

/**
 * Append an entry to the audit trail. Used by every offer state transition so
 * the process can be replayed on the Product Workspace Timeline.
 * @param {{ auditEntries: import('./model.js').AuditEntry[] }} db
 * @param {Omit<import('./model.js').AuditEntry, 'id' | 'at'> & { id?: string; at?: string }} entry
 * @returns {import('./model.js').AuditEntry}
 */
export function appendAuditEntry(db, entry) {
  const finalEntry = /** @type {import('./model.js').AuditEntry} */ ({
    id: entry.id ?? `audit-${++idCounter}`,
    at: entry.at ?? new Date().toISOString(),
    productId: entry.productId,
    entityType: entry.entityType,
    entityId: entry.entityId,
    action: entry.action,
    actorId: entry.actorId,
    actorLabel: entry.actorLabel,
    meta: entry.meta,
  })
  db.auditEntries.push(finalEntry)
  return finalEntry
}
