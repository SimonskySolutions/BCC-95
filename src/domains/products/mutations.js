/**
 * Product mutations. Kept deliberately small: products are created almost
 * exclusively through the inquiry-first flow, so this module just owns id/SKU
 * generation and the insert/patch primitives.
 */

/**
 * Generate the next running SKU in the form `SKU-<YEAR>-<NNNN>` based on the
 * highest sequence number found on existing products for the current year.
 * Falls back to `SKU-<YEAR>-0001` when none exist yet.
 * @param {{ products: { sku: string }[] }} db
 * @returns {string}
 */
export function nextProductSku(db) {
  const year = new Date().getFullYear()
  const prefix = `SKU-${year}-`
  const seqs = db.products
    .map((p) => {
      const m = typeof p.sku === 'string' ? new RegExp(`^${prefix}(\\d+)$`).exec(p.sku) : null
      return m ? Number(m[1]) : 0
    })
    .filter((n) => Number.isFinite(n))
  const next = (seqs.length ? Math.max(...seqs) : 0) + 1
  return `${prefix}${String(next).padStart(4, '0')}`
}

function newProductId() {
  const rand = Math.random().toString(36).slice(2, 8)
  return `prod-${Date.now().toString(36)}-${rand}`
}

/**
 * @typedef {Object} ProductCreateInput
 * @property {string} name
 * @property {string} [description]
 * @property {string} [customerId]
 * @property {import('./model.js').ProductStatus} [status]
 * @property {import('./model.js').ProductType} [type]
 * @property {string} [uom]
 * @property {boolean} [canBePurchased]
 * @property {boolean} [canBeManufactured]
 * @property {boolean} [canBeSold]
 * @property {string} [lifecyclePhaseId]
 * @property {string} [sku]                — override the auto-generated SKU
 * @property {string} [id]                 — override the auto-generated id (tests only)
 */

/**
 * Append a new product to the DB and return the inserted record.
 * Defaults: `status='draft'`, `type='finished_good'`, `lifecyclePhaseId='concept'`, SKU auto-generated.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {ProductCreateInput} input
 * @returns {import('./model.js').Product}
 */
export function appendProduct(db, input) {
  const product = /** @type {import('./model.js').Product} */ ({
    id: input.id ?? newProductId(),
    sku: input.sku ?? nextProductSku(db),
    name: input.name,
    status: input.status ?? 'draft',
    type: input.type ?? 'finished_good',
    uom: input.uom ?? 'ea',
    canBePurchased: input.canBePurchased ?? false,
    canBeManufactured: input.canBeManufactured ?? true,
    canBeSold: input.canBeSold ?? true,
    lifecyclePhaseId: input.lifecyclePhaseId ?? 'concept',
    description: input.description,
    customerId: input.customerId,
  })
  db.products.push(product)
  return product
}

/**
 * Patch an existing product in place and return the updated record.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} productId
 * @param {Partial<import('./model.js').Product>} patch
 * @returns {import('./model.js').Product | undefined}
 */
export function patchProduct(db, productId, patch) {
  const idx = db.products.findIndex((p) => p.id === productId)
  if (idx < 0) return undefined
  db.products[idx] = { ...db.products[idx], ...patch }
  return db.products[idx]
}
