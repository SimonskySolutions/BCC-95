function newId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {Omit<import('./model.js').BomHeader, 'id'>} input
 * @returns {import('./model.js').BomHeader}
 */
export function appendBomHeader(db, input) {
  const header = /** @type {import('./model.js').BomHeader} */ ({ id: newId('bom'), ...input })
  db.bomHeaders.push(header)
  return header
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} bomId
 * @param {Partial<import('./model.js').BomHeader>} patch
 * @returns {import('./model.js').BomHeader | undefined}
 */
export function patchBomHeader(db, bomId, patch) {
  const idx = db.bomHeaders.findIndex((b) => b.id === bomId)
  if (idx < 0) return undefined
  db.bomHeaders[idx] = { ...db.bomHeaders[idx], ...patch }
  return db.bomHeaders[idx]
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {Omit<import('./model.js').BomLine, 'id'>} input
 * @returns {import('./model.js').BomLine}
 */
export function appendBomLine(db, input) {
  const line = /** @type {import('./model.js').BomLine} */ ({ id: newId('bl'), ...input })
  db.bomLines.push(line)
  return line
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} lineId
 * @param {Partial<import('./model.js').BomLine>} patch
 * @returns {import('./model.js').BomLine | undefined}
 */
export function patchBomLine(db, lineId, patch) {
  const idx = db.bomLines.findIndex((l) => l.id === lineId)
  if (idx < 0) return undefined
  db.bomLines[idx] = { ...db.bomLines[idx], ...patch }
  return db.bomLines[idx]
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} lineId
 */
export function removeBomLine(db, lineId) {
  const idx = db.bomLines.findIndex((l) => l.id === lineId)
  if (idx >= 0) db.bomLines.splice(idx, 1)
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {Omit<import('./model.js').BomOperation, 'id'>} input
 * @returns {import('./model.js').BomOperation}
 */
export function appendBomOperation(db, input) {
  const op = /** @type {import('./model.js').BomOperation} */ ({ id: newId('bop'), ...input })
  db.bomOperations.push(op)
  return op
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} opId
 * @param {Partial<import('./model.js').BomOperation>} patch
 * @returns {import('./model.js').BomOperation | undefined}
 */
export function patchBomOperation(db, opId, patch) {
  const idx = db.bomOperations.findIndex((o) => o.id === opId)
  if (idx < 0) return undefined
  db.bomOperations[idx] = { ...db.bomOperations[idx], ...patch }
  return db.bomOperations[idx]
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} opId
 */
export function removeBomOperation(db, opId) {
  const idx = db.bomOperations.findIndex((o) => o.id === opId)
  if (idx >= 0) db.bomOperations.splice(idx, 1)
}
