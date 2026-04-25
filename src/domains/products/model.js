/**
 * @typedef {'draft' | 'active' | 'archived'} ProductStatus
 */

/**
 * @typedef {Object} Product
 * @property {string} id
 * @property {string} sku
 * @property {string} name
 * @property {ProductStatus} status
 * @property {string} [description]
 * @property {string} lifecyclePhaseId — key into lifecycle phase catalog
 * @property {string} [customerId]     — owning CRM client; products are typically 1:1 with a customer
 */

/** @type {ProductStatus[]} */
export const PRODUCT_STATUSES = ['draft', 'active', 'archived']

/**
 * @param {unknown} value
 * @returns {value is ProductStatus}
 */
export function isProductStatus(value) {
  return typeof value === 'string' && PRODUCT_STATUSES.includes(/** @type {ProductStatus} */ (value))
}
