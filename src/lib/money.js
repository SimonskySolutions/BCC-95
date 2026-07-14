/**
 * Currency-aware money helpers. Keeps rounding consistent (2 dp) so line
 * totals and subtotals don't drift, and centralises display formatting.
 */

/** @param {number | string} n */
export function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}

/**
 * Format an amount with space thousands separators and two decimals:
 * 67362 → "67 362.00". For displayed (non-editable) figures so large numbers
 * stay readable. Matches the offer document's grouping.
 * @param {number | string} n
 */
export function groupAmount(n) {
  const [int, dec] = round2(n).toFixed(2).split('.')
  const sign = int.startsWith('-') ? '-' : ''
  const digits = sign ? int.slice(1) : int
  return `${sign}${digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}.${dec}`
}

/**
 * @param {number | string} n
 * @param {string} [currency]
 */
export function formatMoney(n, currency = 'EUR') {
  return `${groupAmount(n)} ${currency}`
}

/**
 * Sum of qty × unitPrice for a set of lines, rounded to 2dp.
 * @param {{ qty?: number; quantity?: number; unitPrice: number }[]} lines
 */
export function sumLineTotals(lines) {
  return round2(
    lines.reduce((s, l) => s + (Number(l.qty ?? l.quantity) || 0) * (Number(l.unitPrice) || 0), 0),
  )
}
