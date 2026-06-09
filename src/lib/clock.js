/**
 * Single source of "now" for the app. The mock dataset is anchored to a fixed
 * date so KPI windows, expiry banners and "days ago" math are deterministic.
 * Previously this date was duplicated as `new Date('2026-05-19')` across pages.
 */
export const APP_TODAY = new Date('2026-05-19')

/** @returns {Date} the app's current date */
export function today() {
  return APP_TODAY
}

/**
 * Whole days from `today()` to the given ISO date (negative = in the past).
 * @param {string | undefined | null} iso
 * @returns {number | null}
 */
export function daysUntil(iso) {
  if (!iso) return null
  return Math.round((new Date(iso) - APP_TODAY) / 86400000)
}

/**
 * Whole days from the given ISO date to `today()`.
 * @param {string | undefined | null} iso
 * @returns {number | null}
 */
export function daysAgo(iso) {
  if (!iso) return null
  return Math.round((APP_TODAY - new Date(iso)) / 86400000)
}
