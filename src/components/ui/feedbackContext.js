import { createContext, useContext } from 'react'

/** @type {import('react').Context<null | { toast: Function, confirm: Function }>} */
export const FeedbackContext = createContext(null)

/** Show a transient notification: `toast('Saved', { type: 'success' })`. */
export function useToast() {
  const ctx = useContext(FeedbackContext)
  if (!ctx) throw new Error('useToast must be used within FeedbackProvider')
  return ctx.toast
}

/** Styled replacement for window.confirm: `if (await confirm({ message, danger: true })) …`. */
export function useConfirm() {
  const ctx = useContext(FeedbackContext)
  if (!ctx) throw new Error('useConfirm must be used within FeedbackProvider')
  return ctx.confirm
}
