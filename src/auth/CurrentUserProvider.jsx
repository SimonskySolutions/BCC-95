import { useCallback, useMemo, useState } from 'react'
import { CurrentUserContext } from './CurrentUserContext.js'
import { useDb } from '../data/useDb.js'

const STORAGE_KEY = 'bcc95-current-user'

/**
 * Holds the "acting as" user (no passwords). The id is remembered in
 * localStorage; the user record + permissions come from `db.employees`, which
 * the store loads from the relational `users` table.
 *
 * @param {{ children: import('react').ReactNode }} props
 */
export function CurrentUserProvider({ children }) {
  const { db } = useDb() // re-renders when users finish loading (version bump)
  const users = useMemo(() => db.employees ?? [], [db.employees])

  const [userId, setUserIdState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || null
    } catch {
      return null
    }
  })

  const setUserId = useCallback((id) => {
    setUserIdState(id)
    try {
      localStorage.setItem(STORAGE_KEY, id)
    } catch {
      /* ignore */
    }
  }, [])

  // Resolve the active user; fall back to the first active user, then any user.
  const user =
    users.find((u) => u.id === userId && u.active !== false) ??
    users.find((u) => u.active !== false) ??
    users[0] ??
    null

  const can = useCallback(
    (perm) => {
      const perms = user?.permissions ?? []
      return perms.includes('*') || perms.includes(perm)
    },
    [user],
  )

  const value = useMemo(
    () => ({ user, userId: user?.id ?? null, setUserId, users, can }),
    [user, setUserId, users, can],
  )

  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>
}
