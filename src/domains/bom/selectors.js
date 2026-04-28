/**
 * @param {{ bomHeaders: import('./model.js').BomHeader[] }} db
 * @param {string} productId
 * @returns {import('./model.js').BomHeader | undefined}
 */
export function selectActiveBomForProduct(db, productId) {
  return db.bomHeaders.find((b) => b.productId === productId && b.active)
}

/**
 * @param {{ bomLines: import('./model.js').BomLine[] }} db
 * @param {string} bomId
 * @returns {import('./model.js').BomLine[]}
 */
export function selectBomLines(db, bomId) {
  return db.bomLines.filter((l) => l.bomId === bomId).sort((a, b) => a.sequence - b.sequence)
}

/**
 * @param {{ bomOperations: import('./model.js').BomOperation[] }} db
 * @param {string} bomId
 * @returns {import('./model.js').BomOperation[]}
 */
export function selectBomOperations(db, bomId) {
  return db.bomOperations.filter((o) => o.bomId === bomId).sort((a, b) => a.sequence - b.sequence)
}

/**
 * Total cycle time (minutes) for one unit assuming no setup amortisation.
 * @param {{ bomOperations: import('./model.js').BomOperation[] }} db
 * @param {string} bomId
 * @returns {number}
 */
export function selectBomTotalCycleMinutes(db, bomId) {
  return selectBomOperations(db, bomId).reduce((sum, op) => sum + op.cycleMinutes, 0)
}
