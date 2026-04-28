function newId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

/**
 * Apply a stock move: update or create quants at from/to locations and record the move.
 * Only applies moves in 'done' state; 'confirmed' moves are recorded but don't touch quants.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {Omit<import('./model.js').StockMove, 'id'>} input
 * @returns {import('./model.js').StockMove}
 */
export function applyStockMove(db, input) {
  const move = /** @type {import('./model.js').StockMove} */ ({ id: newId('sm'), ...input })
  db.stockMoves.push(move)

  if (move.state !== 'done') return move

  // Decrease quant at source (only for internal locations)
  const fromLoc = db.stockLocations.find((l) => l.id === move.fromLocationId)
  if (fromLoc?.type === 'internal') {
    const fromQuant = db.stockQuants.find(
      (q) => q.productId === move.productId && q.locationId === move.fromLocationId,
    )
    if (fromQuant) fromQuant.qty = Math.max(0, fromQuant.qty - move.qty)
  }

  // Increase quant at destination (only for internal locations)
  const toLoc = db.stockLocations.find((l) => l.id === move.toLocationId)
  if (toLoc?.type === 'internal') {
    const toQuant = db.stockQuants.find(
      (q) => q.productId === move.productId && q.locationId === move.toLocationId,
    )
    if (toQuant) {
      toQuant.qty += move.qty
      toQuant.lastUpdated = move.date
    } else {
      db.stockQuants.push({
        id: newId('sq'),
        productId: move.productId,
        locationId: move.toLocationId,
        qty: move.qty,
        reservedQty: 0,
        uom: move.uom,
        lastUpdated: move.date,
      })
    }
  }

  return move
}

/**
 * Manual inventory adjustment — creates a quant delta without a source document.
 * Positive delta = stock gain, negative = loss/write-off.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {{ productId: string; locationId: string; delta: number; uom: string; reason: string }} input
 */
export function applyInventoryAdjustment(db, input) {
  const { productId, locationId, delta, uom, reason } = input
  const date = new Date().toISOString().slice(0, 10)

  const quant = db.stockQuants.find((q) => q.productId === productId && q.locationId === locationId)
  if (quant) {
    quant.qty = Math.max(0, quant.qty + delta)
    quant.lastUpdated = date
  } else if (delta > 0) {
    db.stockQuants.push({
      id: newId('sq'),
      productId,
      locationId,
      qty: delta,
      reservedQty: 0,
      uom,
      lastUpdated: date,
    })
  }

  // Record as a virtual move for traceability
  const adjustLoc = delta >= 0 ? { from: 'loc-sup', to: locationId } : { from: locationId, to: 'loc-scrap' }
  db.stockMoves.push({
    id: newId('sm'),
    productId,
    fromLocationId: adjustLoc.from,
    toLocationId: adjustLoc.to,
    qty: Math.abs(delta),
    uom,
    state: 'done',
    origin: `ADJ: ${reason}`,
    date,
  })
}
