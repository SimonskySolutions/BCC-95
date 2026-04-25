/**
 * @param {{ productPathLinks: import('./model.js').ProductPathLink[] }} db
 * @param {string} productId
 * @returns {import('./model.js').ProductPathLink | undefined}
 */
export function selectPathLinkByProduct(db, productId) {
  return db.productPathLinks.find((l) => l.productId === productId)
}

/**
 * @param {{ pathTemplates: import('./model.js').ManufacturingPathTemplate[] }} db
 * @param {string} templateId
 * @returns {import('./model.js').ManufacturingPathTemplate | undefined}
 */
export function selectPathTemplateById(db, templateId) {
  return db.pathTemplates.find((t) => t.id === templateId)
}
