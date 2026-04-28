/**
 * Inventory domain — stock locations, on-hand quants, and movement log.
 *
 * The location hierarchy follows the standard ERP double-entry stock model:
 *   Supplier (virtual) → WH/RAW → WH/WIP → WH/FG → Customer (virtual)
 *
 * Every physical goods movement is represented as a StockMove (from/to pair).
 * StockQuants aggregate current on-hand quantities per product×location.
 */

/**
 * @typedef {'internal' | 'supplier' | 'customer' | 'virtual'} LocationType
 * @typedef {'raw_material' | 'wip' | 'finished_good' | 'general'} LocationUsage
 */

/**
 * @typedef {Object} StockLocation
 * @property {string}        id
 * @property {string}        name
 * @property {string}        code          — e.g. 'WH/RAW', 'VIRTUAL/SCRAP'
 * @property {LocationType}  type
 * @property {LocationUsage} [usage]       — meaningful for internal locations
 * @property {string}        [parentId]
 */

/**
 * Current on-hand balance for one product at one location.
 * @typedef {Object} StockQuant
 * @property {string} id
 * @property {string} productId
 * @property {string} locationId
 * @property {number} qty              — total on-hand
 * @property {number} reservedQty     — subset reserved by MO / SO
 * @property {string} uom
 * @property {string} lastUpdated
 */

/**
 * @typedef {'draft' | 'confirmed' | 'done' | 'cancelled'} StockMoveState
 */

/**
 * Immutable traceability record for a goods movement.
 * @typedef {Object} StockMove
 * @property {string}         id
 * @property {string}         productId
 * @property {string}         fromLocationId
 * @property {string}         toLocationId
 * @property {number}         qty
 * @property {string}         uom
 * @property {StockMoveState} state
 * @property {string}         origin     — PO-xxx / MO-xxx / SO-xxx reference
 * @property {string}         date
 */

/** @type {StockMoveState[]} */
export const STOCK_MOVE_STATES = ['draft', 'confirmed', 'done', 'cancelled']
