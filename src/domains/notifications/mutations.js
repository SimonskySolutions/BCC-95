let notifCounter = 50000

/**
 * Reseed the notification id counter past existing rows (counters reset on load
 * but data persists).
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 */
export function syncCounters(db) {
  let max = 50000
  for (const n of db.notifications ?? []) {
    const v = Number(String(n?.id ?? '').replace(/^\D+/, ''))
    if (Number.isFinite(v) && v > max) max = v
  }
  notifCounter = max
}

/**
 * Add a notification for a user.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {{ userId: string, type?: string, title: string, body?: string, link?: object, fromId?: string }} input
 */
export function appendNotification(db, input) {
  if (!db.notifications) db.notifications = []
  const n = {
    id: `ntf-${++notifCounter}`,
    userId: input.userId,
    type: input.type ?? 'mention',
    title: input.title,
    body: input.body,
    link: input.link,
    fromId: input.fromId,
    read: false,
    createdAt: new Date().toISOString(),
  }
  db.notifications.push(n)
  return n
}

/** @param {import('../../data/mockDatabase.js').MockDatabase} db */
export function markNotificationRead(db, id) {
  const n = (db.notifications ?? []).find((x) => x.id === id)
  if (n) n.read = true
}

/** @param {import('../../data/mockDatabase.js').MockDatabase} db */
export function markAllNotificationsRead(db, userId) {
  for (const n of db.notifications ?? []) if (n.userId === userId) n.read = true
}
