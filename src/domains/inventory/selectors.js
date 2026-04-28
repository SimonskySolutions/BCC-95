/**
 * @param {{ stockLocations: import('./model.js').StockLocation[] }} db
 * @param {string} locationId
 * @returns {import('./model.js').StockLocation | undefined}
 */
export function selectLocationById(db, locationId) {
  return db.stockLocations.find((l) => l.id === locationId)
}

/**
 * @param {{ stockLocations: import('./model.js').StockLocation[] }} db
 * @param {import('./model.js').LocationType} type
 * @returns {import('./model.js').StockLocation[]}
 */
export function selectLocationsByType(db, type) {
  return db.stockLocations.filter((l) => l.type === type)
}

/**
 * All quants for a given product across all locations.
 * @param {{ stockQuants: import('./model.js').StockQuant[] }} db
 * @param {string} productId
 * @returns {import('./model.js').StockQuant[]}
 */
export function selectQuantsByProduct(db, productId) {
  return db.stockQuants.filter((q) => q.productId === productId)
}

/**
 * All quants at a given location.
 * @param {{ stockQuants: import('./model.js').StockQuant[] }} db
 * @param {string} locationId
 * @returns {import('./model.js').StockQuant[]}
 */
export function selectQuantsByLocation(db, locationId) {
  return db.stockQuants.filter((q) => q.locationId === locationId)
}

/**
 * Total available quantity for a product (on-hand minus reserved), across all internal locations.
 * @param {{ stockQuants: import('./model.js').StockQuant[], stockLocations: import('./model.js').StockLocation[] }} db
 * @param {string} productId
 * @returns {number}
 */
export function selectAvailableQty(db, productId) {
  const internalIds = new Set(db.stockLocations.filter((l) => l.type === 'internal').map((l) => l.id))
  return db.stockQuants
    .filter((q) => q.productId === productId && internalIds.has(q.locationId))
    .reduce((sum, q) => sum + q.qty - q.reservedQty, 0)
}

/**
 * Recent stock moves, newest first.
 * @param {{ stockMoves: import('./model.js').StockMove[] }} db
 * @param {{ limit?: number; productId?: string }} [opts]
 * @returns {import('./model.js').StockMove[]}
 */
export function selectStockMoves(db, opts = {}) {
  let moves = [...db.stockMoves].sort((a, b) => b.date.localeCompare(a.date))
  if (opts.productId) moves = moves.filter((m) => m.productId === opts.productId)
  if (opts.limit) moves = moves.slice(0, opts.limit)
  return moves
}

/**
 * Aggregate on-hand summary per location (internal only).
 * Returns { locationId, productCount, totalQty } for each internal location.
 * @param {{ stockQuants: import('./model.js').StockQuant[], stockLocations: import('./model.js').StockLocation[] }} db
 * @returns {{ locationId: string; productCount: number; totalQty: number }[]}
 */
export function selectLocationSummaries(db) {
  const internalIds = db.stockLocations.filter((l) => l.type === 'internal').map((l) => l.id)
  return internalIds.map((locId) => {
    const quants = db.stockQuants.filter((q) => q.locationId === locId)
    return {
      locationId: locId,
      productCount: quants.length,
      totalQty: quants.reduce((s, q) => s + q.qty, 0),
    }
  })
}
