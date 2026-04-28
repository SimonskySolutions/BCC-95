/**
 * @typedef {'draft' | 'active' | 'archived'} ProductStatus
 * @typedef {'raw_material' | 'semi_finished' | 'finished_good' | 'consumable' | 'service'} ProductType
 */

/**
 * @typedef {Object} Product
 * @property {string}        id
 * @property {string}        sku
 * @property {string}        name
 * @property {ProductStatus} status
 * @property {ProductType}   type
 * @property {string}        uom               — base unit of measure (ea, kg, m, l, …)
 * @property {boolean}       canBePurchased
 * @property {boolean}       canBeManufactured
 * @property {boolean}       canBeSold
 * @property {string}        [description]
 * @property {string}        [lifecyclePhaseId] — key into lifecycle phase catalog
 * @property {string}        [customerId]        — owning CRM client
 */

/** @type {ProductStatus[]} */
export const PRODUCT_STATUSES = ['draft', 'active', 'archived']

/** @type {ProductType[]} */
export const PRODUCT_TYPES = ['raw_material', 'semi_finished', 'finished_good', 'consumable', 'service']

/**
 * @param {unknown} value
 * @returns {value is ProductStatus}
 */
export function isProductStatus(value) {
  return typeof value === 'string' && PRODUCT_STATUSES.includes(/** @type {ProductStatus} */ (value))
}

/**
 * @param {unknown} value
 * @returns {value is ProductType}
 */
export function isProductType(value) {
  return typeof value === 'string' && PRODUCT_TYPES.includes(/** @type {ProductType} */ (value))
}
