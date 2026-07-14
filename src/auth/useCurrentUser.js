import { useContext } from 'react'
import { CurrentUserContext } from './CurrentUserContext.js'

/** Access the current acting user and `can(permission)`. */
export function useCurrentUser() {
  const ctx = useContext(CurrentUserContext)
  if (!ctx) throw new Error('useCurrentUser must be used within CurrentUserProvider')
  return ctx
}
