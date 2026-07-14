/** Stable thread key for a 1:1 conversation between two employees. */
export function dmThreadKey(a, b) {
  return `dm:${[a, b].sort().join('|')}`
}

/** Channel key for a product discussion. */
export function productThreadKey(productId) {
  return `product:${productId}`
}

/** Thread key for a named sub-channel (discussion) under a product. */
export function productSubThreadKey(productId, channelId) {
  return `product:${productId}:ch:${channelId}`
}
