/**
 * @param {{ qualityIncidents: { productId: string; failedFirstPass: boolean }[] }} db
 * @param {string} productId
 */
export function selectQualityIncidentsByProduct(db, productId) {
  return db.qualityIncidents.filter((q) => q.productId === productId)
}
