/**
 * Container-level keydown handler: pressing Enter in an input/select confirms
 * it and advances focus to the next field (selecting its contents for quick
 * overwrite), Excel-style. Textareas keep their normal newline behaviour.
 *
 * Attach to a wrapping element: `<div onKeyDown={advanceOnEnter}>…</div>`.
 *
 * @param {import('react').KeyboardEvent<HTMLElement>} e
 */
export function advanceOnEnter(e) {
  if (e.key !== 'Enter' || e.shiftKey) return
  const el = /** @type {HTMLElement} */ (e.target)
  if (el.tagName !== 'INPUT' && el.tagName !== 'SELECT') return
  e.preventDefault()
  const fields = Array.from(
    e.currentTarget.querySelectorAll('input:not([type="file"]), select'),
  ).filter((f) => !(/** @type {HTMLInputElement} */ (f)).disabled && (/** @type {HTMLElement} */ (f)).offsetParent !== null)
  const next = /** @type {HTMLElement & { select?: () => void }} */ (fields[fields.indexOf(el) + 1])
  if (next) {
    next.focus()
    if (next.tagName === 'INPUT' && typeof next.select === 'function') next.select()
  } else {
    el.blur()
  }
}
