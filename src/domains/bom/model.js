/**
 * Bill of Materials — models for BoM headers, component lines, and routing operations.
 *
 * A BoM of type 'manufacture' defines how to produce qtyPerBom units of a product from
 * its component materials and a sequence of workcenter operations (routing).
 * A 'kit' BoM assembles components at delivery without a work order.
 * A 'phantom' BoM is a sub-assembly expanded inline into its parent BoM.
 *
 * Components can reference any product type (raw_material, semi_finished, or even a
 * purchased finished_good), which lets a package BoM mix in-house and bought parts.
 */

/**
 * @typedef {'manufacture' | 'kit' | 'phantom'} BomType
 */

/**
 * BoM header — one per manufactured product (per active version).
 * @typedef {Object} BomHeader
 * @property {string}  id
 * @property {string}  productId       — the product being produced
 * @property {number}  qtyPerBom       — quantity produced per single BoM execution
 * @property {string}  uom             — unit of measure for qtyPerBom
 * @property {BomType} type
 * @property {number}  version         — incremented on structural changes
 * @property {boolean} active
 * @property {string}  [notes]
 */

/**
 * One component line within a BoM.
 * @typedef {Object} BomLine
 * @property {string} id
 * @property {string} bomId
 * @property {number} sequence
 * @property {string} componentId      — product id of the required component
 * @property {number} qty              — quantity per qtyPerBom units of parent
 * @property {string} uom
 * @property {string} [bomOperationId] — consumed at this routing step (optional)
 * @property {string} [fromStoreId]    — warehouse/store to pull this component from (old ERP: FromStoreID)
 * @property {number} [leadTimeDays]   — procurement or sub-production lead time in days (old ERP: DaysToProduce)
 * @property {string} [notes]
 */

/**
 * One routing step within a BoM (work order template).
 * @typedef {Object} BomOperation
 * @property {string}  id
 * @property {string}  bomId
 * @property {number}  sequence
 * @property {string}  name
 * @property {string}  [workcenterId]  — machine / workcenter id
 * @property {number}  setupMinutes    — fixed setup time per batch
 * @property {number}  cycleMinutes    — time per unit produced
 * @property {string}  [notes]
 */

/** @type {BomType[]} */
export const BOM_TYPES = ['manufacture', 'kit', 'phantom']
