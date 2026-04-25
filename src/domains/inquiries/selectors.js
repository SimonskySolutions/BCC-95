/**
 * @param {{ inquiries: import('./model.js').Inquiry[] }} db
 * @param {string} inquiryId
 */
export function selectInquiryById(db, inquiryId) {
  return db.inquiries.find((i) => i.id === inquiryId)
}

/**
 * @param {{ inquiries: import('./model.js').Inquiry[] }} db
 * @param {string} productId
 */
export function selectInquiriesByProduct(db, productId) {
  return db.inquiries.filter((i) => i.productId === productId)
}

/**
 * @param {{ inquiries: import('./model.js').Inquiry[] }} db
 * @param {string} customerId
 */
export function selectInquiriesByCustomer(db, customerId) {
  return db.inquiries.filter((i) => i.customerId === customerId)
}

/**
 * @param {{ inquiries: import('./model.js').Inquiry[] }} db
 * @param {import('./model.js').InquiryStatus[]} statuses
 */
export function selectInquiriesByStatus(db, statuses) {
  const set = new Set(statuses)
  return db.inquiries.filter((i) => set.has(i.status))
}
