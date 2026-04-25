/**
 * @param {{ products: import('./model.js').Product[] }} db
 * @param {string} productId
 * @returns {import('./model.js').Product | undefined}
 */
export function selectProductById(db, productId) {
  return db.products.find((p) => p.id === productId)
}

/**
 * @param {{ products: import('./model.js').Product[] }} db
 * @param {import('./model.js').ProductStatus} [status]
 * @returns {import('./model.js').Product[]}
 */
export function selectProductsByStatus(db, status) {
  if (!status) return [...db.products]
  return db.products.filter((p) => p.status === status)
}
