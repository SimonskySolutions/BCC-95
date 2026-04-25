/** @type {import('./model.js').AuditEntry[]} */
export const auditEntries = [
  {
    id: 'audit-seed-1',
    productId: 'prod-1',
    entityType: 'inquiry',
    entityId: 'inq-seed-1',
    action: 'inquiry.received',
    actorId: 'emp-3',
    at: '2026-04-01T08:10:00.000Z',
    meta: { channel: 'email' },
  },
  {
    id: 'audit-seed-2',
    productId: 'prod-1',
    entityType: 'inquiry',
    entityId: 'inq-seed-1',
    action: 'inquiry.intakeComplete',
    actorId: 'emp-3',
    at: '2026-04-02T09:20:00.000Z',
  },
  {
    id: 'audit-seed-3',
    productId: 'prod-1',
    entityType: 'quote',
    entityId: 'quote-1',
    action: 'quote.drafted',
    actorId: 'emp-1',
    at: '2026-04-08T12:00:00.000Z',
  },
]
