/**
 * Currency-aware money helpers. Keeps rounding consistent (2 dp) so line
 * totals and subtotals don't drift, and centralises display formatting.
 */

/** @param {number | string} n */
export function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}

/**
 * @param {number | string} n
 * @param {string} [currency]
 */
export function formatMoney(n, currency = 'EUR') {
  return `${round2(n).toFixed(2)} ${currency}`
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
