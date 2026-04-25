/**
 * @typedef {Object} Vendor
 * @property {string} id
 * @property {string} name
 * @property {string} category
 * @property {'preferred'|'active'|'on_hold'} status
 */

/**
 * @typedef {Object} Material
 * @property {string} id
 * @property {string} sku
 * @property {string} name
 * @property {string} uom
 */

/**
 * @typedef {Object} PurchaseOrder
 * @property {string} id
 * @property {string} vendorId
 * @property {string} orderedAt
 * @property {'draft'|'sent'|'partial'|'received'|'closed'} status
 */

/**
 * @typedef {Object} PurchaseOrderLine
 * @property {string} id
 * @property {string} purchaseOrderId
 * @property {string} materialId
 * @property {number} qty
 * @property {number} unitCost
 */

/**
 * @typedef {Object} GoodsReceipt
 * @property {string} id
 * @property {string} purchaseOrderId
 * @property {string} receivedAt
 * @property {string} [lineId]
 */

/**
 * @typedef {Object} VendorInvoice
 * @property {string} id
 * @property {string} vendorId
 * @property {string} purchaseOrderId
 * @property {number} amount
 * @property {string} issuedAt
 */

export {}
