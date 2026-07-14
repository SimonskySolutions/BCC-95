/**
 * Notifications for a user, newest first.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} userId
 */
export function selectNotifications(db, userId) {
  return (db.notifications ?? [])
    .filter((n) => n.userId === userId)
    .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))
}

/** Unread count for a user. */
export function selectUnreadCount(db, userId) {
  return (db.notifications ?? []).filter((n) => n.userId === userId && !n.read).length
}
