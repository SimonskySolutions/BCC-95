/**
 * Tiny SAFE arithmetic evaluator for user-defined cost-method formulas.
 * Supports: numbers, + - * /, parentheses, unary +/-, and variables.
 * No eval / new Function — a hand-written recursive-descent parser. Unknown
 * variables resolve to 0; division by zero yields 0; any error yields 0.
 */

function tokenize(s) {
  const tokens = []
  const re = /\s*([0-9]*\.?[0-9]+|[A-Za-z_][A-Za-z0-9_]*|[+\-*/()])/g
  let m
  while ((m = re.exec(s))) {
    const tok = m[1]
    if (/^[0-9.]/.test(tok)) tokens.push({ t: 'num', n: parseFloat(tok) })
    else if (/^[A-Za-z_]/.test(tok)) tokens.push({ t: 'id', v: tok })
    else tokens.push({ t: 'op', v: tok })
  }
  return tokens
}

/**
 * @param {string} expr
 * @param {Record<string, number>} [vars]
 * @returns {number}
 */
export function evaluateFormula(expr, vars = {}) {
  if (!expr) return 0
  let tokens
  try {
    tokens = tokenize(String(expr))
  } catch {
    return 0
  }
  let pos = 0
  const peek = () => tokens[pos]
  const eat = () => tokens[pos++]

  function parseExpr() {
    let v = parseTerm()
    while (peek() && (peek().v === '+' || peek().v === '-')) {
      const op = eat().v
      const r = parseTerm()
      v = op === '+' ? v + r : v - r
    }
    return v
  }
  function parseTerm() {
    let v = parseFactor()
    while (peek() && (peek().v === '*' || peek().v === '/')) {
      const op = eat().v
      const r = parseFactor()
      v = op === '*' ? v * r : r === 0 ? 0 : v / r
    }
    return v
  }
  function parseFactor() {
    const tk = peek()
    if (!tk) return 0
    if (tk.v === '-') { eat(); return -parseFactor() }
    if (tk.v === '+') { eat(); return parseFactor() }
    if (tk.v === '(') { eat(); const v = parseExpr(); if (peek() && peek().v === ')') eat(); return v }
    if (tk.t === 'num') { eat(); return tk.n }
    if (tk.t === 'id') { eat(); const val = Number(vars[tk.v]); return Number.isFinite(val) ? val : 0 }
    eat()
    return 0
  }

  const result = parseExpr()
  return Number.isFinite(result) ? result : 0
}

/**
 * Validate a formula against the allowed variable names (its fields + context).
 * Returns an error string, or null if OK.
 * @param {string} expr
 * @param {string[]} fieldNames
 */
export function validateFormula(expr, fieldNames = []) {
  const text = String(expr ?? '').trim()
  if (!text) return 'empty'
  if (/[^0-9A-Za-z_+\-*/().\s]/.test(text)) return 'invalid_char'
  const allowed = new Set([...fieldNames, 'netKg', 'costBase'])
  for (const id of text.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? []) {
    if (!allowed.has(id)) return `unknown_var:${id}`
  }
  let depth = 0
  for (const ch of text) {
    if (ch === '(') depth++
    else if (ch === ')') depth--
    if (depth < 0) return 'parens'
  }
  return depth === 0 ? null : 'parens'
}
