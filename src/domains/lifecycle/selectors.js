/**
 * @param {{ productLifecycleStates: import('./model.js').ProductLifecycleState[] }} db
 * @param {string} productId
 * @returns {import('./model.js').ProductLifecycleState | undefined}
 */
export function selectLifecycleStateByProduct(db, productId) {
  return db.productLifecycleStates.find((s) => s.productId === productId)
}
