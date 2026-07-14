import { createContext } from 'react'

/** @type {import('react').Context<null | {
 *   user: any, userId: string | null, setUserId: (id: string) => void,
 *   users: any[], can: (perm: string) => boolean
 * }>} */
export const CurrentUserContext = createContext(null)
